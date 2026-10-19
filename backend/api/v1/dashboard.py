from fastapi import APIRouter, Depends

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User
from models.dashboard import DashboardResponse
from services.dashboard_service import DashboardService

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


async def get_dashboard_service():
    async with AsyncSessionLocal() as session:
        yield DashboardService(session=session)


@router.get(
    "",
    response_model=DashboardResponse,
)
async def get_dashboard(
    field_id: int | None = None,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardResponse:
    return await service.get_dashboard(
        username=current_user.username,
        field_id=field_id,
    )
