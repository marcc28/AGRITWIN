from datetime import datetime

from pydantic import BaseModel


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
