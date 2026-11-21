from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.v1 import anunces


@pytest.fixture
def service():
    return AsyncMock()


@pytest.mark.asyncio
async def test_list_search_count_and_get_anunces(service):
    item = SimpleNamespace(id=uuid4())
    service.list_anunces.return_value = [item]
    service.get_anunces_by_title.return_value = [item]
    service.count_anunces.return_value = 4
    service.get_anunce_by_id.return_value = item

    assert await anunces.list_anunces(offset=5, limit=2, service=service) == [item]
    assert await anunces.search_anunces(title="tomata", service=service) == [item]
    assert await anunces.count_anunces(service=service) == {"total": 4}
    assert await anunces.get_anunce(id=item.id, service=service) is item

    service.list_anunces.assert_awaited_once_with(offset=5, limit=2)
    service.get_anunces_by_title.assert_awaited_once_with("tomata")
    service.get_anunce_by_id.assert_awaited_once_with(item.id)


@pytest.mark.asyncio
async def test_get_missing_anunce_returns_404(service):
    service.get_anunce_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        await anunces.get_anunce(id=uuid4(), service=service)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Anunce not found"


@pytest.mark.asyncio
async def test_create_anunce_without_image(service):
    item = SimpleNamespace(id=uuid4())
    service.create_anunce.return_value = item

    result = await anunces.create_anunce(
        title="Notícia",
        subtile="Subtítol",
        agent="AgriTwin",
        content="Contingut",
        image=None,
        service=service,
    )

    assert result is item
    service.create_anunce.assert_awaited_once_with(
        title="Notícia",
        subtile="Subtítol",
        agent="AgriTwin",
        content="Contingut",
    )
    service.update_image_url.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_anunce_uploads_image_and_saves_public_url(service, monkeypatch):
    item = SimpleNamespace(id=uuid4())
    image = object()
    service.create_anunce.return_value = item
    service.update_image_url.return_value = item

    class Storage:
        async def upload_anunce_image(self, file, anunce_id):
            assert file is image
            assert anunce_id == item.id
            return "news/photo.png"

        def get_anunce_image_url(self, path):
            assert path == "news/photo.png"
            return "https://cdn.test/news.png"

    monkeypatch.setattr(anunces, "SupabaseService", Storage)

    result = await anunces.create_anunce(
        title="Notícia",
        subtile=None,
        agent=None,
        content=None,
        image=image,
        service=service,
    )

    assert result is item
    service.update_image_url.assert_awaited_once_with(
        anunce_id=item.id,
        image_url="https://cdn.test/news.png",
    )


@pytest.mark.asyncio
async def test_create_anunce_rolls_back_when_image_upload_fails(service, monkeypatch):
    item = SimpleNamespace(id=uuid4())
    service.create_anunce.return_value = item
    service._db = AsyncMock()

    class Storage:
        async def upload_anunce_image(self, **kwargs):
            raise RuntimeError("storage unavailable")

    monkeypatch.setattr(anunces, "SupabaseService", Storage)

    with pytest.raises(HTTPException) as exc:
        await anunces.create_anunce(
            title="Notícia",
            subtile=None,
            agent=None,
            content=None,
            image=object(),
            service=service,
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Error en pujar o guardar la imatge de l'anunci"
    service._db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_anunce_delegates_to_service(service):
    item_id = uuid4()

    assert await anunces.delete_anunce(id=item_id, service=service) is None
    service.delete_anunce.assert_awaited_once_with(item_id)


@pytest.mark.asyncio
async def test_anunce_service_dependency_closes_session(monkeypatch):
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

    monkeypatch.setattr(anunces, "AsyncSessionLocal", session_context)
    monkeypatch.setattr(anunces, "AnunceService", lambda session: service)

    dependency = anunces.get_anunce_service()
    assert await anext(dependency) is service
    assert events == ["open"]
    await dependency.aclose()
    assert events == ["open", "close"]
