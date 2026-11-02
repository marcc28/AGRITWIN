import os
from decimal import ROUND_HALF_UP, Decimal, DecimalException
from uuid import UUID

import stripe
from fastapi import HTTPException

from models.payments import PaymentRequest
from services.content_market_service import ConteMercatService


class PaymentService:
    def __init__(self, conte_mercat_service: ConteMercatService):
        self._conte_mercat_service = conte_mercat_service

        # Comprova la clau quan s'inicialitza el servei.
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    def _require_stripe_key(self) -> None:
        if not stripe.api_key:
            raise HTTPException(
                status_code=500,
                detail="Falta STRIPE_SECRET_KEY",
            )

    async def _get_product(self, product_id: UUID):
        product = await self._conte_mercat_service.get_conte_mercat_by_id(product_id)
        if product is None:
            raise HTTPException(
                status_code=404,
                detail="No s'ha trobat el producte del mercat",
            )
        return product

    @staticmethod
    def _get_unit_amount(price: object, low_price_detail: str) -> int:
        try:
            unit_price = Decimal(str(price))
        except (DecimalException, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail="El preu del producte no és vàlid",
            ) from exc

        if not unit_price.is_finite() or unit_price <= 0:
            raise HTTPException(
                status_code=400,
                detail="El preu del producte no és vàlid",
            )

        unit_amount = int(
            (unit_price * 100).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )

        if unit_amount < 1:
            raise HTTPException(status_code=400, detail=low_price_detail)

        return unit_amount

    async def create_payment_sheet(self, body: PaymentRequest) -> dict:
        self._require_stripe_key()
        product = await self._get_product(body.productId)
        unit_amount = self._get_unit_amount(
            product.price,
            "El preu és massa baix per processar el pagament",
        )

        try:
            # Stripe rep l'import en cèntims.
            total_amount = unit_amount * body.quantity

            customer = stripe.Customer.create()

            ephemeral_key = stripe.EphemeralKey.create(
                customer=customer.id,
                stripe_version="2025-03-31.basil",
            )

            intent = stripe.PaymentIntent.create(
                amount=total_amount,
                currency="eur",
                customer=customer.id,
                automatic_payment_methods={"enabled": True},
                metadata={
                    "product_id": str(body.productId),
                    "quantity": str(body.quantity),
                },
            )

            return {
                "paymentIntent": intent.client_secret,
                "ephemeralKey": ephemeral_key.secret,
                "customer": customer.id,
                "amount": total_amount,
                "currency": "eur",
            }

        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=502,
                detail="Stripe no ha pogut preparar el pagament",
            ) from exc

    async def create_checkout_session(self, body: PaymentRequest) -> dict:
        self._require_stripe_key()
        product = await self._get_product(body.productId)
        unit_amount = self._get_unit_amount(
            product.price,
            "El preu del producte no és vàlid",
        )

        try:
            success_url = os.getenv("STRIPE_SUCCESS_URL")
            cancel_url = os.getenv("STRIPE_CANCEL_URL")

            if not success_url or not cancel_url:
                raise HTTPException(
                    status_code=500,
                    detail="Falten les URLs de retorn de Stripe",
                )

            session = stripe.checkout.Session.create(
                mode="payment",
                line_items=[
                    {
                        "quantity": body.quantity,
                        "price_data": {
                            "currency": "eur",
                            "unit_amount": unit_amount,
                            "product_data": {
                                "name": str(product.product),
                            },
                        },
                    }
                ],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "product_id": str(body.productId),
                    "quantity": str(body.quantity),
                },
            )

            if not session.url:
                raise HTTPException(
                    status_code=502,
                    detail="Stripe no ha retornat cap URL",
                )

            return {"url": session.url}

        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=502,
                detail="No s'ha pogut crear la sessió de Stripe",
            ) from exc
