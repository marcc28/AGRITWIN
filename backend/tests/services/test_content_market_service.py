# tests/services/test_content_market_service.py

from unittest.mock import AsyncMock, MagicMock

import pytest

from services.content_market_service import ConteMercatService

@pytest.fixture
def db():
    return AsyncMock()


@pytest.fixture
def service(db):
    return ConteMercatService(session=db)


@pytest.mark.asyncio
async def test_list_conte_mercat(service, db):
    conte_mercat_1 = MagicMock()
    conte_mercat_2 = MagicMock()

    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [
        conte_mercat_1,
        conte_mercat_2,
    ]

    db.execute.return_value = result_mock

    result = await service.list_conte_mercat(
        offset=0,
        limit=10,
    )

    assert result == [
        conte_mercat_1,
        conte_mercat_2,
    ]

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_conte_mercat_with_pagination(service, db):
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []

    db.execute.return_value = result_mock

    result = await service.list_conte_mercat(
        offset=20,
        limit=5,
    )

    assert result == []

    db.execute.assert_awaited_once()

    query = db.execute.await_args.args[0]

    # Comprovem que el SELECT conté offset i limit
    assert "OFFSET" in str(query).upper()
    assert "LIMIT" in str(query).upper()


@pytest.mark.asyncio
async def test_get_conte_mercat_by_id(service, db):
    conte_mercat = MagicMock()

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = conte_mercat

    db.execute.return_value = result_mock

    result = await service.get_conte_mercat_by_id(1)

    assert result == conte_mercat

    db.execute.assert_awaited_once()
    result_mock.scalar_one_or_none.assert_called_once()


@pytest.mark.asyncio
async def test_get_conte_mercat_by_id_not_found(service, db):
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None

    db.execute.return_value = result_mock

    result = await service.get_conte_mercat_by_id(999)

    assert result is None

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_conte_mercat_by_product(service, db):
    conte_mercat_1 = MagicMock()
    conte_mercat_2 = MagicMock()

    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [
        conte_mercat_1,
        conte_mercat_2,
    ]

    db.execute.return_value = result_mock

    result = await service.get_conte_mercat_by_product("tomata")

    assert result == [
        conte_mercat_1,
        conte_mercat_2,
    ]

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_conte_mercat_by_product_not_found(service, db):
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []

    db.execute.return_value = result_mock

    result = await service.get_conte_mercat_by_product("producte-inexistent")

    assert result == []

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_conte_mercat(service, db):
    created_conte_mercat = MagicMock()

    # Quan es fa refresh, el model ja queda actualitzat.
    async def refresh(obj):
        # Simulem que la BD assigna un ID
        obj.id = 1

    db.refresh.side_effect = refresh

    result = await service.create_conte_mercat(
        product="Tomata",
        tecnical_name="Solanum lycopersicum",
        price=2.50,
        price_per_kg=2.50,
        left_units=10,
    )

    db.add.assert_called_once()

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()

    created_object = db.add.call_args.args[0]

    assert created_object.product == "Tomata"
    assert created_object.tecnical_name == "Solanum lycopersicum"
    assert created_object.price == 2.50
    assert created_object.price_per_kg == 2.50
    assert created_object.left_units == 10

    assert result == created_object


@pytest.mark.asyncio
async def test_create_conte_mercat_with_default_values(service, db):
    async def refresh(obj):
        obj.id = 1

    db.refresh.side_effect = refresh

    result = await service.create_conte_mercat(
        product="Patata",
    )

    created_object = db.add.call_args.args[0]

    assert created_object.product == "Patata"
    assert created_object.tecnical_name is None
    assert created_object.price is None
    assert created_object.price_per_kg is None
    assert created_object.left_units == 0

    assert result == created_object

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_conte_mercat(service, db):
    conte_mercat = MagicMock()

    # Mockegem el mètode del mateix service perquè aquest test
    # només comprovi la lògica de delete.
    service.get_conte_mercat_by_id = AsyncMock(
        return_value=conte_mercat
    )

    await service.delete_conte_mercat(1)

    service.get_conte_mercat_by_id.assert_awaited_once_with(1)

    db.delete.assert_awaited_once_with(conte_mercat)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_conte_mercat_not_found(service, db):
    service.get_conte_mercat_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(Exception) as exc_info:
        await service.delete_conte_mercat(999)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Conte mercat not found"

    service.get_conte_mercat_by_id.assert_awaited_once_with(999)

    db.delete.assert_not_awaited()
    db.commit.assert_not_awaited()
