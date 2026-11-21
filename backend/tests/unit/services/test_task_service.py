import json
import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from db.schema import (
    Base,
    Crop,
    Device,
    Field,
    FieldCrop,
    GardenTask,
    Telemetry,
    User,
    UserProfile,
)
from services import task_service
from services.field_weather_service import FieldWeatherService
from services.task_service import CRON_STALE_HOURS, TaskService
from services.weather_service import WeatherDataError

OWNER = UUID("c1a7a5e0-0000-4000-a000-00000000000a")
OTHER = UUID("c1a7a5e0-0000-4000-a000-00000000000b")
TODAY = date(2026, 11, 10)
REAL_MADRID_TODAY = task_service.madrid_today


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


@pytest.fixture
async def sessions():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                User(id=OWNER, username="cinta", email="cinta@example.com", password_hash="x"),
                User(id=OTHER, username="marc", email="marc@example.com", password_hash="x"),
                UserProfile(id=OWNER, name="Cinta", language="es-ES"),
                UserProfile(id=OTHER, name="Marc", language="en"),
            ]
        )
        session.add_all(
            [
                Field(id=1, user_id=OWNER, name="Hort", location="Alcarràs", lat=41.5, lon=0.5),
                Field(id=2, user_id=OWNER, name="Sense sensors", location="Lleida"),
                Field(id=3, user_id=OWNER, name="Camp buit"),
                Field(id=4, user_id=OTHER, name="Altre", location="Girona"),
                Field(id=5, user_id=OWNER, name="Només sensor"),
                Field(id=6, user_id=OWNER, name="Només cultiu"),
            ]
        )
        session.add_all(
            [
                Device(id="dev-1", field_id=1, battery_status=True),
                Device(id="dev-2", field_id=1, battery_status=False),
                Device(id="dev-5", field_id=5, battery_status=True),
                Crop(id=1, name="Tomàquet", category="Hortalissa"),
                Crop(id=2, name="Blat", category="Cereal"),
            ]
        )
        await session.flush()
        session.add_all(
            [
                FieldCrop(
                    field_id=1,
                    crop_id=1,
                    status="planted",
                    planted_at=TODAY - timedelta(days=21),
                    expected_harvest_at=TODAY + timedelta(days=2),
                ),
                FieldCrop(field_id=1, crop_id=2, status="harvested"),
                FieldCrop(field_id=6, crop_id=1, status="planned"),
            ]
        )
        await session.commit()
    yield factory
    await engine.dispose()


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    monkeypatch.setattr(task_service, "madrid_today", lambda: TODAY)


class FakeGemini:
    def __init__(self):
        self.answer = json.dumps({"tasks": [], "close": [], "recommendations": []})
        self.error = None
        self.calls = []

    async def __call__(self, snapshot, language):
        self.calls.append((snapshot, language))
        if self.error:
            raise self.error
        return self.answer


@pytest.fixture
def gemini(monkeypatch):
    fake = FakeGemini()
    monkeypatch.setattr(task_service, "ask_gemini", fake)
    return fake


def _forecast():
    condition = SimpleNamespace(description="clar")
    return SimpleNamespace(
        current=SimpleNamespace(
            temperature=21.5,
            humidity=40,
            rain_last_hour_mm=0.0,
            condition=condition,
        ),
        daily=[
            SimpleNamespace(
                date=TODAY,
                temp_min=8.0,
                temp_max=22.0,
                rain_mm=0.0,
                rain_probability=5.0,
                condition=condition,
            )
        ],
        current_alerts=[],
        alerts=[SimpleNamespace(type="frost", day=TODAY + timedelta(days=1), message="Gelada")],
    )


@pytest.fixture
def weather(monkeypatch):
    calls = []

    async def get_forecast(self, field_id, units="metric", lang=None, **kwargs):
        calls.append((field_id, units, lang))
        return _forecast()

    monkeypatch.setattr(FieldWeatherService, "get_forecast", get_forecast)
    return calls


async def add_rows(sessions, *rows):
    async with sessions() as session:
        session.add_all(rows)
        await session.commit()


def notice(**values):
    """A short notice from the AI, stored in the same table as the tasks."""
    values.setdefault("source", "ai")
    return GardenTask(kind="recommendation", **values)


