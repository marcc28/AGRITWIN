from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# -------------------------
# CROPS
# -------------------------


class CropCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    scientific_name: str | None = Field(None, max_length=150)
    category: str | None = Field(None, max_length=100)


class CropUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    scientific_name: str | None = Field(None, max_length=150)
    category: str | None = Field(None, max_length=100)


class CropRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    scientific_name: str | None
    category: str | None
    created_at: datetime
