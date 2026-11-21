from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
import stripe
from fastapi import HTTPException

from models.payments import PaymentRequest
from services.payment_service import PaymentService

# ---------------------------------------------------------
# Fixtures
# ---------------------------------------------------------


@pytest.fixture
def product():
    return SimpleNamespace(
        id=uuid4(),
        product="Tomata",
        price=Decimal("12.34"),
    )


@pytest.fixture
def market_service(product):
    service = AsyncMock()
    service.get_conte_mercat_by_id.return_value = product
    return service


@pytest.fixture
def payment_service(monkeypatch, market_service):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_key")
    monkeypatch.setattr(stripe, "api_key", None)

    return PaymentService(market_service)


@pytest.fixture
def stripe_urls(monkeypatch):
    monkeypatch.setenv(
        "STRIPE_SUCCESS_URL",
        "https://app.test/success",
    )
    monkeypatch.setenv(
        "STRIPE_CANCEL_URL",
        "https://app.test/cancel",
    )


# ---------------------------------------------------------
# PaymentRequest validation
# ---------------------------------------------------------


def test_payment_request_validates_uuid_and_quantity():
    product_id = uuid4()

    request = PaymentRequest(
        productId=product_id,
        quantity=Decimal("2.50"),
    )

    assert request.productId == product_id
    assert request.quantity == Decimal("2.50")

    for quantity in (0, -1):
        with pytest.raises(ValueError):
            PaymentRequest(
                productId=product_id,
                quantity=quantity,
            )

    with pytest.raises(ValueError):
        PaymentRequest(
            productId=product_id,
            quantity="1.001",
        )

    with pytest.raises(ValueError):
        PaymentRequest(
            productId="not-a-uuid",
            quantity=1,
        )


# ---------------------------------------------------------
# Decimal calculations
# ---------------------------------------------------------


@pytest.mark.parametrize(
    "price, quantity, expected",
    [
        (Decimal("12.34"), Decimal("3"), 3702),
        (Decimal("12.34"), Decimal("2.50"), 3085),
        (Decimal("2.50"), Decimal("1.25"), 313),
        (Decimal("10.00"), Decimal("0.50"), 500),
        (Decimal("1.00"), Decimal("0.01"), 1),
        (Decimal("0.005"), Decimal("1"), 1),
    ],
)
def test_get_total_amount_calculates_cents(
    price,
    quantity,
    expected,
):
    result = PaymentService._get_total_amount(price, quantity)

    assert result == expected


