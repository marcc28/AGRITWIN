
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import Crop, Field, FieldCrop


class FieldCropService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def field_belongs_to_user(
        self,
        field_id: int,
        user_id,
    ) -> bool:
        result = await self._db.execute(
            select(Field.id).where(
                Field.id == field_id,
                Field.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def list_field_crops(
        self,
        user_id,
        offset: int = 0,
        limit: int = 10,
        field_id: int | None = None,
        crop_id: int | None = None,
        status: str | None = None,
    ) -> list[FieldCrop]:

        query = (
            select(FieldCrop)
            .join(Field, FieldCrop.field_id == Field.id)
            .where(Field.user_id == user_id)
        )

        if field_id is not None:
            query = query.where(FieldCrop.field_id == field_id)

        if crop_id is not None:
            query = query.where(FieldCrop.crop_id == crop_id)

        if status is not None:
            query = query.where(FieldCrop.status == status)

        query = (
            query.order_by(FieldCrop.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await self._db.execute(query)
        return list(result.scalars().all())

    async def count_field_crops(
        self,
        user_id,
        field_id: int | None = None,
    ) -> int:
        query = (
            select(func.count(FieldCrop.id))
            .join(Field, FieldCrop.field_id == Field.id)
            .where(Field.user_id == user_id)
        )

        if field_id is not None:
            query = query.where(FieldCrop.field_id == field_id)

        result = await self._db.execute(query)
        return result.scalar_one()

    async def get_field_crop_by_id(
        self,
        field_crop_id: int,
        user_id,
    ) -> FieldCrop | None:
        result = await self._db.execute(
            select(FieldCrop)
            .join(Field, FieldCrop.field_id == Field.id)
            .where(
                FieldCrop.id == field_crop_id,
                Field.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_field_crop(
        self,
        user_id,
        field_id: int,
        crop_id: int,
        planted_at=None,
        expected_harvest_at=None,
        status: str = "planted",
        notes: str | None = None,
    ) -> FieldCrop:

        if not await self.field_belongs_to_user(field_id, user_id):
            raise ValueError("Field not found")

        result = await self._db.execute(
            select(Crop).where(Crop.id == crop_id)
        )
        crop = result.scalar_one_or_none()

        if crop is None:
            raise ValueError("Crop not found")

        field_crop = FieldCrop(
            field_id=field_id,
            crop_id=crop_id,
            crop=crop,
            planted_at=planted_at,
            expected_harvest_at=expected_harvest_at,
            status=status,
            notes=notes,
        )

        self._db.add(field_crop)

        try:
            await self._db.commit()
            await self._db.refresh(field_crop)
            field_crop.crop = crop
        except IntegrityError:
            await self._db.rollback()
            raise ValueError("Invalid field crop data")

        return field_crop

    async def update_field_crop(
        self,
        field_crop_id: int,
        user_id,
        data: dict,
    ) -> FieldCrop | None:

        field_crop = await self.get_field_crop_by_id(
            field_crop_id,
            user_id,
        )

        if field_crop is None:
            return None

        if "field_id" in data:
            if not await self.field_belongs_to_user(data["field_id"], user_id):
                raise ValueError("Field not found")

        if "crop_id" in data:
            result = await self._db.execute(
                select(Crop).where(Crop.id == data["crop_id"])
            )
            crop = result.scalar_one_or_none()
            if crop is None:
                raise ValueError("Crop not found")
            field_crop.crop = crop

        for key, value in data.items():
            setattr(field_crop, key, value)

        try:
            await self._db.commit()
            await self._db.refresh(field_crop)
        except IntegrityError:
            await self._db.rollback()
            raise ValueError("Invalid field crop data")

        return field_crop

    async def delete_field_crop(
        self,
        field_crop_id: int,
        user_id,
    ) -> bool:
        field_crop = await self.get_field_crop_by_id(
            field_crop_id,
            user_id,
        )

        if field_crop is None:
            return False

        await self._db.delete(field_crop)

        try:
            await self._db.commit()
        except IntegrityError:
            await self._db.rollback()
            raise ValueError("Cannot delete field crop")

        return True
