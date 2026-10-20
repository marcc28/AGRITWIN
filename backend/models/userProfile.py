from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserProfileCreate(BaseModel):
    language: str = "ca"
    units: str = "metric"
    notifications_enabled: bool = True
    weather_alerts_enabled: bool = True
    irrigation_alerts_enabled: bool = True
    theme: str = "system"


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    language: str
    units: str
    notifications_enabled: bool
    weather_alerts_enabled: bool
    irrigation_alerts_enabled: bool
    theme: str
