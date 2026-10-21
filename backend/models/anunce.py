from datetime import datetime
from uuid import UUID as PyUUID

from pydantic import BaseModel, ConfigDict


class AnunceCreate(BaseModel):
    title: str
    subtile: str | None = None
    agent: str | None = None
    content: str | None = None


class AnunceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PyUUID
    title: str
    subtile: str | None
    agent: str | None
    content: str | None
    created_at: datetime
