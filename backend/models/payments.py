from uuid import UUID

from pydantic import BaseModel, Field


class PaymentRequest(BaseModel):
    productId: UUID
    quantity: int = Field(ge=1, le=20)
