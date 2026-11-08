from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from services.field_crops_service import FieldCropService


def result(*, one=None, rows=None):
    value = Mock()
    value.scalar_one_or_none.return_value = one
    value.scalar_one.return_value = one
    value.scalars.return_value.all.return_value = rows or []
    return value


@pytest.fixture
def db():
    session = Mock()
    session.execute = AsyncMock()
    session.add = Mock()
    session.delete = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def service(db):
    return FieldCropService(db)


@pytest.mark.asyncio
async def test_field_belongs_to_user(service, db):
    db.execute.return_value = result(one=7)

    assert await service.field_belongs_to_user(7, uuid4()) is True
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_field_crops_returns_rows(service, db):
    rows = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
    db.execute.return_value = result(rows=rows)

    assert (
        await service.list_field_crops(
            user_id=uuid4(),
            offset=5,
            limit=2,
            field_id=7,
            crop_id=3,
            status="planted",
        )
        == rows
    )
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_count_field_crops(service, db):
    db.execute.return_value = result(one=4)

    assert await service.count_field_crops(uuid4(), field_id=7) == 4


@pytest.mark.asyncio
async def test_get_field_crop_by_id_returns_none_when_not_found(service, db):
    db.execute.return_value = result(one=None)

    assert await service.get_field_crop_by_id(999, uuid4()) is None


@pytest.mark.asyncio
async def test_create_field_crop_saves_association(service, db):
    user_id = uuid4()
    crop = SimpleNamespace(id=3, name="Tomàquet")
    db.execute.side_effect = [result(one=7), result(one=crop)]

    created = await service.create_field_crop(
        user_id=user_id,
        field_id=7,
        crop_id=3,
        planted_at=date(2026, 4, 1),
        expected_harvest_at=date(2026, 8, 1),
        notes="Reg regular",
    )

    assert created.field_id == 7
    assert created.crop_id == 3
    assert created.crop is crop
    assert created.status == "planted"
    db.add.assert_called_once_with(created)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(created)


@pytest.mark.asyncio
async def test_create_field_crop_rejects_unowned_field(service, db):
    db.execute.return_value = result(one=None)

    with pytest.raises(ValueError, match="Field not found"):
        await service.create_field_crop(uuid4(), field_id=7, crop_id=3)

    db.execute.assert_awaited_once()
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_field_crop_rejects_unknown_crop(service, db):
    db.execute.side_effect = [result(one=7), result(one=None)]

    with pytest.raises(ValueError, match="Crop not found"):
        await service.create_field_crop(uuid4(), field_id=7, crop_id=404)

    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_field_crop_rolls_back_invalid_data(service, db):
    crop = SimpleNamespace(id=3, name="Tomàquet")
    db.execute.side_effect = [result(one=7), result(one=crop)]
    db.commit.side_effect = IntegrityError("insert", {}, Exception("constraint"))

    with pytest.raises(ValueError, match="Invalid field crop data"):
        await service.create_field_crop(uuid4(), field_id=7, crop_id=3)

    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_field_crop_updates_status(service, db):
    current = SimpleNamespace(id=10, status="planned")
    db.execute.return_value = result(one=current)

    updated = await service.update_field_crop(
        10,
        uuid4(),
        {"status": "planted", "notes": "Avui"},
    )

    assert updated is current
    assert current.status == "planted"
    assert current.notes == "Avui"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(current)


@pytest.mark.asyncio
async def test_update_field_crop_changes_crop_relation(service, db):
    current = SimpleNamespace(id=10, crop_id=2, crop=None)
    new_crop = SimpleNamespace(id=3, name="Ceba")
    db.execute.side_effect = [result(one=current), result(one=new_crop)]

    updated = await service.update_field_crop(10, uuid4(), {"crop_id": 3})

    assert updated.crop is new_crop
    assert updated.crop_id == 3


@pytest.mark.asyncio
async def test_update_field_crop_returns_none_when_not_found(service, db):
    db.execute.return_value = result(one=None)

    assert await service.update_field_crop(999, uuid4(), {"status": "planted"}) is None
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_field_crop_rejects_unknown_crop(service, db):
    current = SimpleNamespace(id=10, crop_id=2, crop=None)
    db.execute.side_effect = [result(one=current), result(one=None)]

    with pytest.raises(ValueError, match="Crop not found"):
        await service.update_field_crop(10, uuid4(), {"crop_id": 999})

    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_field_crop_rolls_back_integrity_error(service, db):
    current = SimpleNamespace(id=10, status="planned")
    db.execute.return_value = result(one=current)
    db.commit.side_effect = IntegrityError("update", {}, Exception("constraint"))

    with pytest.raises(ValueError, match="Invalid field crop data"):
        await service.update_field_crop(10, uuid4(), {"status": "planted"})

    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_field_crop_rejects_unowned_target_field(service, db):
    current = SimpleNamespace(id=10, field_id=7)
    db.execute.side_effect = [result(one=current), result(one=None)]

    with pytest.raises(ValueError, match="Field not found"):
        await service.update_field_crop(10, uuid4(), {"field_id": 999})

    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_field_crop_deletes_and_commits(service, db):
    current = SimpleNamespace(id=10)
    db.execute.return_value = result(one=current)

    assert await service.delete_field_crop(10, uuid4()) is True
    db.delete.assert_awaited_once_with(current)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_field_crop_returns_false_when_missing(service, db):
    db.execute.return_value = result(one=None)

    assert await service.delete_field_crop(999, uuid4()) is False
    db.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_field_crop_rolls_back_integrity_error(service, db):
    db.execute.return_value = result(one=SimpleNamespace(id=10))
    db.commit.side_effect = IntegrityError("delete", {}, Exception("constraint"))

    with pytest.raises(ValueError, match="Cannot delete field crop"):
        await service.delete_field_crop(10, uuid4())

    db.rollback.assert_awaited_once()
