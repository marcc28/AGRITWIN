
from pydantic import BaseModel

class UserProfileCreate(BaseModel):
    language: str = "ca"
    units: str = "metric"
    notifications_enabled: bool = True
    weather_alerts_enabled: bool = True
    irrigation_alerts_enabled: bool = True
    theme: str = "system"


class UserProfileRead(BaseModel):
    username: str
    language: str
    units: str
    notifications_enabled: bool
    weather_alerts_enabled: bool
    irrigation_alerts_enabled: bool
    theme: str
