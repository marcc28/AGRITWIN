from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import IntegrityError

from services.crops_service import CropService


def result(*, rows=None, one=None, scalar=0):
    value = Mock()
    value.scalars.return_value.all.return_value = rows or []
    value.scalar_one_or_none.return_value = one
    value.scalar_one.return_value = scalar
    return value


@pytest.fixture
def db():
    session = Mock()
    session.execute = AsyncMock()
    session.add = Mock()
    session.delete = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def service(db):
    return CropService(db)


@pytest.mark.asyncio
async def test_list_get_search_and_count(service, db):
    crops = [SimpleNamespace(id=1, name="Ordi")]
    db.execute.side_effect = [
        result(rows=crops),
        result(one=crops[0]),
        result(rows=crops),
        result(scalar=1),
    ]

    assert await service.list_crops(offset=5, limit=10) == crops
    assert await service.get_crop_by_id(1) is crops[0]
    assert await service.search_crops("ord") == crops
    assert await service.count_crops() == 1
    assert db.execute.await_count == 4


@pytest.mark.asyncio
async def test_get_crop_by_id_returns_none(service, db):
    db.execute.return_value = result(one=None)
    assert await service.get_crop_by_id(404) is None


@pytest.mark.asyncio
async def test_create_crop_saves_and_refreshes(service, db):
    crop = await service.create_crop("Ordi", "Hordeum vulgare", "cereal")
    assert crop.name == "Ordi"
    assert crop.scientific_name == "Hordeum vulgare"
    assert crop.category == "cereal"
    db.add.assert_called_once_with(crop)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(crop)


@pytest.mark.asyncio
async def test_create_crop_rolls_back_integrity_error(service, db):
    db.commit.side_effect = IntegrityError("insert", {}, Exception("duplicate"))
    with pytest.raises(ValueError, match="Cannot delete this crop"):
        await service.create_crop("Ordi")
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_crop_saves_changes(service, db):
    crop = SimpleNamespace(id=1, name="Ordi")
    db.execute.return_value = result(one=crop)
    assert await service.update_crop(1, {"name": "Blat"}) is crop
    assert crop.name == "Blat"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(crop)


@pytest.mark.asyncio
async def test_update_crop_returns_none_when_missing(service, db):
    db.execute.return_value = result(one=None)
    assert await service.update_crop(99, {"name": "Blat"}) is None
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_crop_rolls_back_duplicate_name(service, db):
    db.execute.return_value = result(one=SimpleNamespace(id=1, name="Ordi"))
    db.commit.side_effect = IntegrityError("update", {}, Exception("duplicate"))
    with pytest.raises(ValueError, match="A crop with this name already exists"):
        await service.update_crop(1, {"name": "Blat"})
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_crop_returns_false_when_missing(service, db):
    db.execute.return_value = result(one=None)
    assert await service.delete_crop(99) is False
    db.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_crop_deletes_and_commits(service, db):
    crop = SimpleNamespace(id=1)
    db.execute.return_value = result(one=crop)
    assert await service.delete_crop(1) is True
    db.delete.assert_awaited_once_with(crop)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_crop_rolls_back_integrity_error(service, db):
    db.execute.return_value = result(one=SimpleNamespace(id=1))
    db.commit.side_effect = IntegrityError("delete", {}, Exception("foreign key"))
    with pytest.raises(ValueError, match="Cannot delete this crop"):
        await service.delete_crop(1)
    db.rollback.assert_awaited_once()
