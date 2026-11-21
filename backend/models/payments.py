from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentRequest(BaseModel):
    productId: UUID
    quantity: Decimal = Field(
        gt=Decimal("0"),
        decimal_places=2,
    )
