from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
import stripe
from fastapi import HTTPException

from models.payments import PaymentRequest
from services.payment_service import PaymentService


@pytest.fixture
def product():
    return SimpleNamespace(id=uuid4(), product="Tomata", price=Decimal("12.34"))


@pytest.fixture
def market_service(product):
    from unittest.mock import AsyncMock

    service = AsyncMock()
    service.get_conte_mercat_by_id.return_value = product
    return service


@pytest.fixture
def payment_service(monkeypatch, market_service):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_key")
    monkeypatch.setattr(stripe, "api_key", None)
    return PaymentService(market_service)


def test_payment_request_validates_uuid_and_quantity():
    product_id = uuid4()
    request = PaymentRequest(productId=product_id, quantity=2)

    assert request.productId == product_id
    assert request.quantity == 2

    for quantity in (0, 21):
        with pytest.raises(ValueError):
            PaymentRequest(productId=product_id, quantity=quantity)

    with pytest.raises(ValueError):
        PaymentRequest(productId="not-a-uuid", quantity=1)


@pytest.mark.asyncio
async def test_payment_sheet_creates_customer_intent_and_ephemeral_key(
    payment_service, product, monkeypatch
):
    customer = SimpleNamespace(id="cus_123")
    ephemeral_key = SimpleNamespace(secret="ek_secret")
    intent = SimpleNamespace(client_secret="pi_secret")
    monkeypatch.setattr(stripe.Customer, "create", lambda: customer)
    monkeypatch.setattr(
        stripe.EphemeralKey,
        "create",
        lambda **kwargs: ephemeral_key,
    )
    monkeypatch.setattr(
        stripe.PaymentIntent,
        "create",
        lambda **kwargs: intent,
    )

    result = await payment_service.create_payment_sheet(
        PaymentRequest(productId=product.id, quantity=3)
    )

    assert result == {
        "paymentIntent": "pi_secret",
        "ephemeralKey": "ek_secret",
        "customer": "cus_123",
        "amount": 3702,
        "currency": "eur",
    }
    assert product.price == Decimal("12.34")


@pytest.mark.asyncio
async def test_checkout_session_uses_product_price_and_return_urls(
    payment_service, product, monkeypatch
):
    monkeypatch.setenv("STRIPE_SUCCESS_URL", "https://app.test/success")
    monkeypatch.setenv("STRIPE_CANCEL_URL", "https://app.test/cancel")
    created = {}

    def create_session(**kwargs):
        created.update(kwargs)
        return SimpleNamespace(url="https://checkout.stripe.test/session")

    monkeypatch.setattr(stripe.checkout.Session, "create", create_session)

    result = await payment_service.create_checkout_session(
        PaymentRequest(productId=product.id, quantity=2)
    )

    assert result == {"url": "https://checkout.stripe.test/session"}
    assert created["line_items"] == [
        {
            "quantity": 2,
            "price_data": {
                "currency": "eur",
                "unit_amount": 1234,
                "product_data": {"name": "Tomata"},
            },
        }
    ]
    assert created["success_url"] == "https://app.test/success"
    assert created["cancel_url"] == "https://app.test/cancel"
    assert created["metadata"] == {
        "product_id": str(product.id),
        "quantity": "2",
    }


@pytest.mark.asyncio
async def test_rejects_missing_stripe_key(monkeypatch, market_service):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.setattr(stripe, "api_key", None)
    service = PaymentService(market_service)

    with pytest.raises(HTTPException) as exc:
        await service.create_payment_sheet(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Falta STRIPE_SECRET_KEY"
    market_service.get_conte_mercat_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_rejects_unknown_product(payment_service, market_service):
    market_service.get_conte_mercat_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "No s'ha trobat el producte del mercat"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "price,expected_detail",
    [
        (0, "El preu del producte no és vàlid"),
        (Decimal("NaN"), "El preu del producte no és vàlid"),
        ("invalid", "El preu del producte no és vàlid"),
        (Decimal("0.004"), "El preu és massa baix per processar el pagament"),
    ],
)
async def test_payment_sheet_rejects_invalid_prices(
    payment_service, product, price, expected_detail
):
    product.price = price

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(productId=product.id, quantity=1)
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == expected_detail


@pytest.mark.asyncio
async def test_checkout_requires_return_urls(payment_service, monkeypatch):
    monkeypatch.delenv("STRIPE_SUCCESS_URL", raising=False)
    monkeypatch.delenv("STRIPE_CANCEL_URL", raising=False)

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Falten les URLs de retorn de Stripe"


@pytest.mark.asyncio
async def test_checkout_requires_stripe_to_return_a_url(
    payment_service, monkeypatch
):
    monkeypatch.setenv("STRIPE_SUCCESS_URL", "https://app.test/success")
    monkeypatch.setenv("STRIPE_CANCEL_URL", "https://app.test/cancel")
    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        lambda **kwargs: SimpleNamespace(url=None),
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Stripe no ha retornat cap URL"


@pytest.mark.asyncio
async def test_stripe_errors_are_returned_as_gateway_errors(
    payment_service, monkeypatch
):
    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda: (_ for _ in ()).throw(stripe.StripeError("unavailable")),
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Stripe no ha pogut preparar el pagament"


@pytest.mark.asyncio
async def test_checkout_stripe_errors_are_returned_as_gateway_errors(
    payment_service, monkeypatch
):
    monkeypatch.setenv("STRIPE_SUCCESS_URL", "https://app.test/success")
    monkeypatch.setenv("STRIPE_CANCEL_URL", "https://app.test/cancel")
    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        lambda **kwargs: (_ for _ in ()).throw(stripe.StripeError("unavailable")),
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(productId=uuid4(), quantity=1)
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "No s'ha pogut crear la sessió de Stripe"