async def all_tasks(sessions, field_id=1, kind="task"):
    async with sessions() as session:
        result = await session.scalars(
            select(GardenTask)
            .where(GardenTask.field_id == field_id, GardenTask.kind == kind)
            .order_by(GardenTask.id)
        )
        return list(result.all())


async def set_checked(sessions, hours_ago, field_id=1):
    async with sessions() as session:
        field = await session.get(Field, field_id)
        field.ai_checked_at = utc_now() - timedelta(hours=hours_ago)
        await session.commit()


async def checked_at(sessions, field_id=1):
    async with sessions() as session:
        return (await session.get(Field, field_id)).ai_checked_at


def answer(tasks=(), close=(), recommendations=()):
    return json.dumps(
        {"tasks": list(tasks), "close": list(close), "recommendations": list(recommendations)}
    )


def water(day=TODAY, key="water", priority="high"):
    return {
        "key": key,
        "date": day.isoformat(),
        "title": "Regar",
        "details": "El sòl és sec",
        "priority": priority,
    }


# ---------------------------------------------------------------- reading


async def test_list_tasks_hides_other_users_gardens(sessions):
    async with sessions() as session:
        assert await TaskService(session).list_tasks(OTHER, 1) is None
        assert await TaskService(session).list_tasks(OWNER, 99) is None


async def test_list_tasks_returns_the_window_in_order(sessions):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Demà", due_on=TODAY + timedelta(days=1), source="user"),
        GardenTask(field_id=1, title="Avui", due_on=TODAY, source="user"),
        GardenTask(
            field_id=1, title="Fa un any", due_on=TODAY - timedelta(days=400), source="user"
        ),
        GardenTask(field_id=2, title="Altre camp", due_on=TODAY, source="user"),
        notice(field_id=1, title="No reguis", due_on=TODAY, signature="skip_water"),
        notice(
            field_id=1,
            title="Vista",
            due_on=TODAY,
            signature="seen",
            seen_at=utc_now(),
        ),
        notice(
            field_id=1,
            title="Massa antiga",
            due_on=TODAY - timedelta(days=30),
            signature="old",
        ),
    )
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 1)
    assert result["today"] == TODAY
    assert result["has_sensors"] is True
    assert [task["title"] for task in result["tasks"]] == ["Avui", "Demà"]
    assert result["tasks"][0]["completed"] is False
    assert [item["title"] for item in result["recommendations"]] == ["No reguis"]


@pytest.mark.parametrize(
    ("field_id", "expected_sensors", "expected_refresh"),
    [
        (1, True, True),
        (2, False, True),
        (3, False, False),
        (5, True, True),
        (6, False, True),
    ],
)
async def test_list_tasks_asks_for_a_review_only_when_there_is_something_to_read(
    sessions, field_id, expected_sensors, expected_refresh
):
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, field_id)
    assert result["has_sensors"] is expected_sensors
    assert result["refresh"] is expected_refresh


@pytest.mark.parametrize(
    ("hours_ago", "expected"),
    [
        (None, True),  # never reviewed
        (2, False),  # reviewed recently
        (11.8, False),  # a review is running or just failed
        (13, True),  # the review is old
    ],
)
async def test_list_tasks_waits_before_asking_again(sessions, hours_ago, expected):
    if hours_ago is not None:
        await set_checked(sessions, hours_ago)
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 1)
    assert result["refresh"] is expected


# ---------------------------------------------------------------- writing


async def test_create_task_stores_a_manual_task(sessions):
    async with sessions() as session:
        created = await TaskService(session).create_task(OWNER, 1, "  Posar tutor  ", TODAY, "low")
    assert created["title"] == "Posar tutor"
    assert created["source"] == "user"
    assert created["priority"] == "low"
    assert created["completed"] is False
    assert created["created_at"] is not None
    assert len(await all_tasks(sessions)) == 1


async def test_create_task_needs_an_own_garden(sessions):
    async with sessions() as session:
        assert await TaskService(session).create_task(OTHER, 1, "x", TODAY, "low") is None
    assert await all_tasks(sessions) == []


async def test_create_task_keeps_the_details(sessions):
    async with sessions() as session:
        created = await TaskService(session).create_task(
            OWNER, 1, "Podar", TODAY, "low", "  Amb les tisores noves  "
        )
    assert created["details"] == "Amb les tisores noves"
    assert created["can_delete"] is True


