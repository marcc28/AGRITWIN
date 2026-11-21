import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import BackgroundTasks, HTTPException
from pydantic import ValidationError

from api.v1 import tasks as tasks_router
from api.v1.tasks import (
    convert_recommendation,
    create_task,
    delete_task,
    dismiss_recommendation,
    generate_tasks,
    get_task_service,
    list_tasks,
    refresh_field_later,
    review_gardens,
    update_task,
)
from models.tasks import TaskCreate, TaskUpdate
from services.gemini_tasks import STALE_HOURS
from services.task_service import CRON_STALE_HOURS

USER = SimpleNamespace(id=UUID("c1a7a5e0-0000-4000-a000-00000000000a"))
TODAY = date(2026, 11, 10)
CREATED = datetime(2026, 11, 10, 8, 0, tzinfo=UTC)


@pytest.fixture
def service():
    return AsyncMock()


def task_row(**changes):
    row = {
        "id": 1,
        "title": "Regar",
        "details": None,
        "due_on": TODAY,
        "source": "user",
        "priority": "medium",
        "completion_reason": None,
        "completed": False,
        "can_delete": True,
        "created_at": CREATED,
    }
    row.update(changes)
    return row


def listing(refresh=False):
    return {
        "today": TODAY,
        "has_sensors": True,
        "refresh": refresh,
        "tasks": [task_row()],
        "recommendations": [
            {"id": 3, "title": "No reguis", "details": None, "due_on": TODAY, "signature": "skip"}
        ],
    }


# ---------------------------------------------------------------- list


async def test_list_tasks_returns_the_garden_tasks(service):
    service.list_tasks.return_value = listing()
    background = BackgroundTasks()
    result = await list_tasks(background, 7, "es", USER, service)
    service.list_tasks.assert_awaited_once_with(USER.id, 7)
    assert result.today == TODAY
    assert [task.title for task in result.tasks] == ["Regar"]
    assert [item.signature for item in result.recommendations] == ["skip"]
    assert background.tasks == []


async def test_list_tasks_queues_a_review_in_the_app_language(service):
    service.list_tasks.return_value = listing(refresh=True)
    background = BackgroundTasks()
    await list_tasks(background, 7, "es-ES", USER, service)
    (queued,) = background.tasks
    assert queued.func is refresh_field_later
    assert queued.args == (7, "es")


async def test_list_tasks_404_for_a_garden_that_is_not_yours(service):
    service.list_tasks.return_value = None
    with pytest.raises(HTTPException) as error:
        await list_tasks(BackgroundTasks(), 7, "ca", USER, service)
    assert error.value.status_code == 404


# ---------------------------------------------------------------- write


async def test_create_task_passes_the_payload_to_the_service(service):
    service.create_task.return_value = task_row(priority="high")
    payload = TaskCreate(
        field_id=7, title="  Regar  ", details=" Abans de les 10 ", due_on=TODAY, priority="high"
    )
    result = await create_task(payload, USER, service)
    service.create_task.assert_awaited_once_with(
        USER.id, 7, "Regar", TODAY, "high", "Abans de les 10"
    )
    assert result.priority == "high"


async def test_create_task_404_for_a_garden_that_is_not_yours(service):
    service.create_task.return_value = None
    with pytest.raises(HTTPException) as error:
        await create_task(TaskCreate(field_id=7, title="x", due_on=TODAY), USER, service)
    assert error.value.status_code == 404


def test_a_task_title_cannot_be_blank_or_too_long():
    with pytest.raises(ValidationError):
        TaskCreate(field_id=1, title="   ", due_on=TODAY)
    with pytest.raises(ValidationError):
        TaskCreate(field_id=1, title="x" * 201, due_on=TODAY)


def test_a_task_priority_must_be_one_of_the_three_levels():
    assert TaskCreate(field_id=1, title="x", due_on=TODAY).priority == "medium"
    with pytest.raises(ValidationError):
        TaskCreate(field_id=1, title="x", due_on=TODAY, priority="urgent")


async def test_update_task_completes_it(service):
    service.update_task.return_value = task_row(completed=True)
    result = await update_task(1, TaskUpdate(completed=True), 7, USER, service)
    service.update_task.assert_awaited_once_with(USER.id, 7, 1, {"completed": True})
    assert result.completed is True


async def test_update_task_sends_only_what_the_user_changed(service):
    service.update_task.return_value = task_row(title="Podar", details=None)
    payload = TaskUpdate(title=" Podar ", details="", due_on=TODAY)
    await update_task(1, payload, 7, USER, service)
    service.update_task.assert_awaited_once_with(
        USER.id, 7, 1, {"title": "Podar", "details": "", "due_on": TODAY}
    )


async def test_update_task_404_when_the_task_is_not_found(service):
    service.update_task.return_value = None
    with pytest.raises(HTTPException) as error:
        await update_task(1, TaskUpdate(completed=True), 7, USER, service)
    assert error.value.status_code == 404


def test_an_update_must_change_something():
    with pytest.raises(ValidationError):
        TaskUpdate()


@pytest.mark.parametrize("field", ["completed", "title", "priority", "due_on"])
def test_an_update_cannot_set_a_required_field_to_null(field):
    with pytest.raises(ValidationError):
        TaskUpdate(**{field: None})


def test_an_update_may_clear_the_details():
    assert TaskUpdate(details=None).model_dump(exclude_unset=True) == {"details": None}


def test_the_details_cannot_be_too_long():
    with pytest.raises(ValidationError):
        TaskUpdate(details="x" * 501)