@pytest.mark.parametrize(
    "price",
    [
        0,
        -1,
        Decimal("NaN"),
        Decimal("Infinity"),
        Decimal("-Infinity"),
        "invalid",
        None,
    ],
)
def test_get_total_amount_rejects_invalid_prices(price):
    with pytest.raises(HTTPException) as exc:
        PaymentService._get_total_amount(
            price,
            Decimal("1"),
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == ("El preu del producte no és vàlid")


@pytest.mark.parametrize(
    "quantity",
    [
        Decimal("0"),
        Decimal("-1"),
        Decimal("NaN"),
        Decimal("Infinity"),
        Decimal("-Infinity"),
    ],
)
def test_get_total_amount_rejects_invalid_quantities(quantity):
    with pytest.raises(HTTPException) as exc:
        PaymentService._get_total_amount(
            Decimal("10"),
            quantity,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == ("La quantitat ha de ser superior a zero")


def test_get_total_amount_rejects_amount_below_one_cent():
    with pytest.raises(HTTPException) as exc:
        PaymentService._get_total_amount(
            Decimal("0.004"),
            Decimal("1"),
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == ("L'import total és massa baix per processar el pagament")


def test_format_quantity():
    assert PaymentService._format_quantity(Decimal("2.00")) == "2"

    assert PaymentService._format_quantity(Decimal("1.50")) == "1.5"

    assert PaymentService._format_quantity(Decimal("1.25")) == "1.25"


def test_get_product_name(product):
    assert PaymentService._get_product_name(product) == "Tomata"


def test_get_payment_metadata(payment_service, product):
    body = PaymentRequest(
        productId=product.id,
        quantity=Decimal("1.50"),
    )

    assert payment_service._get_payment_metadata(body) == {
        "product_id": str(product.id),
        "quantity": "1.5",
        "unit": "kg",
    }


# ---------------------------------------------------------
# Payment Sheet
# ---------------------------------------------------------


@pytest.mark.asyncio
async def test_payment_sheet_creates_customer_intent_and_ephemeral_key(
    payment_service,
    product,
    monkeypatch,
):
    customer = SimpleNamespace(id="cus_123")
    ephemeral_key = SimpleNamespace(secret="ek_secret")
    intent = SimpleNamespace(client_secret="pi_secret")

    calls = {}

    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda: customer,
    )

    def create_ephemeral_key(**kwargs):
        calls["ephemeral_key"] = kwargs
        return ephemeral_key

    def create_intent(**kwargs):
        calls["intent"] = kwargs
        return intent

    monkeypatch.setattr(
        stripe.EphemeralKey,
        "create",
        create_ephemeral_key,
    )

    monkeypatch.setattr(
        stripe.PaymentIntent,
        "create",
        create_intent,
    )

    result = await payment_service.create_payment_sheet(
        PaymentRequest(
            productId=product.id,
            quantity=3,
        )
    )

    assert result == {
        "paymentIntent": "pi_secret",
        "ephemeralKey": "ek_secret",
        "customer": "cus_123",
        "amount": 3702,
        "currency": "eur",
    }

    assert calls["ephemeral_key"] == {
        "customer": "cus_123",
        "stripe_version": "2025-03-31.basil",
    }

    assert calls["intent"] == {
        "amount": 3702,
        "currency": "eur",
        "customer": "cus_123",
        "automatic_payment_methods": {"enabled": True},
        "metadata": {
            "product_id": str(product.id),
            "quantity": "3",
            "unit": "kg",
        },
    }


@pytest.mark.asyncio
async def test_payment_sheet_supports_decimal_quantities(
    payment_service,
    product,
    monkeypatch,
):
    customer = SimpleNamespace(id="cus_123")
    ephemeral_key = SimpleNamespace(secret="ek_secret")
    intent = SimpleNamespace(client_secret="pi_secret")

    captured = {}

    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda: customer,
    )

    monkeypatch.setattr(
        stripe.EphemeralKey,
        "create",
        lambda **kwargs: ephemeral_key,
    )

    def create_intent(**kwargs):
        captured.update(kwargs)
        return intent

    monkeypatch.setattr(
        stripe.PaymentIntent,
        "create",
        create_intent,
    )

    await payment_service.create_payment_sheet(
        PaymentRequest(
            productId=product.id,
            quantity=Decimal("1.25"),
        )
    )

    assert captured["amount"] == 1543
    assert captured["metadata"] == {
        "product_id": str(product.id),
        "quantity": "1.25",
        "unit": "kg",
    }


# ---------------------------------------------------------
# Checkout Session
# ---------------------------------------------------------


@pytest.mark.asyncio
async def test_checkout_session_uses_total_amount_and_return_urls(
    payment_service,
    product,
    monkeypatch,
    stripe_urls,
):
    created = {}

    def create_session(**kwargs):
        created.update(kwargs)
        return SimpleNamespace(
            url="https://checkout.stripe.test/session",
        )

    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        create_session,
    )

    result = await payment_service.create_checkout_session(
        PaymentRequest(
            productId=product.id,
            quantity=2,
        )
    )

    assert result == {
        "url": "https://checkout.stripe.test/session",
        "amount": 2468,
        "currency": "eur",
    }

    assert created["mode"] == "payment"

    assert created["line_items"] == [
        {
            "quantity": 1,
            "price_data": {
                "currency": "eur",
                "unit_amount": 2468,
                "product_data": {
                    "name": "Tomata",
                    "description": "Quantitat: 2 kg",
                },
            },
        }
    ]

    assert created["success_url"] == "https://app.test/success"
    assert created["cancel_url"] == "https://app.test/cancel"

    assert created["metadata"] == {
        "product_id": str(product.id),
        "quantity": "2",
        "unit": "kg",
    }


@pytest.mark.asyncio
async def test_checkout_session_supports_decimal_quantities(
    payment_service,
    product,
    monkeypatch,
    stripe_urls,
):
    created = {}

    def create_session(**kwargs):
        created.update(kwargs)
        return SimpleNamespace(
            url="https://checkout.stripe.test/session",
        )

    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        create_session,
    )

    result = await payment_service.create_checkout_session(
        PaymentRequest(
            productId=product.id,
            quantity=Decimal("1.25"),
        )
    )

    assert result == {
        "url": "https://checkout.stripe.test/session",
        "amount": 1543,
        "currency": "eur",
    }

    item = created["line_items"][0]

    assert item["quantity"] == 1
    assert item["price_data"]["unit_amount"] == 1543

    assert item["price_data"]["product_data"] == {
        "name": "Tomata",
        "description": "Quantitat: 1.25 kg",
    }

    assert created["metadata"]["quantity"] == "1.25"
    assert created["metadata"]["unit"] == "kg"


