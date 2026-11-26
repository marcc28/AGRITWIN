import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from datetime import date, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from db.schema import Base, Device, Field, GardenTask, Telemetry, User
from services.simulated_readings_service import (
    HISTORY_READINGS,
    IRRIGATION_CYCLE_HOURS,
    KEEP_READINGS_FOR,
    READING_INTERVAL,
    SIMULATED_BRAND,
    SOIL_DRY,
    SOIL_WET,
    SimulatedReadingsService,
    simulated_device_id,
    simulated_reading,
)
from services.task_service import TaskService

OWNER = UUID("5e1a0000-0000-4000-a000-000000000001")
# 12:07 UTC: the reading grid (every 10 minutes) ends at 12:00.
NOW = datetime(2026, 11, 26, 12, 7)
GRID_NOW = datetime(2026, 11, 26, 12, 0)


class Clock:
    """Clock the tests can move forward."""

    def __init__(self, now: datetime):
        self.now = now

    def __call__(self) -> datetime:
        return self.now


@pytest.fixture
async def session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(User(id=OWNER, username="tigre", email="tigre@example.com", password_hash="x"))
        db.add_all(
            [
                Field(id=1, user_id=OWNER, name="Empty garden", lon=1.5),
                Field(id=2, user_id=OWNER, name="Garden with a board", lon=1.5),
            ]
        )
        await db.flush()
        db.add(Device(id="esp32_real", field_id=2, brand="AgriTwin", serial_number="SN-1"))
        await db.commit()
        yield db
    await engine.dispose()


async def devices_of(db, field_id: int) -> list[Device]:
    return list((await db.scalars(select(Device).where(Device.field_id == field_id))).all())


async def reading_times(db, device_id: str) -> list[datetime]:
    result = await db.scalars(
        select(Telemetry.timestamp)
        .where(Telemetry.device_id == device_id)
        .order_by(Telemetry.timestamp)
    )
    return list(result.all())


# ---------------------------------------------------------------------------
# Simulated values
# ---------------------------------------------------------------------------


def test_simulated_device_id_is_one_per_garden():
    assert simulated_device_id(7) == "sim-field-7"
    assert simulated_device_id(7) != simulated_device_id(8)


def test_simulated_reading_is_repeatable():
    assert simulated_reading(1, NOW, 1.5) == simulated_reading(1, NOW, 1.5)


def test_simulated_reading_is_different_for_each_garden():
    assert simulated_reading(1, NOW, 1.5) != simulated_reading(2, NOW, 1.5)


def test_simulated_reading_values_are_realistic():
    start = datetime(2026, 11, 20)
    for step in range(0, 7 * 24 * 6):
        values = simulated_reading(3, start + READING_INTERVAL * step, 2.0)
        assert 10 <= values["air_temperature_c"] <= 26
        assert 30 <= values["air_humidity_percent"] <= 95
        assert 0 <= values["soil_moisture_percent"] <= 100
        assert 0 <= values["light_intensity_lux"] <= 62000


def test_simulated_reading_follows_the_day():
    night = simulated_reading(1, datetime(2026, 11, 26, 2, 0), 0)
    midday = simulated_reading(1, datetime(2026, 11, 26, 13, 0), 0)

    assert night["light_intensity_lux"] == 0
    assert midday["light_intensity_lux"] > 50000
    assert midday["air_temperature_c"] > night["air_temperature_c"]
    assert midday["air_humidity_percent"] < night["air_humidity_percent"]


def test_simulated_reading_uses_the_longitude_of_the_garden():
    # 12:00 UTC is midday in Greenwich but night at longitude 180 (00:00 solar time).
    greenwich = simulated_reading(1, datetime(2026, 11, 26, 12, 0), 0)
    far_east = simulated_reading(1, datetime(2026, 11, 26, 12, 0), 180)

    assert greenwich["light_intensity_lux"] > 0
    assert far_east["light_intensity_lux"] == 0


def test_simulated_soil_dries_and_is_watered_again():
    start = datetime(2026, 11, 20)
    soil = [
        simulated_reading(1, start + timedelta(hours=hour), 0)["soil_moisture_percent"]
        for hour in range(IRRIGATION_CYCLE_HOURS)
    ]
    # Over one irrigation cycle the soil goes from wet to dry.
    assert max(soil) > SOIL_WET - 2
    assert min(soil) < SOIL_DRY + 2


def test_simulated_reading_without_longitude():
    values = simulated_reading(1, NOW)
    assert set(values) == {
        "air_temperature_c",
        "air_humidity_percent",
        "soil_moisture_percent",
        "light_intensity_lux",
    }


# ---------------------------------------------------------------------------
# Create the simulated device
# ---------------------------------------------------------------------------


