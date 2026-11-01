
from fastapi import APIRouter, Depends

from db import AsyncSessionLocal
from models.payments import PaymentRequest
from services.content_market_service import ConteMercatService
from services.payment_service import PaymentService

router = APIRouter()


async def get_payment_service():
    async with AsyncSessionLocal() as session:
        market_service = ConteMercatService(session=session)
        yield PaymentService(
            conte_mercat_service=market_service,
        )


@router.post("/payment-sheet")
async def create_payment_sheet(
    body: PaymentRequest,
    service: PaymentService = Depends(get_payment_service),
):
    return await service.create_payment_sheet(body)


@router.post("/checkout-session")
async def create_checkout_session(
    body: PaymentRequest,
    service: PaymentService = Depends(get_payment_service),
):
    return await service.create_checkout_session(body)
