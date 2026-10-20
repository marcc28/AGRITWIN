from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import bindparam, text

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User


class Reading(BaseModel):
    timestamp: datetime
    temperature: float
    air_humidity: float
    soil_humidity: float
    light: float


class DashboardResponse(BaseModel):
    field_name: str | None
    device_ids: list[str]
    latest: Reading | None
    history: list[Reading]


router = APIRouter()
HISTORY_LIMIT = 50


def _to_reading(row) -> Reading:
    return Reading(
        timestamp=row.timestamp,
        temperature=float(row.air_temperature_c or 0),
        air_humidity=float(row.air_humidity_percent or 0),
        soil_humidity=float(row.soil_moisture_percent or 0),
        light=float(row.light_intensity_lux or 0),
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    field_id: int | None = None,
    current_user: User = Depends(get_current_user),
) -> DashboardResponse:
    async with AsyncSessionLocal() as session:
        if field_id is None:
            result = await session.execute(
                text("SELECT id, name FROM fields WHERE username = :username ORDER BY id LIMIT 1"),
                {"username": current_user.username},
            )
        else:
            result = await session.execute(
                text("SELECT id, name FROM fields WHERE username = :username AND id = :field_id"),
                {"username": current_user.username, "field_id": field_id},
            )
        field = result.first()

        if field is None:
            return DashboardResponse(field_name=None, device_ids=[], latest=None, history=[])

        result = await session.execute(
            text("SELECT id FROM devices WHERE field_id = :field_id ORDER BY id"),
            {"field_id": field.id},
        )
        device_ids = [row.id for row in result.all()]

        if not device_ids:
            return DashboardResponse(field_name=field.name, device_ids=[], latest=None, history=[])

        result = await session.execute(
            text(
                "SELECT date_trunc('minute', timestamp) AS timestamp, "
                "AVG(air_temperature_c) AS air_temperature_c, "
                "AVG(air_humidity_percent) AS air_humidity_percent, "
                "AVG(soil_moisture_percent) AS soil_moisture_percent, "
                "AVG(light_intensity_lux) AS light_intensity_lux "
                "FROM telemetry "
                "WHERE device_id IN :device_ids "
                "GROUP BY date_trunc('minute', timestamp) "
                "ORDER BY timestamp DESC LIMIT :limit"
            ).bindparams(bindparam("device_ids", expanding=True)),
            {"device_ids": device_ids, "limit": HISTORY_LIMIT},
        )
        rows = result.all()

    history = [_to_reading(row) for row in reversed(rows)]
    latest = history[-1] if history else None

    return DashboardResponse(
        field_name=field.name,
        device_ids=device_ids,
        latest=latest,
        history=history,
    )