async def test_update_task_marks_and_reopens_a_task(sessions):
    await add_rows(
        sessions,
        GardenTask(
            field_id=1,
            title="Regar",
            due_on=TODAY,
            source="ai",
            signature="water",
            completion_reason="Ha plogut",
        ),
    )
    async with sessions() as session:
        done = await TaskService(session).update_task(OWNER, 1, 1, {"completed": True})
    assert done["completed"] is True
    assert done["completion_reason"] is None
    assert done["source"] == "ai"  # marking it done is not an edit
    async with sessions() as session:
        reopened = await TaskService(session).update_task(OWNER, 1, 1, {"completed": False})
    assert reopened["completed"] is False


async def test_update_task_rejects_foreign_or_unknown_tasks(sessions):
    await add_rows(sessions, GardenTask(field_id=1, title="x", due_on=TODAY, source="user"))
    async with sessions() as session:
        service = TaskService(session)
        assert await service.update_task(OTHER, 1, 1, {"completed": True}) is None
        assert await service.update_task(OWNER, 1, 99, {"completed": True}) is None
        assert await service.update_task(OWNER, 2, 1, {"completed": True}) is None


async def test_a_notice_is_not_a_task_that_can_be_changed(sessions):
    await add_rows(sessions, notice(field_id=1, title="Avís", due_on=TODAY, signature="tip"))
    async with sessions() as session:
        service = TaskService(session)
        assert await service.update_task(OWNER, 1, 1, {"completed": True}) is None
        assert await service.delete_task(OWNER, 1, 1) is None


async def test_the_user_can_edit_every_part_of_a_task(sessions):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Regar", details="Molt", due_on=TODAY, source="user"),
    )
    changes = {
        "title": "  Regar poc ",
        "details": "Només al matí",
        "priority": "low",
        "due_on": TODAY + timedelta(days=2),
    }
    async with sessions() as session:
        edited = await TaskService(session).update_task(OWNER, 1, 1, changes)
    assert (edited["title"], edited["details"], edited["priority"], edited["due_on"]) == (
        "Regar poc",
        "Només al matí",
        "low",
        TODAY + timedelta(days=2),
    )
    assert edited["source"] == "user"


async def test_empty_details_clear_them(sessions):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Regar", details="Molt", due_on=TODAY, source="user"),
    )
    async with sessions() as session:
        edited = await TaskService(session).update_task(OWNER, 1, 1, {"details": "   "})
    assert edited["details"] is None


async def test_editing_an_ai_task_makes_it_the_users_and_the_ai_leaves_it_alone(
    sessions, gemini, weather
):
    await add_rows(
        sessions,
        GardenTask(
            field_id=1,
            title="Regar",
            due_on=TODAY,
            source="ai",
            signature="water",
            priority="high",
        ),
    )
    async with sessions() as session:
        edited = await TaskService(session).update_task(OWNER, 1, 1, {"title": "Regar a la nit"})
    assert edited["source"] == "user"
    assert edited["can_delete"] is False  # the AI key stays, so it is not deletable

    gemini.answer = answer(tasks=[water()])
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    (task,) = await all_tasks(sessions)
    assert (task.title, task.source) == ("Regar a la nit", "user")


async def test_saving_a_task_without_real_changes_does_not_take_it_over(sessions):
    await add_rows(
        sessions,
        GardenTask(
            field_id=1,
            title="Regar",
            details=None,
            due_on=TODAY,
            source="ai",
            signature="water",
        ),
    )
    same = {"title": "Regar", "details": "", "priority": "medium", "due_on": TODAY}
    async with sessions() as session:
        result = await TaskService(session).update_task(OWNER, 1, 1, same)
    assert result["source"] == "ai"


async def test_the_user_can_delete_a_task_written_by_hand(sessions):
    await add_rows(sessions, GardenTask(field_id=1, title="Podar", due_on=TODAY, source="user"))
    async with sessions() as session:
        service = TaskService(session)
        assert await service.delete_task(OTHER, 1, 1) is None
        assert await service.delete_task(OWNER, 1, 99) is None
        assert await service.delete_task(OWNER, 1, 1) is True
    assert await all_tasks(sessions) == []


async def test_a_task_made_by_the_ai_cannot_be_deleted(sessions):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Regar", due_on=TODAY, source="ai", signature="water"),
    )
    async with sessions() as session:
        assert await TaskService(session).delete_task(OWNER, 1, 1) is False
    assert len(await all_tasks(sessions)) == 1


