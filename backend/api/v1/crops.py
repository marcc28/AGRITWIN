from fastapi import APIRouter, Depends, HTTPException, Query

from api.v1.auth import get_current_user
from db import AsyncSessionLocal
from models.crops import CropCreate, CropRead, CropUpdate
from services.crops_service import CropService

router = APIRouter(
    prefix="/crops",
    tags=["Crops"],
    dependencies=[Depends(get_current_user)],
)


async def get_crop_service():
    async with AsyncSessionLocal() as session:
        yield CropService(session=session)


@router.get("", response_model=list[CropRead])
async def get_crops(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    service: CropService = Depends(get_crop_service),
):
    return await service.list_crops(offset, limit)


@router.get("/count")
async def count_crops(
    service: CropService = Depends(get_crop_service),
):
    return {"total": await service.count_crops()}


@router.get("/search", response_model=list[CropRead])
async def search_crops(
    name: str,
    service: CropService = Depends(get_crop_service),
):
    return await service.search_crops(name)


@router.get("/{crop_id}", response_model=CropRead)
async def get_crop_by_id(
    crop_id: int,
    service: CropService = Depends(get_crop_service),
):
    crop = await service.get_crop_by_id(crop_id)

    if crop is None:
        raise HTTPException(404, detail="Crop not found")

    return crop


@router.post("", response_model=CropRead, status_code=201)
async def create_crop(
    data: CropCreate,
    service: CropService = Depends(get_crop_service),
):
    try:
        return await service.create_crop(
            name=data.name,
            scientific_name=data.scientific_name,
            category=data.category,
        )
    except ValueError as exc:
        raise HTTPException(409, detail=str(exc)) from exc


@router.patch("/{crop_id}", response_model=CropRead)
async def update_crop(
    crop_id: int,
    data: CropUpdate,
    service: CropService = Depends(get_crop_service),
):
    try:
        crop = await service.update_crop(
            crop_id,
            data.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(409, detail=str(exc)) from exc

    if crop is None:
        raise HTTPException(404, detail="Crop not found")

    return crop


@router.delete("/{crop_id}", status_code=204)
async def delete_crop(
    crop_id: int,
    service: CropService = Depends(get_crop_service),
):
    try:
        deleted = await service.delete_crop(crop_id)
    except ValueError as exc:
        raise HTTPException(409, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(404, detail="Crop not found")

    return None
