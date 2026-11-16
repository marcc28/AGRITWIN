"""Store garden tasks and refresh them without blocking the screen."""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import delete, exists, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import FunctionElement
from sqlalchemy.types import DateTime as DateTimeType

from db.schema import (
    Crop,
    Device,
    Field,
    FieldCrop,
    GardenTask,
    Telemetry,
    UserProfile,
)
from services.field_weather_service import FieldWeatherService
from services.gemini_tasks import (
    EXPIRE_DAYS,
    STALE_HOURS,
    AiPlan,
    PlannedRecommendation,
    StoredTask,
    apply_plan,
    ask_gemini,
    normalize_language,
    parse_plan,
)

logger = logging.getLogger(__name__)

MADRID = ZoneInfo("Europe/Madrid")
# Do not ask Gemini again for one garden sooner than this after an attempt.
RETRY_MINUTES = 30
# The scheduled review (08:00 and 20:00) skips a garden reviewed less than this
# long ago. It is shorter than STALE_HOURS so the two daily runs never skip
# each other, but long enough to ignore the duplicate trigger of the same hour.
CRON_STALE_HOURS = 6
READINGS_DAYS = 3
PLANNED_DAYS = 7
LIST_DAYS = 90
ACTIVE_CROP_STATUSES = ("planned", "planted")


class _HourBucket(FunctionElement):
    """Cut a timestamp to the start of its hour, in PostgreSQL and SQLite."""

    type = DateTimeType()
    name = "hour_bucket"
    inherit_cache = True


@compiles(_HourBucket)
def _hour_bucket_postgresql(element, compiler, **kwargs):
    return f"date_trunc('hour', {compiler.process(element.clauses, **kwargs)})"


@compiles(_HourBucket, "sqlite")
def _hour_bucket_sqlite(element, compiler, **kwargs):
    return f"strftime('%Y-%m-%d %H:00:00', {compiler.process(element.clauses, **kwargs)})"


def madrid_today() -> date:
    return datetime.now(MADRID).date()


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _number(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _iso(value) -> str | None:
    return value.isoformat() if value is not None else None


def _task_row(task: GardenTask) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "details": task.details,
        "due_on": task.due_on,
        "source": task.source,
        "priority": task.priority or "medium",
        "completion_reason": task.completion_reason,
        "completed": task.completed_at is not None,
        "can_delete": _can_delete(task),
        "created_at": task.created_at,
    }


def _can_delete(task: GardenTask) -> bool:
    """Only a task the user wrote can go. The AI would bring back its own."""
    return task.source == "user" and task.signature is None


def _recommendation_row(item: GardenTask) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "details": item.details,
        "due_on": item.due_on,
        "signature": item.signature,
    }


def _has_location(field: Field) -> bool:
    has_point = field.lat is not None and field.lon is not None
    return has_point or bool((field.location or "").strip())