async def test_a_task_the_user_took_over_blocks_the_notice_of_the_same_key(sessions):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Meva", due_on=TODAY, source="user", signature="shade"),
        notice(field_id=1, title="Fes ombra", due_on=TODAY, signature="shade"),
    )
    async with sessions() as session:
        await TaskService(session).convert_recommendation(OWNER, 1, 2)
    assert len(await all_tasks(sessions)) == 1


async def test_dismiss_recommendation_hides_it(sessions):
    await add_rows(
        sessions,
        notice(field_id=1, title="No reguis", due_on=TODAY, signature="skip"),
    )
    async with sessions() as session:
        service = TaskService(session)
        assert await service.dismiss_recommendation(OTHER, 1, 1) is False
        assert await service.dismiss_recommendation(OWNER, 1, 99) is False
        assert await service.dismiss_recommendation(OWNER, 1, 1) is True
    async with sessions() as session:
        assert (await TaskService(session).list_tasks(OWNER, 1))["recommendations"] == []


async def test_convert_recommendation_creates_one_task_for_its_day(sessions):
    yesterday = TODAY - timedelta(days=1)
    await add_rows(
        sessions,
        notice(
            field_id=1,
            title="Cobreix les tomaqueres",
            details="Va a gelar",
            due_on=yesterday,
            signature="protect_frost",
        ),
    )
    async with sessions() as session:
        service = TaskService(session)
        assert await service.convert_recommendation(OTHER, 1, 1) is None
        assert await service.convert_recommendation(OWNER, 1, 99) is None
        assert await service.convert_recommendation(OWNER, 1, 1) == {"ok": True}
        assert await service.convert_recommendation(OWNER, 1, 1) == {"ok": True}
    tasks = await all_tasks(sessions)
    assert len(tasks) == 1
    assert (tasks[0].id, tasks[0].due_on, tasks[0].signature, tasks[0].source) == (
        1,
        yesterday,
        "protect_frost",
        "ai",
    )
    assert tasks[0].details == "Va a gelar"
    assert await all_tasks(sessions, kind="recommendation") == []
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 1)
    assert [task["title"] for task in result["tasks"]] == ["Cobreix les tomaqueres"]
    assert result["recommendations"] == []


async def test_convert_recommendation_reuses_the_task_already_there(sessions):
    await add_rows(
        sessions,
        GardenTask(
            field_id=1,
            title="Cobrir",
            due_on=TODAY,
            source="ai",
            signature="protect_frost",
            completed_at=utc_now(),
        ),
        notice(field_id=1, title="Cobreix", due_on=TODAY, signature="protect_frost"),
    )
    async with sessions() as session:
        await TaskService(session).convert_recommendation(OWNER, 1, 2)
    assert len(await all_tasks(sessions)) == 1
    (kept,) = await all_tasks(sessions, kind="recommendation")
    assert kept.seen_at is not None


async def test_convert_recommendation_survives_a_task_created_at_the_same_time(sessions):
    await add_rows(
        sessions,
        notice(field_id=1, title="Cobreix", due_on=TODAY, signature="protect_frost"),
    )
    async with sessions() as session:
        real_commit = session.commit
        calls = []

        async def commit_once_with_conflict():
            calls.append(1)
            if len(calls) == 1:
                raise IntegrityError("insert", {}, Exception("duplicate"))
            await real_commit()

        session.commit = commit_once_with_conflict
        assert await TaskService(session).convert_recommendation(OWNER, 1, 1) == {"ok": True}
    async with sessions() as session:
        assert (await TaskService(session).list_tasks(OWNER, 1))["recommendations"] == []


# ---------------------------------------------------------------- review


