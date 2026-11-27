"""
Simulated readings for gardens without a real device (#286).

A garden with no device gets ONE simulated device (devices.is_simulated = TRUE)
and its readings are stored in the normal telemetry table, so the dashboard
works the same way with simulated and real data.

Rules:
    * a garden with no device  -> one simulated device and its readings;
    * a garden with a real device never gets a simulated one;
    * the first real device registered in the garden deletes the simulated
      device and all its readings, so real and simulated data are never mixed;
    * it also deletes the pending AI tasks and notices of the garden, because
      the AI made them from simulated readings, and asks for a new AI review.

The AI reads the simulated readings like real ones: a new user can try the
whole app, AI included, before buying a board.

The readings are not written by a background job (the backend can sleep on
Render). Every time a garden is opened, the missing readings since the last
one are added ("top up"), up to HISTORY_READINGS points.

The values follow a daily cycle (temperature, humidity and light) and an
irrigation cycle (soil moisture), with a small deterministic noise. The same
garden and time always give the same reading, which makes the tests simple.
"""

import hashlib
import math
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import Device, Field, GardenTask, Telemetry

SIMULATED_DEVICE_PREFIX = "sim-field-"
SIMULATED_BRAND = "AgriTwin Simulator"

# One reading every 10 minutes, the last 8 hours are kept on screen.
READING_INTERVAL = timedelta(minutes=10)
HISTORY_READINGS = 48
# Older simulated readings are deleted so the table does not grow forever.
KEEP_READINGS_FOR = timedelta(days=2)

# Soil moisture goes from SOIL_WET to SOIL_DRY and is "watered" again
# every IRRIGATION_CYCLE_HOURS.
IRRIGATION_CYCLE_HOURS = 72
SOIL_WET = 70.0
SOIL_DRY = 35.0


def simulated_device_id(field_id: int) -> str:
    """Id of the simulated device of a garden. One per garden."""
    return f"{SIMULATED_DEVICE_PREFIX}{field_id}"


def _utc_now() -> datetime:
    # The telemetry table stores naive UTC timestamps (same as MQTT).
    return datetime.now(UTC).replace(tzinfo=None)


def _floor_to_interval(moment: datetime) -> datetime:
    """Rounds a time down to the reading grid (every READING_INTERVAL)."""
    step = int(READING_INTERVAL.total_seconds())
    epoch = datetime(1970, 1, 1)
    seconds = int((moment - epoch).total_seconds())
    return epoch + timedelta(seconds=seconds - seconds % step)


def _noise(field_id: int, moment: datetime, sensor: str) -> float:
    """
    Deterministic value between -1 and 1 for one garden, time and sensor.
    A hash is used instead of 'random' because the value must be repeatable
    (and it is not used for anything related to security).
    """
    key = f"{field_id}:{moment.isoformat()}:{sensor}".encode()
    number = int.from_bytes(hashlib.sha256(key).digest()[:4], "big")
    return number / 0xFFFFFFFF * 2 - 1


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def simulated_reading(field_id: int, moment: datetime, lon: float | None = None) -> dict:
    """
    Returns the simulated sensor values of a garden at a given UTC time.

    'lon' moves the daily cycle to the local solar time of the garden
    (15 degrees of longitude = 1 hour), so midday is sunny everywhere.
    """
    solar_hour = (moment.hour + moment.minute / 60 + (lon or 0.0) / 15) % 24

    # Temperature: coldest around 03:00, warmest around 15:00.
    daily = math.sin(2 * math.pi * (solar_hour - 9) / 24)
    temperature = 18 + 6 * daily + 0.3 * _noise(field_id, moment, "temp")

    # Air humidity: the opposite of the temperature.
    humidity = _clamp(65 - 15 * daily + 1.0 * _noise(field_id, moment, "hum"), 30, 95)

    # Light: only between 06:00 and 20:00, maximum at 13:00.
    if 6 <= solar_hour <= 20:
        sun = math.sin(math.pi * (solar_hour - 6) / 14)
        light = max(0.0, 60000 * sun * (1 + 0.03 * _noise(field_id, moment, "light")))
    else:
        light = 0.0

    # Soil moisture: dries slowly and is watered every IRRIGATION_CYCLE_HOURS.
    # Every garden starts the cycle at a different hour.
    hours = (moment - datetime(1970, 1, 1)).total_seconds() / 3600 + field_id * 7
    progress = (hours % IRRIGATION_CYCLE_HOURS) / IRRIGATION_CYCLE_HOURS
    soil = SOIL_WET - (SOIL_WET - SOIL_DRY) * progress
    soil = _clamp(soil + 0.5 * _noise(field_id, moment, "soil"), 0, 100)

    return {
        "air_temperature_c": round(temperature, 2),
        "air_humidity_percent": round(humidity, 2),
        "soil_moisture_percent": round(soil, 2),
        "light_intensity_lux": round(light, 2),
    }


