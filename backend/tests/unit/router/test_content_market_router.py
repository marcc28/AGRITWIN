from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.v1 import content_market


@pytest.fixture
def service():
    return AsyncMock()


@pytest.mark.asyncio
async def test_list_count_search_and_get_products(service):
    product = SimpleNamespace(id=uuid4())
    service.list_conte_mercat.return_value = [product]
    service.count_content_market.return_value = 8
    service.get_conte_mercat_by_product.return_value = [product]
    service.get_conte_mercat_by_id.return_value = product

    assert await content_market.get_conte_mercat(offset=10, limit=4, service=service) == [product]
    assert await content_market.count_content_market(service=service) == {"total": 8}
    assert await content_market.search_conte_mercat(product="patata", service=service) == [product]
    assert (
        await content_market.get_conte_mercat_by_id(conte_mercat_id=product.id, service=service)
        is product
    )

    service.list_conte_mercat.assert_awaited_once_with(offset=10, limit=4)
    service.get_conte_mercat_by_product.assert_awaited_once_with("patata")


@pytest.mark.asyncio
async def test_get_missing_product_returns_404(service):
    service.get_conte_mercat_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        await content_market.get_conte_mercat_by_id(conte_mercat_id=uuid4(), service=service)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Conte mercat not found"


@pytest.mark.asyncio
async def test_create_product_without_image(service):
    product = SimpleNamespace(id=uuid4())
    service.create_conte_mercat.return_value = product

    result = await content_market.create_conte_mercat(
        product="Tomata",
        tecnical_name="Solanum lycopersicum",
        price=2.5,
        price_per_kg=2.5,
        left_units=7,
        image=None,
        service=service,
    )

    assert result is product
    service.create_conte_mercat.assert_awaited_once_with(
        product="Tomata",
        tecnical_name="Solanum lycopersicum",
        price=2.5,
        price_per_kg=2.5,
        left_units=7,
    )


@pytest.mark.asyncio
async def test_create_product_uploads_image_and_persists_url(service, monkeypatch):
    product = SimpleNamespace(id=uuid4(), image_url=None)
    image = object()
    service.create_conte_mercat.return_value = product
    service._db = AsyncMock()

    class Storage:
        async def upload_product_image(self, file, product_id):
            assert file is image
            assert product_id == product.id
            return "products/tomata.png"

        def get_product_image_url(self, path):
            assert path == "products/tomata.png"
            return "https://cdn.test/tomata.png"

    monkeypatch.setattr(content_market, "SupabaseService", Storage)

    result = await content_market.create_conte_mercat(
        product="Tomata",
        tecnical_name=None,
        price=2.5,
        price_per_kg=None,
        left_units=1,
        image=image,
        service=service,
    )

    assert result is product
    assert product.image_url == "https://cdn.test/tomata.png"
    service._db.commit.assert_awaited_once()
    service._db.refresh.assert_awaited_once_with(product)


@pytest.mark.asyncio
async def test_create_product_rolls_back_on_image_error(service, monkeypatch):
    product = SimpleNamespace(id=uuid4())
    service.create_conte_mercat.return_value = product
    service._db = AsyncMock()

    class Storage:
        async def upload_product_image(self, **kwargs):
            raise RuntimeError("storage unavailable")

    monkeypatch.setattr(content_market, "SupabaseService", Storage)

    with pytest.raises(HTTPException) as exc:
        await content_market.create_conte_mercat(
            product="Tomata",
            tecnical_name=None,
            price=2.5,
            price_per_kg=None,
            left_units=1,
            image=object(),
            service=service,
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Error en pujar o guardar la imatge del producte"
    service._db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_content_market_service_dependency_closes_session(monkeypatch):
    session = object()
    service = object()
    events = []

    @asynccontextmanager
    async def session_context():
        events.append("open")
        try:
            yield session
        finally:
            events.append("close")

    monkeypatch.setattr(content_market, "AsyncSessionLocal", session_context)
    monkeypatch.setattr(
        content_market,
        "ConteMercatService",
        lambda session: service,
    )

    dependency = content_market.get_conte_mercat_service()
    assert await anext(dependency) is service
    assert events == ["open"]
    await dependency.aclose()
    assert events == ["open", "close"]
