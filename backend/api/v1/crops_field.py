from fastapi import APIRouter, Depends, HTTPException, Query

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User
from models.field_crops import FieldCropCreate, FieldCropRead, FieldCropUpdate
from services.field_crops_service import FieldCropService

router = APIRouter(
    prefix="/field-crops",
    tags=["Field Crops"],
    dependencies=[Depends(get_current_user)],
)


async def get_field_crop_service():
    async with AsyncSessionLocal() as session:
        yield FieldCropService(session=session)


@router.get("", response_model=list[FieldCropRead])
async def get_field_crops(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    field_id: int | None = None,
    crop_id: int | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    return await service.list_field_crops(
        user_id=current_user.id,
        offset=offset,
        limit=limit,
        field_id=field_id,
        crop_id=crop_id,
        status=status,
    )


@router.get("/count")
async def count_field_crops(
    field_id: int | None = None,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    total = await service.count_field_crops(
        user_id=current_user.id,
        field_id=field_id,
    )
    return {"total": total}


@router.get("/{field_crop_id}", response_model=FieldCropRead)
async def get_field_crop_by_id(
    field_crop_id: int,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    field_crop = await service.get_field_crop_by_id(
        field_crop_id=field_crop_id,
        user_id=current_user.id,
    )

    if field_crop is None:
        raise HTTPException(404, detail="Field crop not found")

    return field_crop


@router.post("", response_model=FieldCropRead, status_code=201)
async def create_field_crop(
    data: FieldCropCreate,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    try:
        return await service.create_field_crop(
            user_id=current_user.id,
            field_id=data.field_id,
            crop_id=data.crop_id,
            planted_at=data.planted_at,
            expected_harvest_at=data.expected_harvest_at,
            status=data.status,
            notes=data.notes,
        )
    except ValueError as exc:
        status_code = 404 if str(exc) in ("Field not found", "Crop not found") else 400
        raise HTTPException(status_code, detail=str(exc)) from exc


@router.patch("/{field_crop_id}", response_model=FieldCropRead)
async def update_field_crop(
    field_crop_id: int,
    data: FieldCropUpdate,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    try:
        field_crop = await service.update_field_crop(
            field_crop_id=field_crop_id,
            user_id=current_user.id,
            data=data.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        status_code = 404 if str(exc) in ("Field not found", "Crop not found") else 400
        raise HTTPException(status_code, detail=str(exc)) from exc

    if field_crop is None:
        raise HTTPException(404, detail="Field crop not found")

    return field_crop


@router.delete("/{field_crop_id}", status_code=204)
async def delete_field_crop(
    field_crop_id: int,
    current_user: User = Depends(get_current_user),
    service: FieldCropService = Depends(get_field_crop_service),
):
    deleted = await service.delete_field_crop(
        field_crop_id=field_crop_id,
        user_id=current_user.id,
    )

    if not deleted:
        raise HTTPException(404, detail="Field crop not found")

    return None