class SimulatedReadingsService:
    """Creates, tops up and removes the simulated device of a garden.

    The methods never commit: the caller decides when the transaction ends,
    so registering a real device and removing the simulated one is atomic.
    """

    def __init__(self, session: AsyncSession, clock=_utc_now):
        self._db = session
        # Injectable clock so the tests control "now"
        self._clock = clock

    async def ensure_for_field(self, field_id: int) -> str | None:
        """
        Makes sure a garden without real devices has a simulated device with
        up-to-date readings.

        Returns the simulated device id, or None when the garden has a real
        device (or does not exist).
        """
        field = await self._db.get(Field, field_id)
        if field is None:
            return None

        devices = (
            await self._db.execute(
                select(Device.id, Device.is_simulated).where(Device.field_id == field_id)
            )
        ).all()

        if any(not device.is_simulated for device in devices):
            # Real data wins: a garden with a real device never uses simulated data.
            return None

        device_id = simulated_device_id(field_id)
        if not devices:
            await self._create_device(field_id, device_id)

        await self._top_up_readings(field_id, device_id, field.lon)
        return device_id

    async def remove_for_field(self, field_id: int) -> int:
        """
        Deletes the simulated device of a garden and all its readings, and the
        pending AI tasks and notices made from them.
        Returns the number of simulated devices deleted (0 or 1).
        """
        simulated_ids = (
            await self._db.scalars(
                select(Device.id).where(
                    Device.field_id == field_id,
                    Device.is_simulated.is_(True),
                )
            )
        ).all()
        if not simulated_ids:
            return 0

        # The readings are deleted explicitly: the database may not apply the
        # ON DELETE CASCADE of the foreign key (for example SQLite in the tests).
        await self._db.execute(delete(Telemetry).where(Telemetry.device_id.in_(simulated_ids)))
        await self._db.execute(delete(Device).where(Device.id.in_(simulated_ids)))
        await self._remove_ai_tasks(field_id)
        return len(simulated_ids)

    async def _remove_ai_tasks(self, field_id: int) -> None:
        """
        Deletes what the AI made from the simulated readings and not finished:
        pending AI tasks and AI notices. Kept: tasks of the user, AI tasks the
        user edited (they become 'user' tasks) and finished tasks (history).
        """
        await self._db.execute(
            delete(GardenTask).where(
                GardenTask.field_id == field_id,
                GardenTask.source == "ai",
                GardenTask.completed_at.is_(None),
            )
        )
        # The AI reviews the garden again, now with the real device, the next
        # time the calendar is opened (or at the next cron run).
        await self._db.execute(update(Field).where(Field.id == field_id).values(ai_checked_at=None))

    async def _create_device(self, field_id: int, device_id: str) -> None:
        try:
            # Savepoint: if another request created the device at the same
            # time, only this insert is undone and the reading continues.
            async with self._db.begin_nested():
                self._db.add(
                    Device(
                        id=device_id,
                        field_id=field_id,
                        brand=SIMULATED_BRAND,
                        battery_status=False,
                        is_simulated=True,
                    )
                )
        except IntegrityError:
            pass

    async def _top_up_readings(self, field_id: int, device_id: str, lon: float | None) -> None:
        now = _floor_to_interval(self._clock())
        first_needed = now - READING_INTERVAL * (HISTORY_READINGS - 1)

        last = await self._db.scalar(
            select(func.max(Telemetry.timestamp)).where(Telemetry.device_id == device_id)
        )
        start = first_needed if last is None else max(first_needed, last + READING_INTERVAL)

        # Every reading is on the grid, so the next one starts on the grid too.
        moment = _floor_to_interval(start)
        if moment < start:
            moment += READING_INTERVAL

        readings = []
        while moment <= now:
            values = simulated_reading(field_id, moment, lon)
            readings.append(
                Telemetry(
                    device_id=device_id,
                    timestamp=moment,
                    **{name: Decimal(str(value)) for name, value in values.items()},
                )
            )
            moment += READING_INTERVAL

        if readings:
            self._db.add_all(readings)

        await self._db.execute(
            delete(Telemetry).where(
                Telemetry.device_id == device_id,
                Telemetry.timestamp < now - KEEP_READINGS_FOR,
            )
        )
        await self._db.flush()
