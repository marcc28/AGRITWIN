from fastapi import APIRouter, Depends, HTTPException

from db import AsyncSessionLocal
from models.anunce import AnunceCreate, AnunceRead
from services.anunce_service import AnunceService

router = APIRouter(
    prefix="/anunces",
    tags=["Anunces"],
)


async def get_anunce_service() -> AnunceService:
    async with AsyncSessionLocal() as session:
        yield AnunceService(session=session)


@router.get(
    "",
    response_model=list[AnunceRead],
)
async def list_anunces(
    offset: int = 0,
    limit: int = 10,
    service: AnunceService = Depends(get_anunce_service),
):
    return await service.list_anunces(
        offset=offset,
        limit=limit,
    )

@router.get(
    "/{id}",
    response_model=AnunceRead,
)
async def get_anunce(
    id: int,
    service: AnunceService = Depends(get_anunce_service),
):
    anunce = await service.get_anunce_by_id(id)

    if anunce is None:
        raise HTTPException(
            status_code=404,
            detail="Anunce not found",
        )

    return anunce


@router.post(
    "",
    response_model=AnunceRead,
    status_code=201,
)
async def create_anunce(
    data: AnunceCreate,
    service: AnunceService = Depends(get_anunce_service),
):
    return await service.create_anunce(
        title=data.title,
        subtile=data.subtile,
        agent=data.agent,
        content=data.content,
    )


@router.delete(
    "/{id}",
    status_code=204,
)
async def delete_anunce(
    id: int,
    service: AnunceService = Depends(get_anunce_service),
):
    await service.delete_anunce(id)
