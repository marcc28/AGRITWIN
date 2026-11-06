from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from models.crops import CropCreate, CropRead, CropUpdate


def test_crop_create_accepts_optional_fields():
    assert CropCreate(name="Ordi").model_dump() == {
        "name": "Ordi",
        "scientific_name": None,
        "category": None,
    }


@pytest.mark.parametrize("value", ["", " " * 101])
def test_crop_create_validates_name_length(value):
    with pytest.raises(ValidationError):
        CropCreate(name=value)


def test_crop_update_allows_partial_updates_but_validates_name():
    assert CropUpdate(category="cereal").model_dump(exclude_unset=True) == {"category": "cereal"}
    with pytest.raises(ValidationError):
        CropUpdate(name="")


def test_crop_read_supports_orm_attributes():
    value = type(
        "Crop",
        (),
        {
            "id": 2,
            "name": "Blat",
            "scientific_name": None,
            "category": "cereal",
            "created_at": datetime(2026, 1, 2, tzinfo=UTC),
        },
    )()
    assert CropRead.model_validate(value).name == "Blat"
