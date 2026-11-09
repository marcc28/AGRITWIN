from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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




class SocialLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class SocialSignupRequest(BaseModel):
    signup_token: str = Field(min_length=1)
    username: str = Field(min_length=1, max_length=255)
    privacy_terms_accepted: bool
    security_terms_accepted: bool
