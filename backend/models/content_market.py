from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ConteMercatCreate(BaseModel):
    product: str
    tecnical_name: str | None = None
    price: Decimal
    price_per_kg: Decimal | None = None
    left_units: int = 0


class ConteMercatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product: str
    tecnical_name: str | None
    price: Decimal
    price_per_kg: Decimal | None
    left_units: int
    created_at: datetime
