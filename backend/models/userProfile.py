from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


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


class MeRead(BaseModel):
    username: str
    email: str
    name: str
    language: str
    notifications_enabled: bool
    weather_alerts_enabled: bool


class MeUpdate(BaseModel):
    name: str
    language: str
    notifications_enabled: bool
    weather_alerts_enabled: bool


class EmailUpdate(BaseModel):
    email: EmailStr


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str
    new_password_conf: str
