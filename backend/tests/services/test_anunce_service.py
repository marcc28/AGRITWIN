from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from services.anunce_service import AnunceService

@pytest.mark.asyncio
async def test_list_anunces():
    db = MagicMock()
    service = AnunceService(db)

    anunce_1 = MagicMock()
    anunce_2 = MagicMock()

    result = MagicMock()
    result.scalars.return_value.all.return_value = [
        anunce_1,
        anunce_2,
    ]

    db.execute = AsyncMock(return_value=result)

    response = await service.list_anunces()

    assert response == [
        anunce_1,
        anunce_2,
    ]

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_anunces_empty():
    db = MagicMock()
    service = AnunceService(db)

    result = MagicMock()
    result.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(return_value=result)

    response = await service.list_anunces()

    assert response == []


@pytest.mark.asyncio
async def test_get_anunce_by_id():
    db = MagicMock()
    service = AnunceService(db)

    anunce = MagicMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = anunce

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunce_by_id(1)

    assert response == anunce

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_anunce_by_id_not_found():
    db = MagicMock()
    service = AnunceService(db)

    result = MagicMock()
    result.scalar_one_or_none.return_value = None

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunce_by_id(999)

    assert response is None


@pytest.mark.asyncio
async def test_get_anunces_by_title():
    db = MagicMock()
    service = AnunceService(db)

    anunce_1 = MagicMock()
    anunce_2 = MagicMock()

    result = MagicMock()
    result.scalars.return_value.all.return_value = [
        anunce_1,
        anunce_2,
    ]

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunces_by_title("Oferta")

    assert response == [
        anunce_1,
        anunce_2,
    ]

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_anunces_by_title_not_found():
    db = MagicMock()
    service = AnunceService(db)

    result = MagicMock()
    result.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunces_by_title(
        "Titol inexistent"
    )

    assert response == []


@pytest.mark.asyncio
async def test_get_anunces_by_agent():
    db = MagicMock()
    service = AnunceService(db)

    anunce_1 = MagicMock()
    anunce_2 = MagicMock()

    result = MagicMock()
    result.scalars.return_value.all.return_value = [
        anunce_1,
        anunce_2,
    ]

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunces_by_agent("Joan")

    assert response == [
        anunce_1,
        anunce_2,
    ]

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_anunces_by_agent_not_found():
    db = MagicMock()
    service = AnunceService(db)

    result = MagicMock()
    result.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(return_value=result)

    response = await service.get_anunces_by_agent(
        "Agent inexistent"
    )

    assert response == []


@pytest.mark.asyncio
async def test_create_anunce():
    db = MagicMock()
    service = AnunceService(db)

    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    response = await service.create_anunce(
        title="Oferta de feina",
        subtile="Busquem programador",
        agent="Joan",
        content="Informació de l'oferta",
    )

    db.add.assert_called_once()

    anunce = db.add.call_args.args[0]

    assert anunce.title == "Oferta de feina"
    assert anunce.subtile == "Busquem programador"
    assert anunce.agent == "Joan"
    assert anunce.content == "Informació de l'oferta"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(anunce)

    assert response == anunce


@pytest.mark.asyncio
async def test_create_anunce_default_values():
    db = MagicMock()
    service = AnunceService(db)

    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    response = await service.create_anunce(
        title="Nou anunci",
    )

    anunce = db.add.call_args.args[0]

    assert anunce.title == "Nou anunci"
    assert anunce.subtile is None
    assert anunce.agent is None
    assert anunce.content is None

    assert response == anunce


@pytest.mark.asyncio
async def test_delete_anunce():
    db = MagicMock()
    service = AnunceService(db)

    anunce = MagicMock()

    service.get_anunce_by_id = AsyncMock(
        return_value=anunce
    )

    db.delete = AsyncMock()
    db.commit = AsyncMock()

    await service.delete_anunce(1)

    service.get_anunce_by_id.assert_awaited_once_with(1)

    db.delete.assert_awaited_once_with(anunce)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_anunce_not_found():
    db = MagicMock()
    service = AnunceService(db)

    service.get_anunce_by_id = AsyncMock(
        return_value=None
    )

    db.delete = AsyncMock()
    db.commit = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await service.delete_anunce(999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Anunce not found"

    db.delete.assert_not_awaited()
    db.commit.assert_not_awaited()
