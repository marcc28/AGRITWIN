from datetime import date, datetime

from pydantic import AliasPath, BaseModel, ConfigDict, Field

# -------------------------
# FIELD CROPS
# -------------------------


class FieldCropCreate(BaseModel):
    field_id: int
    crop_id: int
    planted_at: date | None = None
    expected_harvest_at: date | None = None
    status: str = "planted"
    notes: str | None = None


class FieldCropUpdate(BaseModel):
    field_id: int | None = None
    crop_id: int | None = None
    planted_at: date | None = None
    expected_harvest_at: date | None = None
    status: str | None = None
    notes: str | None = None


class FieldCropRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_id: int
    crop_id: int
    crop_name: str = Field(validation_alias=AliasPath("crop", "name"))
    planted_at: date | None
    expected_harvest_at: date | None
    status: str
    notes: str | None
    created_at: datetime
