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
    def _to_decimal(value: object, error_message: str) -> Decimal:
        try:
            result = Decimal(str(value))
        except (DecimalException, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=error_message,
            ) from exc

        if not result.is_finite():
            raise HTTPException(
                status_code=400,
                detail=error_message,
            )

        return result

    @classmethod
    def _get_total_amount(
        cls,
        unit_price: object,
        quantity: Decimal,
    ) -> int:
        """
        Calcula l'import total en cèntims.

        Exemple:
            2.50 €/kg * 1.25 kg = 3.125 €
            Import Stripe = 313 cèntims
        """
        price = cls._to_decimal(
            unit_price,
            "El preu del producte no és vàlid",
        )

        if price <= 0:
            raise HTTPException(
                status_code=400,
                detail="El preu del producte no és vàlid",
            )

        if not quantity.is_finite() or quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="La quantitat ha de ser superior a zero",
            )

        total = (price * quantity * Decimal("100")).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

        total_amount = int(total)

        if total_amount < 1:
            raise HTTPException(
                status_code=400,
                detail=("L'import total és massa baix per processar el pagament"),
            )

        return total_amount

    @staticmethod
    def _format_quantity(quantity: Decimal) -> str:
        return format(quantity.normalize(), "f")

    @staticmethod
    def _get_product_name(product) -> str:
        return str(product.product)

    def _get_payment_metadata(
        self,
        body: PaymentRequest,
    ) -> dict:
        return {
            "product_id": str(body.productId),
            "quantity": self._format_quantity(body.quantity),
            "unit": "kg",
        }

    async def create_payment_sheet(self, body: PaymentRequest) -> dict:
        self._require_stripe_key()

        product = await self._get_product(body.productId)

        total_amount = self._get_total_amount(
            product.price,
            body.quantity,
        )

        try:
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
                metadata=self._get_payment_metadata(body),
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

        total_amount = self._get_total_amount(
            product.price,
            body.quantity,
        )

        try:
            success_url = os.getenv("STRIPE_SUCCESS_URL")
            cancel_url = os.getenv("STRIPE_CANCEL_URL")

            if not success_url or not cancel_url:
                raise HTTPException(
                    status_code=500,
                    detail="Falten les URLs de retorn de Stripe",
                )

            quantity_text = self._format_quantity(body.quantity)
            product_name = self._get_product_name(product)

            session = stripe.checkout.Session.create(
                mode="payment",
                line_items=[
                    {
                        # Stripe Checkout no admet quantitats decimals.
                        # Enviem el total com una sola unitat.
                        "quantity": 1,
                        "price_data": {
                            "currency": "eur",
                            "unit_amount": total_amount,
                            "product_data": {
                                "name": product_name,
                                "description": (f"Quantitat: {quantity_text} kg"),
                            },
                        },
                    }
                ],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=self._get_payment_metadata(body),
            )

            if not session.url:
                raise HTTPException(
                    status_code=502,
                    detail="Stripe no ha retornat cap URL",
                )

            return {
                "url": session.url,
                "amount": total_amount,
                "currency": "eur",
            }

        except stripe.StripeError as exc:
            raise HTTPException(
                status_code=502,
                detail="No s'ha pogut crear la sessió de Stripe",
            ) from exc
