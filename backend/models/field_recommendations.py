from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FieldRecommendationBase(BaseModel):
    category: str = Field(..., max_length=50)
    title: str = Field(..., max_length=255)
    description: str
    severity: str = "info"
    based_on: dict[str, Any] = Field(default_factory=dict)
    model: str | None = Field(default=None, max_length=100)
    expires_at: datetime | None = None


class FieldRecommendationCreate(FieldRecommendationBase):
    field_id: int


class FieldRecommendationUpdate(BaseModel):
    # Keep this field visible to the router so attempts to change ownership can
    # be rejected explicitly instead of silently ignored by Pydantic.
    field_id: int | None = None
    category: str | None = Field(default=None, max_length=50)
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    severity: str | None = None
    based_on: dict[str, Any] | None = None
    model: str | None = Field(default=None, max_length=100)
    expires_at: datetime | None = None


class FieldRecommendationRead(FieldRecommendationBase):
    id: UUID
    field_id: int
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)