async def test_refresh_sends_everything_the_ai_needs(sessions, gemini, weather):
    hour = utc_now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=2)
    await add_rows(
        sessions,
        Telemetry(
            device_id="dev-1",
            timestamp=hour + timedelta(minutes=10),
            air_temperature_c=20,
            soil_moisture_percent=20,
        ),
        Telemetry(
            device_id="dev-1",
            timestamp=hour + timedelta(minutes=40),
            air_temperature_c=22,
            soil_moisture_percent=30,
        ),
        Telemetry(
            device_id="dev-2", timestamp=utc_now() - timedelta(days=9), soil_moisture_percent=80
        ),
        GardenTask(
            field_id=1,
            title="Abonar",
            due_on=TODAY - timedelta(days=2),
            source="user",
            priority="low",
        ),
    )
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "es-ES") is True

    snapshot, language = gemini.calls[0]
    assert language == "es"
    assert snapshot["today"] == "2026-11-10"
    assert snapshot["can_create_tasks"] is True
    assert snapshot["field"]["name"] == "Hort"
    assert snapshot["sensors"]["devices"] == 2
    assert snapshot["sensors"]["online"] == 1
    assert snapshot["sensors"]["last_reading_at"] is not None
    assert [row["soil_moisture_percent"] for row in snapshot["readings"]] == [25]
    assert [row["air_temperature_c"] for row in snapshot["readings"]] == [21]
    assert snapshot["forecast"]["current"]["temperature"] == 21.5
    assert snapshot["forecast"]["daily"][0]["rain_probability"] == 5.0
    assert snapshot["forecast"]["alerts"] == [
        {"type": "frost", "day": "2026-11-11", "message": "Gelada"}
    ]
    assert snapshot["crops"] == [
        {
            "name": "Tomàquet",
            "category": "Hortalissa",
            "status": "planted",
            "planted_at": "2026-10-20",
            "days_since_planted": 21,
            "expected_harvest_at": "2026-11-12",
            "days_until_expected_harvest": 2,
        }
    ]
    assert [task["title"] for task in snapshot["planned_tasks"]] == ["Abonar"]
    assert weather == [(1, "metric", "es")]


async def test_refresh_averages_the_readings_of_each_hour(sessions, gemini, weather):
    hour = utc_now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=3)
    await add_rows(
        sessions,
        Telemetry(
            device_id="dev-1", timestamp=hour + timedelta(minutes=5), soil_moisture_percent=20
        ),
        Telemetry(
            device_id="dev-1", timestamp=hour + timedelta(minutes=50), soil_moisture_percent=30
        ),
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    readings = gemini.calls[0][0]["readings"]
    assert len(readings) == 1
    assert readings[0]["soil_moisture_percent"] == 25
    assert readings[0]["timestamp"] == hour.isoformat()


async def test_refresh_stores_tasks_and_recommendations(sessions, gemini, weather):
    gemini.answer = answer(
        tasks=[water(), water(day=TODAY + timedelta(days=1), key="harvest_tomato", priority="low")],
        recommendations=[
            {
                "key": "skip_water",
                "date": TODAY.isoformat(),
                "title": "No reguis",
                "details": "Plourà",
            }
        ],
    )
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is True

    tasks = await all_tasks(sessions)
    assert [(task.signature, task.due_on, task.priority, task.source) for task in tasks] == [
        ("water", TODAY, "high", "ai"),
        ("harvest_tomato", TODAY + timedelta(days=1), "low", "ai"),
    ]
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 1)
    assert [item["signature"] for item in result["recommendations"]] == ["skip_water"]
    assert await checked_at(sessions) > utc_now() - timedelta(minutes=1)
    assert result["refresh"] is False


async def test_refresh_is_not_repeated_right_after(sessions, gemini, weather):
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is True
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is False
    assert len(gemini.calls) == 1


async def test_refresh_without_sensors_only_keeps_recommendations(sessions, gemini, weather):
    gemini.answer = answer(
        tasks=[water()],
        close=[{"key": "water", "date": TODAY.isoformat(), "reason": "Ha plogut"}],
        recommendations=[
            {"key": "skip_water", "date": TODAY.isoformat(), "title": "No reguis", "details": None}
        ],
    )
    await add_rows(
        sessions,
        GardenTask(field_id=2, title="Meva", due_on=TODAY, source="ai", signature="water"),
    )
    async with sessions() as session:
        assert await TaskService(session).refresh_field(2, "ca") is True

    snapshot = gemini.calls[0][0]
    assert snapshot["can_create_tasks"] is False
    assert snapshot["readings"] == []
    assert snapshot["sensors"] == {"devices": 0, "online": 0, "last_reading_at": None}
    tasks = await all_tasks(sessions, 2)
    assert [(task.title, task.completed_at) for task in tasks] == [("Meva", None)]
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 2)
    assert [item["signature"] for item in result["recommendations"]] == ["skip_water"]


