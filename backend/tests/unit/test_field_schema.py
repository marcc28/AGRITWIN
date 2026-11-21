from decimal import Decimal
from uuid import uuid4

from db.schema import Field


def test_field_to_dict_serializes_optional_values_and_size():
    owner_id = uuid4()
    field = Field(
        id=7,
        user_id=owner_id,
        name="Camp",
        location=None,
        lat=None,
        lon=None,
        field_type=None,
        soil_type=None,
        size_m2=Decimal("12.50"),
        created_at=None,
    )

    assert field.to_dict() == {
        "id": 7,
        "user_id": str(owner_id),
        "name": "Camp",
        "location": None,
        "lat": None,
        "lon": None,
        "field_type": None,
        "soil_type": None,
        "size_m2": 12.5,
        "boundary": None,
        "excluded_zones": [],
        "created_at": None,
    }