async def test_delete_task_answers_no_content(service):
    service.delete_task.return_value = True
    response = await delete_task(1, 7, USER, service)
    service.delete_task.assert_awaited_once_with(USER.id, 7, 1)
    assert response.status_code == 204


async def test_delete_task_404_when_the_task_is_not_found(service):
    service.delete_task.return_value = None
    with pytest.raises(HTTPException) as error:
        await delete_task(1, 7, USER, service)
    assert error.value.status_code == 404


async def test_delete_task_409_for_a_task_made_by_the_ai(service):
    service.delete_task.return_value = False
    with pytest.raises(HTTPException) as error:
        await delete_task(1, 7, USER, service)
    assert error.value.status_code == 409


async def test_dismiss_recommendation_says_ok(service):
    service.dismiss_recommendation.return_value = True
    assert await dismiss_recommendation(3, 7, USER, service) == {"ok": True}
    service.dismiss_recommendation.assert_awaited_once_with(USER.id, 7, 3)


async def test_dismiss_recommendation_404_when_it_is_not_found(service):
    service.dismiss_recommendation.return_value = False
    with pytest.raises(HTTPException) as error:
        await dismiss_recommendation(3, 7, USER, service)
    assert error.value.status_code == 404


async def test_convert_recommendation_creates_the_task(service):
    service.convert_recommendation.return_value = {"ok": True}
    assert await convert_recommendation(3, 7, USER, service) == {"ok": True}
    service.convert_recommendation.assert_awaited_once_with(USER.id, 7, 3)


async def test_convert_recommendation_404_when_it_is_not_found(service):
    service.convert_recommendation.return_value = None
    with pytest.raises(HTTPException) as error:
        await convert_recommendation(3, 7, USER, service)
    assert error.value.status_code == 404


# ---------------------------------------------------------------- scheduled review


@pytest.fixture
def cron_secret(monkeypatch):
    monkeypatch.setenv("TASKS_CRON_SECRET", " s3cret ")


async def test_generate_reviews_every_garden_with_the_right_secret(
    service, cron_secret, monkeypatch
):
    service.fields_to_review.return_value = [(1, "ca"), (2, "es"), (3, "en")]
    review = AsyncMock(return_value=2)
    monkeypatch.setattr(tasks_router, "review_gardens", review)

    result = await generate_tasks("s3cret", service)

    assert (result.gardens, result.reviewed) == (3, 2)
    review.assert_awaited_once_with([(1, "ca"), (2, "es"), (3, "en")])


@pytest.mark.parametrize("sent", ["", "wrong", "s3cret ", "ñ"])
async def test_generate_rejects_a_wrong_secret(service, cron_secret, sent):
    with pytest.raises(HTTPException) as error:
        await generate_tasks(sent, service)
    assert error.value.status_code == 401
    service.fields_to_review.assert_not_awaited()


async def test_generate_is_closed_when_no_secret_is_configured(service, monkeypatch):
    monkeypatch.delenv("TASKS_CRON_SECRET", raising=False)
    with pytest.raises(HTTPException) as error:
        await generate_tasks("", service)
    assert error.value.status_code == 401
    service.fields_to_review.assert_not_awaited()


async def test_the_review_limits_how_many_gardens_run_together(monkeypatch):
    running = 0
    peak = 0
    calls = []

    async def fake_refresh(field_id, language, stale_hours):
        nonlocal running, peak
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.01)
        running -= 1
        calls.append((field_id, language, stale_hours))
        return field_id % 2 == 0

    monkeypatch.setattr(tasks_router, "refresh_field_later", fake_refresh)
    reviewed = await review_gardens([(number, "ca") for number in range(1, 9)])

    assert reviewed == 4
    assert len(calls) == 8
    assert {stale for _id, _lang, stale in calls} == {CRON_STALE_HOURS}
    assert peak == tasks_router.CRON_CONCURRENCY


async def test_one_failing_garden_does_not_stop_the_others(monkeypatch):
    seen = []

    async def fake_refresh(field_id, language, stale_hours):
        if field_id == 2:
            raise RuntimeError("boom")
        seen.append(field_id)
        return True

    monkeypatch.setattr(tasks_router, "refresh_field_later", fake_refresh)
    assert await review_gardens([(1, "ca"), (2, "ca"), (3, "ca")]) == 2
    assert sorted(seen) == [1, 3]


async def test_the_scheduled_review_is_shorter_than_the_app_review():
    assert CRON_STALE_HOURS < STALE_HOURS


async def test_refresh_field_later_uses_its_own_session(monkeypatch):
    opened = []

    @asynccontextmanager
    async def fake_session():
        opened.append("open")
        yield "session"

    seen = {}

    class FakeService:
        def __init__(self, session):
            seen["session"] = session

        async def refresh_field(self, field_id, language, stale_hours):
            seen["call"] = (field_id, language, stale_hours)
            return True

    monkeypatch.setattr(tasks_router, "AsyncSessionLocal", fake_session)
    monkeypatch.setattr(tasks_router, "TaskService", FakeService)
    assert await refresh_field_later(4, "it") is True
    assert await refresh_field_later(4, "it", 6) is True
    assert opened == ["open", "open"]
    assert seen == {"session": "session", "call": (4, "it", 6)}


async def test_get_task_service_gives_a_service_with_a_session(monkeypatch):
    @asynccontextmanager
    async def fake_session():
        yield "session"

    monkeypatch.setattr(tasks_router, "AsyncSessionLocal", fake_session)
    generator = get_task_service()
    service = await anext(generator)
    assert service._db == "session"
    await generator.aclose()
