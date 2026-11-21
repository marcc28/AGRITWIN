import os
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")

import pytest

from api.v1 import payments
from models.payments import PaymentRequest


@pytest.mark.asyncio
async def test_payment_routes_delegate_to_the_service():
    service = AsyncMock()
    body = PaymentRequest(productId=uuid4(), quantity=2)
    service.create_payment_sheet.return_value = {"paymentIntent": "pi_secret"}
    service.create_checkout_session.return_value = {"url": "https://stripe.test"}

    assert await payments.create_payment_sheet(body, service) == {"paymentIntent": "pi_secret"}
    assert await payments.create_checkout_session(body, service) == {"url": "https://stripe.test"}

    service.create_payment_sheet.assert_awaited_once_with(body)
    service.create_checkout_session.assert_awaited_once_with(body)


@pytest.mark.asyncio
async def test_payment_service_dependency_uses_and_closes_database_session(monkeypatch):
    session = object()
    market_service = object()
    payment_service = object()
    events = []

    @asynccontextmanager
    async def session_context():
        events.append("open")
        try:
            yield session
        finally:
            events.append("close")

    monkeypatch.setattr(payments, "AsyncSessionLocal", session_context)
    monkeypatch.setattr(payments, "ConteMercatService", lambda session: market_service)
    monkeypatch.setattr(
        payments,
        "PaymentService",
        lambda conte_mercat_service: payment_service,
    )

    dependency = payments.get_payment_service()
    assert await anext(dependency) is payment_service
    assert events == ["open"]

    await dependency.aclose()
    assert events == ["open", "close"]
