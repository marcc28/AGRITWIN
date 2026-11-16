import asyncio
import logging
import os
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Response

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User
from models.tasks import (
    GenerateResponse,
    TaskCreate,
    TaskListResponse,
    TaskRead,
    TaskUpdate,
)
from services.gemini_tasks import STALE_HOURS, normalize_language
from services.task_service import CRON_STALE_HOURS, TaskService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# How many gardens the scheduled review asks Gemini about at the same time.
CRON_CONCURRENCY = 3


async def get_task_service():
    async with AsyncSessionLocal() as session:
        yield TaskService(session=session)


async def refresh_field_later(field_id: int, language: str, stale_hours: int = STALE_HOURS) -> bool:
    async with AsyncSessionLocal() as session:
        return await TaskService(session).refresh_field(field_id, language, stale_hours)


async def review_gardens(gardens: list[tuple[int, str]]) -> int:
    """Review every garden, a few at a time. Returns how many were reviewed."""
    gate = asyncio.Semaphore(CRON_CONCURRENCY)

    async def review(field_id: int, language: str) -> bool:
        async with gate:
            try:
                return await refresh_field_later(field_id, language, CRON_STALE_HOURS)
            except Exception:
                logger.warning("Scheduled review failed for field %s", field_id, exc_info=True)
                return False

    results = await asyncio.gather(*(review(field_id, language) for field_id, language in gardens))
    return sum(results)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    background: BackgroundTasks,
    field_id: int,
    lang: str = "ca",
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> TaskListResponse:
    result = await service.list_tasks(current_user.id, field_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Field not found")
    if result["refresh"]:
        background.add_task(refresh_field_later, field_id, normalize_language(lang))
    return TaskListResponse(**result)


@router.post("", response_model=TaskRead, status_code=201)
async def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    created = await service.create_task(
        current_user.id,
        payload.field_id,
        payload.title,
        payload.due_on,
        payload.priority,
        payload.details,
    )
    if created is None:
        raise HTTPException(status_code=404, detail="Field not found")
    return TaskRead(**created)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    field_id: int,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    updated = await service.update_task(
        current_user.id,
        field_id,
        task_id,
        payload.model_dump(exclude_unset=True),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead(**updated)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    field_id: int,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> Response:
    deleted = await service.delete_task(current_user.id, field_id, task_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if not deleted:
        raise HTTPException(
            status_code=409,
            detail="A task made by the AI cannot be deleted. Mark it as done or edit it.",
        )
    return Response(status_code=204)


@router.post("/recommendations/{recommendation_id}/seen")
async def dismiss_recommendation(
    recommendation_id: int,
    field_id: int,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> dict:
    done = await service.dismiss_recommendation(
        current_user.id,
        field_id,
        recommendation_id,
    )
    if not done:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return {"ok": True}


@router.post("/recommendations/{recommendation_id}/task", status_code=201)
async def convert_recommendation(
    recommendation_id: int,
    field_id: int,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
) -> dict:
    created = await service.convert_recommendation(
        current_user.id,
        field_id,
        recommendation_id,
    )
    if created is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return created


@router.post("/generate", response_model=GenerateResponse)
async def generate_tasks(
    x_cron_secret: str = Header(default=""),
    service: TaskService = Depends(get_task_service),
) -> GenerateResponse:
    """Called by the GitHub Action at 08:00 and 20:00 (Spain).

    It waits until every garden is reviewed, so Render stays awake meanwhile
    and the Action log shows the result.
    """
    expected = os.getenv("TASKS_CRON_SECRET", "").strip()
    if not expected or not secrets.compare_digest(x_cron_secret.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Not allowed")
    gardens = await service.fields_to_review()
    reviewed = await review_gardens(gardens)
    logger.info("Scheduled task review: %s of %s gardens", reviewed, len(gardens))
    return GenerateResponse(gardens=len(gardens), reviewed=reviewed)
