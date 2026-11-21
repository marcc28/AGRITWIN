from contextlib import asynccontextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from api.v1.crops import (
    count_crops,
    create_crop,
    delete_crop,
    get_crop_by_id,
    get_crop_service,
    get_crops,
    search_crops,
    update_crop,
)
from models.crops import CropCreate, CropUpdate


@pytest.fixture
def service():
    return AsyncMock()


@pytest.fixture
def crop():
    return SimpleNamespace(
        id=4,
        name="Ordi",
        scientific_name="Hordeum vulgare",
        category="cereal",
        created_at=datetime(2026, 1, 2, tzinfo=UTC),
    )


@pytest.mark.asyncio
async def test_list_count_and_search_crops(service, crop):
    service.list_crops.return_value = [crop]
    service.count_crops.return_value = 1
    service.search_crops.return_value = [crop]

    assert await get_crops(3, 5, service) == [crop]
    service.list_crops.assert_awaited_once_with(3, 5)
    assert await count_crops(service) == {"total": 1}
    service.count_crops.assert_awaited_once()
    assert await search_crops("ord", service) == [crop]
    service.search_crops.assert_awaited_once_with("ord")


@pytest.mark.asyncio
async def test_get_crop_by_id_returns_crop_or_404(service, crop):
    service.get_crop_by_id.return_value = crop
    assert await get_crop_by_id(4, service) is crop
    service.get_crop_by_id.return_value = None
    with pytest.raises(HTTPException) as error:
        await get_crop_by_id(404, service)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_create_crop_returns_created_crop(service, crop):
    service.create_crop.return_value = crop
    payload = CropCreate(name="Ordi", scientific_name="Hordeum vulgare", category="cereal")
    assert await create_crop(payload, service) is crop
    service.create_crop.assert_awaited_once_with(
        name="Ordi", scientific_name="Hordeum vulgare", category="cereal"
    )


@pytest.mark.asyncio
async def test_create_crop_maps_value_error_to_conflict(service):
    service.create_crop.side_effect = ValueError("duplicate")
    with pytest.raises(HTTPException) as error:
        await create_crop(CropCreate(name="Ordi"), service)
    assert error.value.status_code == 409
    assert error.value.detail == "duplicate"


@pytest.mark.asyncio
async def test_update_crop_covers_success_missing_and_conflict(service, crop):
    service.update_crop.return_value = crop
    payload = CropUpdate(category="grain")
    assert await update_crop(4, payload, service) is crop
    service.update_crop.assert_awaited_once_with(4, {"category": "grain"})

    service.update_crop.return_value = None
    with pytest.raises(HTTPException) as missing:
        await update_crop(404, payload, service)
    assert missing.value.status_code == 404

    service.update_crop.side_effect = ValueError("duplicate")
    with pytest.raises(HTTPException) as conflict:
        await update_crop(4, payload, service)
    assert conflict.value.status_code == 409


@pytest.mark.asyncio
async def test_delete_crop_covers_success_missing_and_conflict(service):
    service.delete_crop.return_value = True
    assert await delete_crop(4, service) is None

    service.delete_crop.return_value = False
    with pytest.raises(HTTPException) as missing:
        await delete_crop(404, service)
    assert missing.value.status_code == 404

    service.delete_crop.side_effect = ValueError("associated")
    with pytest.raises(HTTPException) as conflict:
        await delete_crop(4, service)
    assert conflict.value.status_code == 409


@pytest.mark.asyncio
async def test_crop_service_dependency_closes_session(monkeypatch):
    from api.v1 import crops as crops_router

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

    monkeypatch.setattr(crops_router, "AsyncSessionLocal", session_context)
    monkeypatch.setattr(crops_router, "CropService", lambda session: service)
    dependency = get_crop_service()
    assert await anext(dependency) is service
    assert events == ["open"]
    await dependency.aclose()
    assert events == ["open", "close"]