async def test_refresh_closes_a_task_with_its_reason(sessions, gemini, weather):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Regar", due_on=TODAY, source="ai", signature="water"),
    )
    gemini.answer = answer(
        close=[{"key": "water", "date": TODAY.isoformat(), "reason": "Ja ha plogut"}]
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    (task,) = await all_tasks(sessions)
    assert task.completed_at is not None
    assert task.completion_reason == "Ja ha plogut"


async def test_refresh_moves_a_recent_task_to_today_and_updates_a_pending_one(
    sessions, gemini, weather
):
    await add_rows(
        sessions,
        GardenTask(
            field_id=1,
            title="Regar fa dos dies",
            due_on=TODAY - timedelta(days=2),
            source="ai",
            signature="water",
        ),
        GardenTask(
            field_id=1,
            title="Abonar vell",
            due_on=TODAY + timedelta(days=1),
            source="ai",
            signature="fertilize",
            priority="low",
        ),
    )
    gemini.answer = answer(
        tasks=[
            water(),
            {
                "key": "fertilize",
                "date": (TODAY + timedelta(days=1)).isoformat(),
                "title": "Abonar amb compost",
                "priority": "medium",
            },
        ]
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    tasks = await all_tasks(sessions)
    assert sorted((task.signature, task.due_on, task.title, task.priority) for task in tasks) == [
        ("fertilize", TODAY + timedelta(days=1), "Abonar amb compost", "medium"),
        ("water", TODAY, "Regar", "high"),
    ]


async def test_refresh_deletes_what_is_more_than_a_week_old(sessions, gemini, weather):
    old = TODAY - timedelta(days=8)
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Vella IA", due_on=old, source="ai", signature="weed"),
        GardenTask(field_id=1, title="Meva vella", due_on=old, source="user"),
        GardenTask(
            field_id=1,
            title="Feta",
            due_on=old,
            source="ai",
            signature="done",
            completed_at=utc_now(),
        ),
        notice(field_id=1, title="Vella", due_on=old, signature="tip"),
        notice(field_id=1, title="Recent", due_on=TODAY, signature="tip2"),
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    assert sorted(task.title for task in await all_tasks(sessions)) == ["Feta", "Meva vella"]
    async with sessions() as session:
        rows = await session.scalars(
            select(GardenTask.title).where(GardenTask.kind == "recommendation")
        )
        assert list(rows.all()) == ["Recent"]


async def test_refresh_keeps_a_seen_recommendation_unchanged(sessions, gemini, weather):
    await add_rows(
        sessions,
        notice(
            field_id=1,
            title="Original",
            due_on=TODAY,
            signature="skip_water",
            seen_at=utc_now(),
        ),
        notice(field_id=1, title="Abans", due_on=TODAY, signature="shade"),
    )
    gemini.answer = answer(
        recommendations=[
            {"key": "skip_water", "date": TODAY.isoformat(), "title": "Canviada"},
            {"key": "shade", "date": TODAY.isoformat(), "title": "Fes ombra", "details": "Calor"},
        ]
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    async with sessions() as session:
        rows = await session.scalars(
            select(GardenTask).where(GardenTask.kind == "recommendation").order_by(GardenTask.id)
        )
        assert [(row.title, row.details) for row in rows.all()] == [
            ("Original", None),
            ("Fes ombra", "Calor"),
        ]


async def test_refresh_does_not_bring_back_a_notice_turned_into_a_task(sessions, gemini, weather):
    await add_rows(
        sessions,
        GardenTask(field_id=1, title="Ombra", due_on=TODAY, source="ai", signature="shade"),
    )
    gemini.answer = answer(
        recommendations=[{"key": "shade", "date": TODAY.isoformat(), "title": "Fes ombra"}]
    )
    async with sessions() as session:
        await TaskService(session).refresh_field(1, "ca")
    assert await all_tasks(sessions, kind="recommendation") == []
    assert len(await all_tasks(sessions)) == 1


async def test_refresh_survives_a_missing_forecast(sessions, gemini, monkeypatch):
    async def no_forecast(self, field_id, **kwargs):
        raise WeatherDataError("Field has no location")

    monkeypatch.setattr(FieldWeatherService, "get_forecast", no_forecast)
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is True
    assert gemini.calls[0][0]["forecast"] is None


async def test_a_failing_ai_leaves_no_tasks_and_waits_before_the_next_try(
    sessions, gemini, weather
):
    gemini.error = RuntimeError("quota")
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is False
    # It is marked as just tried: free again in half an hour, not before.
    checked = await checked_at(sessions)
    assert utc_now() - timedelta(hours=12) < checked < utc_now() - timedelta(hours=11)
    assert await all_tasks(sessions) == []
    async with sessions() as session:
        result = await TaskService(session).list_tasks(OWNER, 1)
    assert result["refresh"] is False


async def test_an_answer_that_is_not_json_is_ignored(sessions, gemini, weather):
    gemini.answer = "I am not JSON"
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is False
    assert await all_tasks(sessions) == []


async def test_a_storing_error_is_logged_and_not_raised(sessions, gemini, weather, monkeypatch):
    async def broken(self, field_id, today, plan):
        raise RuntimeError("database down")

    monkeypatch.setattr(TaskService, "_store", broken)
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca") is False
    assert await checked_at(sessions) < utc_now() - timedelta(hours=11)


async def test_refresh_skips_unknown_and_empty_gardens(sessions, gemini, weather):
    async with sessions() as session:
        service = TaskService(session)
        assert await service.refresh_field(99, "ca") is False
        assert await service.refresh_field(3, "ca") is False
    assert gemini.calls == []


async def test_two_reviews_at_once_ask_the_ai_only_once(sessions, gemini, weather):
    async with sessions() as first, sessions() as second:
        await TaskService(first).refresh_field(1, "ca")
        await TaskService(second).refresh_field(1, "ca")
    assert len(gemini.calls) == 1


async def test_a_garden_that_is_claimed_cannot_be_claimed_again(sessions):
    async with sessions() as first, sessions() as second:
        assert await TaskService(first)._claim(1) is True
        assert await TaskService(second)._claim(1) is False


# ---------------------------------------------------------------- scheduled review


async def test_fields_to_review_lists_gardens_with_something_to_read(sessions):
    async with sessions() as session:
        gardens = await TaskService(session).fields_to_review()
    assert gardens == [(1, "es"), (2, "es"), (4, "en"), (5, "es"), (6, "es")]


@pytest.mark.parametrize(
    ("hours_ago", "app_reviews", "cron_reviews"),
    [
        (None, True, True),  # never reviewed
        (3, False, False),  # reviewed a moment ago: nobody repeats it
        (8, False, True),  # the morning review is old enough for the evening one
        (13, True, True),
    ],
)
async def test_the_scheduled_review_comes_sooner_than_an_app_review(
    sessions, gemini, weather, hours_ago, app_reviews, cron_reviews
):
    async def reviewed(stale_hours):
        if hours_ago is not None:
            await set_checked(sessions, hours_ago)
        else:
            async with sessions() as session:
                (await session.get(Field, 1)).ai_checked_at = None
                await session.commit()
        async with sessions() as session:
            return await TaskService(session).refresh_field(1, "ca", stale_hours)

    assert await reviewed(12) is app_reviews
    assert await reviewed(CRON_STALE_HOURS) is cron_reviews


async def test_the_two_triggers_of_the_same_hour_review_a_garden_once(sessions, gemini, weather):
    async with sessions() as first, sessions() as second:
        await TaskService(first).refresh_field(1, "ca", CRON_STALE_HOURS)
        await TaskService(second).refresh_field(1, "ca", CRON_STALE_HOURS)
    assert len(gemini.calls) == 1


async def test_a_failed_scheduled_review_can_be_retried_soon_by_anyone(sessions, gemini, weather):
    gemini.error = RuntimeError("quota")
    async with sessions() as session:
        assert await TaskService(session).refresh_field(1, "ca", CRON_STALE_HOURS) is False
    checked = await checked_at(sessions)
    assert utc_now() - timedelta(hours=12) < checked < utc_now() - timedelta(hours=11)


async def test_freeing_a_garden_after_a_failure_never_raises(sessions):
    async with sessions() as session:
        session.execute = AsyncMock(side_effect=RuntimeError("database down"))
        await TaskService(session)._release(1)


def test_the_hour_of_a_reading_is_cut_with_each_databases_own_function():
    query = select(task_service._HourBucket(Telemetry.timestamp))
    assert "date_trunc('hour', telemetry.timestamp)" in str(
        query.compile(dialect=postgresql.dialect())
    )
    assert "strftime('%Y-%m-%d %H:00:00', telemetry.timestamp)" in str(
        query.compile(dialect=sqlite.dialect())
    )


def test_the_garden_day_follows_the_clock_in_madrid():
    assert REAL_MADRID_TODAY() == datetime.now(ZoneInfo("Europe/Madrid")).date()