class TaskService:
    def __init__(self, session: AsyncSession):
        self._db = session

    # ------------------------------------------------------------------
    # What the screen reads and writes
    # ------------------------------------------------------------------

    async def list_tasks(self, user_id: UUID, field_id: int) -> dict | None:
        field = await self._owned_field(user_id, field_id)
        if field is None:
            return None
        today = madrid_today()
        has_sensors = await self._has_sensors(field_id)
        refresh = await self._needs_refresh(field, has_sensors)

        tasks = await self._db.scalars(
            select(GardenTask)
            .where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "task",
                GardenTask.due_on >= today - timedelta(days=LIST_DAYS),
                GardenTask.due_on <= today + timedelta(days=LIST_DAYS),
            )
            .order_by(GardenTask.due_on, GardenTask.id)
        )
        recommendations = await self._db.scalars(
            select(GardenTask)
            .where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "recommendation",
                GardenTask.seen_at.is_(None),
                GardenTask.due_on >= today - timedelta(days=EXPIRE_DAYS),
            )
            .order_by(GardenTask.due_on, GardenTask.id)
        )
        return {
            "today": today,
            "has_sensors": has_sensors,
            "refresh": refresh,
            "tasks": [_task_row(task) for task in tasks.all()],
            "recommendations": [_recommendation_row(item) for item in recommendations.all()],
        }

    async def create_task(
        self,
        user_id: UUID,
        field_id: int,
        title: str,
        due_on: date,
        priority: str,
        details: str | None = None,
    ) -> dict | None:
        if await self._owned_field(user_id, field_id) is None:
            return None
        task = GardenTask(
            field_id=field_id,
            kind="task",
            title=title.strip()[:200],
            details=(details or "").strip()[:500] or None,
            due_on=due_on,
            source="user",
            priority=priority,
        )
        self._db.add(task)
        await self._db.commit()
        await self._db.refresh(task)
        return _task_row(task)

    async def update_task(
        self,
        user_id: UUID,
        field_id: int,
        task_id: int,
        changes: dict,
    ) -> dict | None:
        """Change a task: mark it done or pending, or edit what it says.

        Editing a task made by the AI makes it the user's: from then on the AI
        does not change it, move it or delete it.
        """
        if await self._owned_field(user_id, field_id) is None:
            return None
        task = await self._task(field_id, task_id)
        if task is None:
            return None

        edited = False
        for name in ("title", "details", "priority", "due_on"):
            if name not in changes:
                continue
            value = changes[name]
            if name == "title":
                value = value.strip()[:200]
            elif name == "details":
                value = (value or "").strip()[:500] or None
            if getattr(task, name) != value:
                setattr(task, name, value)
                edited = True
        if edited and task.source == "ai":
            task.source = "user"
        if "completed" in changes:
            task.completed_at = _now() if changes["completed"] else None
            task.completion_reason = None
        await self._db.commit()
        return _task_row(task)

    async def delete_task(self, user_id: UUID, field_id: int, task_id: int) -> bool | None:
        """True when deleted, False when the task cannot be deleted, None if not found."""
        if await self._owned_field(user_id, field_id) is None:
            return None
        task = await self._task(field_id, task_id)
        if task is None:
            return None
        if not _can_delete(task):
            return False
        await self._db.delete(task)
        await self._db.commit()
        return True

    async def dismiss_recommendation(
        self,
        user_id: UUID,
        field_id: int,
        recommendation_id: int,
    ) -> bool:
        if await self._owned_field(user_id, field_id) is None:
            return False
        item = await self._recommendation(field_id, recommendation_id)
        if item is None:
            return False
        item.seen_at = _now()
        await self._db.commit()
        return True

    async def convert_recommendation(
        self,
        user_id: UUID,
        field_id: int,
        recommendation_id: int,
    ) -> dict | None:
        if await self._owned_field(user_id, field_id) is None:
            return None
        item = await self._db.scalar(
            select(GardenTask).where(
                GardenTask.id == recommendation_id,
                GardenTask.field_id == field_id,
                GardenTask.source == "ai",
            )
        )
        if item is None:
            return None
        if item.kind == "task":
            # Already turned into a task, for instance by a second tap.
            return {"ok": True}

        if await self._ai_task_exists(field_id, item.signature, item.due_on):
            # The same task is already there: it covers this notice.
            item.seen_at = _now()
        else:
            item.kind = "task"
        try:
            await self._db.commit()
        except IntegrityError:
            # The same task appeared meanwhile: it already covers this notice.
            await self._db.rollback()
            item = await self._recommendation(field_id, recommendation_id)
            if item is not None:
                item.seen_at = _now()
                await self._db.commit()
        return {"ok": True}

    # ------------------------------------------------------------------
    # AI review
    # ------------------------------------------------------------------

    async def fields_to_review(self) -> list[tuple[int, str]]:
        """Gardens with something to read: a location, sensors or crops."""
        has_location = or_(
            (Field.lat.is_not(None)) & (Field.lon.is_not(None)),
            func.coalesce(func.trim(Field.location), "") != "",
        )
        has_devices = exists().where(Device.field_id == Field.id)
        has_crops = exists().where(
            FieldCrop.field_id == Field.id,
            FieldCrop.status.in_(ACTIVE_CROP_STATUSES),
        )
        result = await self._db.execute(
            select(Field.id, UserProfile.language)
            .join(UserProfile, UserProfile.id == Field.user_id, isouter=True)
            .where(or_(has_location, has_devices, has_crops))
            .order_by(Field.id)
        )
        gardens = [(row.id, normalize_language(row.language)) for row in result.all()]
        # Free the connection: the caller may take minutes to review them all.
        await self._db.rollback()
        return gardens

    async def refresh_field(
        self, field_id: int, language: str, stale_hours: int = STALE_HOURS
    ) -> bool:
        """Ask Gemini about one garden and store the answer.

        Returns True when the garden was reviewed. A failure is logged and
        never raised, so one garden cannot stop the others.
        """
        field = await self._db.get(Field, field_id)
        if field is None:
            return False
        language = normalize_language(language)
        has_sensors = await self._has_sensors(field_id)
        crops = await self._crops(field_id)
        if not (has_sensors or crops or _has_location(field)):
            return False
        if not await self._claim(field_id, stale_hours):
            return False

        today = madrid_today()
        try:
            snapshot = {
                "today": today.isoformat(),
                "can_create_tasks": has_sensors,
                "field": {
                    "name": field.name,
                    "field_type": field.field_type,
                    "soil_type": field.soil_type,
                    "size_m2": _number(field.size_m2),
                },
                "sensors": await self._sensors(field_id),
                "readings": await self._readings(field_id) if has_sensors else [],
                "forecast": await self._forecast(field_id, language),
                "crops": _crops_snapshot(crops, today),
                "planned_tasks": await self._planned_tasks(field_id, today),
            }
            raw = await ask_gemini(snapshot, language)
            plan = parse_plan(raw, today, allow_tasks=has_sensors)
        except Exception:
            logger.warning("Task review failed for field %s", field_id, exc_info=True)
            await self._db.rollback()
            await self._release(field_id)
            return False

        try:
            await self._store(field_id, today, plan)
        except Exception:
            logger.warning("Could not store the tasks of field %s", field_id, exc_info=True)
            await self._db.rollback()
            await self._release(field_id)
            return False
        return True

    async def _needs_refresh(self, field: Field, has_sensors: bool) -> bool:
        if not has_sensors and not _has_location(field) and not await self._crops(field.id):
            return False
        checked = field.ai_checked_at
        return checked is None or checked < _now() - timedelta(hours=STALE_HOURS)

    async def _claim(self, field_id: int, stale_hours: int = STALE_HOURS) -> bool:
        """Reserve the garden so two reviews never run at the same time.

        The garden is marked as if it had been reviewed `stale_hours` minus
        RETRY_MINUTES ago, so it is free again after RETRY_MINUTES unless the
        review ends well and marks it as reviewed now.
        """
        stale_before = _now() - timedelta(hours=stale_hours)
        result = await self._db.execute(
            update(Field)
            .where(
                Field.id == field_id,
                or_(Field.ai_checked_at.is_(None), Field.ai_checked_at < stale_before),
            )
            .values(ai_checked_at=stale_before + timedelta(minutes=RETRY_MINUTES))
        )
        if result.rowcount == 1:
            await self._db.commit()
            return True
        await self._db.rollback()
        return False

    async def _release(self, field_id: int) -> None:
        """After a failure, let any caller try again after RETRY_MINUTES."""
        retry_at = _now() - timedelta(hours=STALE_HOURS) + timedelta(minutes=RETRY_MINUTES)
        try:
            await self._db.execute(
                update(Field).where(Field.id == field_id).values(ai_checked_at=retry_at)
            )
            await self._db.commit()
        except Exception:
            logger.warning("Could not free field %s after a failure", field_id, exc_info=True)
            await self._db.rollback()

    async def _store(self, field_id: int, today: date, plan: AiPlan) -> None:
        existing = await self._stored_tasks(field_id)
        change = apply_plan(today, existing, plan)
        now = _now()

        if change.delete_ids:
            await self._db.execute(
                delete(GardenTask).where(
                    GardenTask.field_id == field_id,
                    GardenTask.id.in_(change.delete_ids),
                )
            )
        for task_id, reason in change.complete:
            await self._db.execute(
                update(GardenTask)
                .where(GardenTask.id == task_id, GardenTask.field_id == field_id)
                .values(completed_at=now, completion_reason=reason)
            )
        for task_id, item in change.update:
            await self._db.execute(
                update(GardenTask)
                .where(
                    GardenTask.id == task_id,
                    GardenTask.field_id == field_id,
                    GardenTask.completed_at.is_(None),
                )
                .values(title=item.title, details=item.details, priority=item.priority)
            )
        for item in change.insert:
            self._db.add(
                GardenTask(
                    field_id=field_id,
                    title=item.title,
                    details=item.details,
                    due_on=item.due_on,
                    source="ai",
                    signature=item.key,
                    priority=item.priority,
                )
            )
        for recommendation in plan.recommendations:
            await self._save_recommendation(field_id, recommendation)
        await self._db.execute(
            delete(GardenTask).where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "recommendation",
                GardenTask.due_on < today - timedelta(days=EXPIRE_DAYS),
            )
        )
        await self._db.execute(update(Field).where(Field.id == field_id).values(ai_checked_at=now))
        await self._db.commit()

    async def _save_recommendation(self, field_id: int, item: PlannedRecommendation) -> None:
        row = await self._db.scalar(
            select(GardenTask).where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "recommendation",
                GardenTask.signature == item.key,
                GardenTask.due_on == item.due_on,
            )
        )
        if row is None:
            # A notice already turned into a task must not come back.
            if not await self._ai_task_exists(field_id, item.key, item.due_on):
                self._db.add(
                    GardenTask(
                        field_id=field_id,
                        kind="recommendation",
                        title=item.title,
                        details=item.details,
                        due_on=item.due_on,
                        source="ai",
                        signature=item.key,
                    )
                )
        elif row.seen_at is None:
            row.title = item.title
            row.details = item.details

    # ------------------------------------------------------------------
    # What Gemini receives
    # ------------------------------------------------------------------

    async def _stored_tasks(self, field_id: int) -> list[StoredTask]:
        result = await self._db.execute(
            select(
                GardenTask.id,
                GardenTask.signature,
                GardenTask.due_on,
                GardenTask.completed_at,
                GardenTask.source,
            ).where(GardenTask.field_id == field_id, GardenTask.kind == "task")
        )
        return [
            StoredTask(
                row.id,
                row.signature,
                row.due_on,
                row.completed_at is not None,
                row.source,
            )
            for row in result.all()
        ]

    async def _planned_tasks(self, field_id: int, today: date) -> list[dict]:
        result = await self._db.scalars(
            select(GardenTask)
            .where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "task",
                GardenTask.due_on >= today - timedelta(days=PLANNED_DAYS),
                GardenTask.due_on <= today + timedelta(days=PLANNED_DAYS),
            )
            .order_by(GardenTask.due_on, GardenTask.id)
        )
        return [
            {
                "title": task.title,
                "date": _iso(task.due_on),
                "key": task.signature,
                "source": task.source,
                "priority": task.priority,
                "completed": task.completed_at is not None,
                "reason": task.completion_reason,
            }
            for task in result.all()
        ]

    async def _crops(self, field_id: int) -> list:
        result = await self._db.execute(
            select(
                Crop.name,
                Crop.category,
                FieldCrop.status,
                FieldCrop.planted_at,
                FieldCrop.expected_harvest_at,
            )
            .join(FieldCrop, FieldCrop.crop_id == Crop.id)
            .where(
                FieldCrop.field_id == field_id,
                FieldCrop.status.in_(ACTIVE_CROP_STATUSES),
            )
            .order_by(FieldCrop.planted_at, FieldCrop.id)
        )
        return list(result.all())

    async def _sensors(self, field_id: int) -> dict:
        devices = (
            await self._db.execute(
                select(Device.id, Device.battery_status).where(Device.field_id == field_id)
            )
        ).all()
        last_reading = None
        if devices:
            last_reading = await self._db.scalar(
                select(func.max(Telemetry.timestamp)).where(
                    Telemetry.device_id.in_([row.id for row in devices])
                )
            )
        return {
            "devices": len(devices),
            "online": sum(1 for row in devices if row.battery_status),
            "last_reading_at": _iso(last_reading),
        }

    async def _readings(self, field_id: int) -> list[dict]:
        device_ids = (
            await self._db.scalars(select(Device.id).where(Device.field_id == field_id))
        ).all()
        hour = _HourBucket(Telemetry.timestamp).label("hour")
        result = await self._db.execute(
            select(
                hour,
                func.avg(Telemetry.air_temperature_c).label("air_temperature_c"),
                func.avg(Telemetry.air_humidity_percent).label("air_humidity_percent"),
                func.avg(Telemetry.soil_moisture_percent).label("soil_moisture_percent"),
                func.avg(Telemetry.light_intensity_lux).label("light_intensity_lux"),
            )
            .where(
                Telemetry.device_id.in_(device_ids),
                Telemetry.timestamp >= _now() - timedelta(days=READINGS_DAYS),
            )
            .group_by(hour)
            .order_by(hour)
        )
        return [
            {
                "timestamp": _iso(row.hour),
                "air_temperature_c": _number(row.air_temperature_c),
                "air_humidity_percent": _number(row.air_humidity_percent),
                "soil_moisture_percent": _number(row.soil_moisture_percent),
                "light_intensity_lux": _number(row.light_intensity_lux),
            }
            for row in result.all()
        ]

    async def _forecast(self, field_id: int, language: str) -> dict | None:
        """The forecast the weather screen shows, from its cache when fresh."""
        try:
            weather = await FieldWeatherService(self._db).get_forecast(
                field_id, units="metric", lang=language
            )
        except Exception:
            logger.info("No forecast for field %s", field_id, exc_info=True)
            return None
        return {
            "current": {
                "temperature": weather.current.temperature,
                "humidity": weather.current.humidity,
                "rain_last_hour_mm": weather.current.rain_last_hour_mm,
                "description": weather.current.condition.description,
            },
            "daily": [
                {
                    "date": day.date.isoformat(),
                    "temp_min": day.temp_min,
                    "temp_max": day.temp_max,
                    "rain_mm": day.rain_mm,
                    "rain_probability": day.rain_probability,
                    "description": day.condition.description,
                }
                for day in weather.daily
            ],
            "alerts": [
                {
                    "type": alert.type,
                    "day": _iso(alert.day),
                    "message": alert.message,
                }
                for alert in weather.current_alerts + weather.alerts
            ],
        }

    # ------------------------------------------------------------------
    # Small lookups
    # ------------------------------------------------------------------

    async def _owned_field(self, user_id: UUID, field_id: int) -> Field | None:
        return await self._db.scalar(
            select(Field).where(Field.id == field_id, Field.user_id == user_id)
        )

    async def _task(self, field_id: int, task_id: int) -> GardenTask | None:
        return await self._db.scalar(
            select(GardenTask).where(
                GardenTask.id == task_id,
                GardenTask.field_id == field_id,
                GardenTask.kind == "task",
            )
        )

    async def _recommendation(self, field_id: int, recommendation_id: int) -> GardenTask | None:
        return await self._db.scalar(
            select(GardenTask).where(
                GardenTask.id == recommendation_id,
                GardenTask.field_id == field_id,
                GardenTask.kind == "recommendation",
            )
        )

    async def _ai_task_exists(self, field_id: int, key: str | None, due_on: date) -> bool:
        """A task with this key and day, made by the AI or taken over by the user."""
        found = await self._db.scalar(
            select(GardenTask.id)
            .where(
                GardenTask.field_id == field_id,
                GardenTask.kind == "task",
                GardenTask.signature == key,
                GardenTask.due_on == due_on,
            )
            .limit(1)
        )
        return found is not None

    async def _has_sensors(self, field_id: int) -> bool:
        found = await self._db.scalar(select(Device.id).where(Device.field_id == field_id).limit(1))
        return found is not None


def _crops_snapshot(crops: list, today: date) -> list[dict]:
    snapshot = []
    for crop in crops:
        planted = crop.planted_at
        harvest = crop.expected_harvest_at
        snapshot.append(
            {
                "name": crop.name,
                "category": crop.category,
                "status": crop.status,
                "planted_at": _iso(planted),
                "days_since_planted": (today - planted).days if planted else None,
                "expected_harvest_at": _iso(harvest),
                "days_until_expected_harvest": (harvest - today).days if harvest else None,
            }
        )
    return snapshot