# ---------------------------------------------------------
# Product and API validation errors
# ---------------------------------------------------------


@pytest.mark.asyncio
async def test_rejects_missing_stripe_key(
    monkeypatch,
    market_service,
):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.setattr(stripe, "api_key", None)

    service = PaymentService(market_service)

    with pytest.raises(HTTPException) as exc:
        await service.create_payment_sheet(
            PaymentRequest(
                productId=uuid4(),
                quantity=1,
            )
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Falta STRIPE_SECRET_KEY"

    market_service.get_conte_mercat_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_rejects_unknown_product(
    payment_service,
    market_service,
):
    market_service.get_conte_mercat_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(
                productId=uuid4(),
                quantity=1,
            )
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == ("No s'ha trobat el producte del mercat")


@pytest.mark.asyncio
async def test_payment_sheet_rejects_invalid_product_price(
    payment_service,
    product,
):
    product.price = Decimal("0.004")

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == ("L'import total és massa baix per processar el pagament")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "success_url,cancel_url",
    [
        (None, None),
        ("https://app.test/success", None),
        (None, "https://app.test/cancel"),
    ],
)
async def test_checkout_requires_return_urls(
    payment_service,
    product,
    monkeypatch,
    success_url,
    cancel_url,
):
    if success_url is None:
        monkeypatch.delenv(
            "STRIPE_SUCCESS_URL",
            raising=False,
        )
    else:
        monkeypatch.setenv(
            "STRIPE_SUCCESS_URL",
            success_url,
        )

    if cancel_url is None:
        monkeypatch.delenv(
            "STRIPE_CANCEL_URL",
            raising=False,
        )
    else:
        monkeypatch.setenv(
            "STRIPE_CANCEL_URL",
            cancel_url,
        )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == ("Falten les URLs de retorn de Stripe")


@pytest.mark.asyncio
async def test_checkout_requires_stripe_to_return_a_url(
    payment_service,
    product,
    monkeypatch,
    stripe_urls,
):
    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        lambda **kwargs: SimpleNamespace(url=None),
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Stripe no ha retornat cap URL"


# ---------------------------------------------------------
# Stripe errors
# ---------------------------------------------------------


@pytest.mark.asyncio
async def test_customer_stripe_errors_are_gateway_errors(
    payment_service,
    product,
    monkeypatch,
):
    def raise_stripe_error():
        raise stripe.StripeError("unavailable")

    monkeypatch.setattr(
        stripe.Customer,
        "create",
        raise_stripe_error,
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == ("Stripe no ha pogut preparar el pagament")


@pytest.mark.asyncio
async def test_ephemeral_key_stripe_errors_are_gateway_errors(
    payment_service,
    product,
    monkeypatch,
):
    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda: SimpleNamespace(id="cus_123"),
    )

    def raise_stripe_error(**kwargs):
        raise stripe.StripeError("unavailable")

    monkeypatch.setattr(
        stripe.EphemeralKey,
        "create",
        raise_stripe_error,
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == ("Stripe no ha pogut preparar el pagament")


@pytest.mark.asyncio
async def test_payment_intent_stripe_errors_are_gateway_errors(
    payment_service,
    product,
    monkeypatch,
):
    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda: SimpleNamespace(id="cus_123"),
    )

    monkeypatch.setattr(
        stripe.EphemeralKey,
        "create",
        lambda **kwargs: SimpleNamespace(secret="ek_secret"),
    )

    def raise_stripe_error(**kwargs):
        raise stripe.StripeError("unavailable")

    monkeypatch.setattr(
        stripe.PaymentIntent,
        "create",
        raise_stripe_error,
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_payment_sheet(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == ("Stripe no ha pogut preparar el pagament")


@pytest.mark.asyncio
async def test_checkout_stripe_errors_are_gateway_errors(
    payment_service,
    product,
    monkeypatch,
    stripe_urls,
):
    def raise_stripe_error(**kwargs):
        raise stripe.StripeError("unavailable")

    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        raise_stripe_error,
    )

    with pytest.raises(HTTPException) as exc:
        await payment_service.create_checkout_session(
            PaymentRequest(
                productId=product.id,
                quantity=1,
            )
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == ("No s'ha pogut crear la sessió de Stripe")
