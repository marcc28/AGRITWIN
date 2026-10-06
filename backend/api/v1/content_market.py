from fastapi import APIRouter, Depends, HTTPException

from db import AsyncSessionLocal
from models.content_market import ConteMercatCreate, ConteMercatRead
from services.content_market_service import ConteMercatService

router = APIRouter(
    prefix="/conte_mercat",
    tags=["Conte Mercat"],
)


async def get_conte_mercat_service() -> ConteMercatService:
    async with AsyncSessionLocal() as session:
        yield ConteMercatService(session=session)


@router.get(
    "",
    response_model=list[ConteMercatRead],
)
async def list_conte_mercat(
    offset: int = 0,
    limit: int = 10,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    return await service.list_conte_mercat(
        offset=offset,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=ConteMercatRead,
)
async def get_conte_mercat(
    id: int,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    conte_mercat = await service.get_conte_mercat_by_id(id)

    if conte_mercat is None:
        raise HTTPException(
            status_code=404,
            detail="Conte mercat not found",
        )

    return conte_mercat


@router.post(
    "",
    response_model=ConteMercatRead,
    status_code=201,
)
async def create_conte_mercat(
    data: ConteMercatCreate,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    return await service.create_conte_mercat(
        product=data.product,
        tecnical_name=data.tecnical_name,
        price=data.price,
        price_per_kg=data.price_per_kg,
        left_units=data.left_units,
    )


@router.delete(
    "/{id}",
    status_code=204,
)
async def delete_conte_mercat(
    id: int,
    service: ConteMercatService = Depends(get_conte_mercat_service),
):
    await service.delete_conte_mercat(id)
