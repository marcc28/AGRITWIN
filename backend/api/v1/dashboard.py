from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User


class Reading(BaseModel):
    timestamp: datetime
    temperature: float
    air_humidity: float
    soil_humidity: float
    light: float


class DashboardResponse(BaseModel):
    device_id: str | None
    latest: Reading | None
    history: list[Reading]


router = APIRouter()
HISTORY_LIMIT = 50


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    device_id: str | None = None,
    current_user: User = Depends(get_current_user),
) -> DashboardResponse:
    async with AsyncSessionLocal() as session:
        if device_id is None:
            result = await session.execute(
                text("SELECT device_id FROM telemetria ORDER BY timestamp DESC LIMIT 1")
            )
            device_id = result.scalar()

        if device_id is None:
            return DashboardResponse(device_id=None, latest=None, history=[])

        result = await session.execute(
            text(
                "SELECT timestamp, temperatura, umidita_aria, umidita_terreno, luce "
                "FROM telemetria WHERE device_id = :device_id "
                "ORDER BY timestamp DESC LIMIT :limit"
            ),
            {"device_id": device_id, "limit": HISTORY_LIMIT},
        )
        rows = result.all()

    history = [
        Reading(
            timestamp=row.timestamp,
            temperature=row.temperatura,
            air_humidity=row.umidita_aria,
            soil_humidity=row.umidita_terreno,
            light=row.luce,
        )
        for row in reversed(rows)
    ]
    latest = history[-1] if history else None

    return DashboardResponse(device_id=device_id, latest=latest, history=history)