async def test_garden_without_devices_gets_one_simulated_device(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    device_id = await service.ensure_for_field(1)
    await session.commit()

    devices = await devices_of(session, 1)
    assert device_id == "sim-field-1"
    assert len(devices) == 1
    assert devices[0].id == "sim-field-1"
    assert devices[0].is_simulated is True
    assert devices[0].brand == SIMULATED_BRAND
    assert devices[0].serial_number is None


async def test_simulated_device_gets_a_history_of_readings(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    await service.ensure_for_field(1)
    await session.commit()

    times = await reading_times(session, "sim-field-1")
    assert len(times) == HISTORY_READINGS
    assert times[-1] == GRID_NOW
    assert times[0] == GRID_NOW - READING_INTERVAL * (HISTORY_READINGS - 1)
    # One reading every READING_INTERVAL, no gaps.
    assert all(b - a == READING_INTERVAL for a, b in zip(times, times[1:], strict=False))


async def test_stored_values_match_the_simulation(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    await service.ensure_for_field(1)
    await session.commit()

    reading = await session.scalar(
        select(Telemetry).where(
            Telemetry.device_id == "sim-field-1",
            Telemetry.timestamp == GRID_NOW,
        )
    )
    expected = simulated_reading(1, GRID_NOW, 1.5)
    assert float(reading.air_temperature_c) == expected["air_temperature_c"]
    assert float(reading.soil_moisture_percent) == expected["soil_moisture_percent"]


async def test_ensure_twice_does_not_duplicate_device_or_readings(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    await service.ensure_for_field(1)
    await session.commit()
    await service.ensure_for_field(1)
    await session.commit()

    assert len(await devices_of(session, 1)) == 1
    assert len(await reading_times(session, "sim-field-1")) == HISTORY_READINGS


async def test_ensure_tops_up_the_missing_readings(session):
    clock = Clock(NOW)
    service = SimulatedReadingsService(session, clock=clock)
    await service.ensure_for_field(1)
    await session.commit()

    clock.now = NOW + timedelta(minutes=30)
    await service.ensure_for_field(1)
    await session.commit()

    times = await reading_times(session, "sim-field-1")
    assert times[-1] == GRID_NOW + timedelta(minutes=30)
    assert len(times) == HISTORY_READINGS + 3
    assert len(set(times)) == len(times)


async def test_after_a_long_time_only_the_recent_history_is_added(session):
    clock = Clock(NOW)
    service = SimulatedReadingsService(session, clock=clock)
    await service.ensure_for_field(1)
    await session.commit()

    # One month later: the old readings are deleted and only the last
    # HISTORY_READINGS are added, not a month of readings.
    clock.now = NOW + timedelta(days=30)
    await service.ensure_for_field(1)
    await session.commit()

    times = await reading_times(session, "sim-field-1")
    assert len(times) == HISTORY_READINGS
    assert times[0] >= clock.now - KEEP_READINGS_FOR


async def test_old_simulated_readings_are_deleted(session):
    clock = Clock(NOW)
    service = SimulatedReadingsService(session, clock=clock)
    await service.ensure_for_field(1)
    session.add(
        Telemetry(
            device_id="sim-field-1", timestamp=NOW - timedelta(days=10), soil_moisture_percent=1
        )
    )
    await session.commit()

    await service.ensure_for_field(1)
    await session.commit()

    times = await reading_times(session, "sim-field-1")
    assert min(times) >= GRID_NOW - KEEP_READINGS_FOR


async def test_garden_with_a_real_device_never_gets_a_simulated_one(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    result = await service.ensure_for_field(2)
    await session.commit()

    devices = await devices_of(session, 2)
    assert result is None
    assert [device.id for device in devices] == ["esp32_real"]
    assert await reading_times(session, "sim-field-2") == []


async def test_missing_garden_gets_nothing(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    assert await service.ensure_for_field(999) is None
    assert await session.scalar(select(func.count()).select_from(Device)) == 1


async def test_device_created_by_another_request_is_reused(session):
    # Another request created the simulated device a moment ago, without readings.
    session.add(Device(id="sim-field-1", field_id=1, is_simulated=True))
    await session.commit()
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    await service.ensure_for_field(1)
    await session.commit()

    assert len(await devices_of(session, 1)) == 1
    assert len(await reading_times(session, "sim-field-1")) == HISTORY_READINGS


async def test_insert_conflict_on_the_simulated_device_is_ignored(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    session.add(Device(id="sim-field-1", field_id=1, is_simulated=True))
    await session.commit()

    # Calling the private step directly simulates the race: the insert fails
    # with a duplicate key and must not break the request.
    await service._create_device(1, "sim-field-1")
    await session.commit()

    assert len(await devices_of(session, 1)) == 1


# ---------------------------------------------------------------------------
# Remove the simulated device
# ---------------------------------------------------------------------------


async def test_remove_deletes_the_simulated_device_and_its_readings(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    await service.ensure_for_field(1)
    await session.commit()

    removed = await service.remove_for_field(1)
    await session.commit()

    assert removed == 1
    assert await devices_of(session, 1) == []
    assert await reading_times(session, "sim-field-1") == []


async def test_remove_keeps_the_real_device_and_its_readings(session):
    session.add(Telemetry(device_id="esp32_real", timestamp=NOW, soil_moisture_percent=40))
    await session.commit()
    service = SimulatedReadingsService(session, clock=Clock(NOW))

    removed = await service.remove_for_field(2)
    await session.commit()

    assert removed == 0
    assert [device.id for device in await devices_of(session, 2)] == ["esp32_real"]
    assert await reading_times(session, "esp32_real") == [NOW]


async def test_first_real_device_replaces_the_simulated_data(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    await service.ensure_for_field(1)
    await session.commit()

    # Same steps as POST /fields/{id}/devices: insert the real device, then
    # remove the simulated one, in the same transaction.
    session.add(Device(id="esp32_new", field_id=1, brand="AgriTwin", serial_number="SN-2"))
    await service.remove_for_field(1)
    await session.commit()

    devices = await devices_of(session, 1)
    assert [device.id for device in devices] == ["esp32_new"]
    assert devices[0].is_simulated is False
    assert await reading_times(session, "sim-field-1") == []

    # From now on the garden never gets simulated data again.
    assert await service.ensure_for_field(1) is None
    assert [device.id for device in await devices_of(session, 1)] == ["esp32_new"]


async def test_remove_does_not_touch_other_gardens(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    session.add(Field(id=3, user_id=OWNER, name="Another empty garden"))
    await session.commit()
    await service.ensure_for_field(1)
    await service.ensure_for_field(3)
    await session.commit()

    await service.remove_for_field(1)
    await session.commit()

    assert await devices_of(session, 1) == []
    assert [device.id for device in await devices_of(session, 3)] == ["sim-field-3"]
    assert len(await reading_times(session, "sim-field-3")) == HISTORY_READINGS


# ---------------------------------------------------------------------------
# AI: it reads the simulated data, and its work is removed with them
# ---------------------------------------------------------------------------


async def test_ai_reads_the_simulated_readings(session):
    # A new user can try the AI before buying a board.
    await SimulatedReadingsService(session, clock=Clock(NOW)).ensure_for_field(1)
    await session.commit()
    tasks = TaskService(session)

    assert await tasks._has_sensors(1) is True
    assert (await tasks._sensors(1))["devices"] == 1


def ai_task(field_id: int, title: str, **values) -> GardenTask:
    return GardenTask(
        field_id=field_id,
        title=title,
        source=values.pop("source", "ai"),
        kind=values.pop("kind", "task"),
        due_on=date(2026, 11, 26),
        **values,
    )


async def test_first_real_device_removes_the_pending_ai_work(session):
    service = SimulatedReadingsService(session, clock=Clock(NOW))
    await service.ensure_for_field(1)
    session.add_all(
        [
            ai_task(1, "Water the garden", signature="water"),
            ai_task(1, "Frost tonight", kind="recommendation", signature="frost"),
            ai_task(1, "Seen notice", kind="recommendation", signature="seen", seen_at=NOW),
            ai_task(1, "Done by the AI", signature="done", completed_at=NOW),
            ai_task(1, "My own task", source="user"),
            ai_task(2, "Task of another garden", signature="other"),
        ]
    )
    field = await session.get(Field, 1)
    field.ai_checked_at = NOW
    await session.commit()

    await service.remove_for_field(1)
    await session.commit()

    titles = set((await session.scalars(select(GardenTask.title))).all())
    # Kept: finished AI task (history), the user's task, other gardens.
    assert titles == {"Done by the AI", "My own task", "Task of another garden"}
    # The AI reviews the garden again with the real device.
    await session.refresh(field)
    assert field.ai_checked_at is None


async def test_real_garden_keeps_its_ai_work_when_a_second_board_is_added(session):
    session.add(ai_task(2, "Water the garden", signature="water"))
    field = await session.get(Field, 2)
    field.ai_checked_at = NOW
    await session.commit()

    removed = await SimulatedReadingsService(session, clock=Clock(NOW)).remove_for_field(2)
    await session.commit()

    assert removed == 0
    assert (await session.scalars(select(GardenTask.title))).all() == ["Water the garden"]
    await session.refresh(field)
    assert field.ai_checked_at == NOW