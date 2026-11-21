from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import Crop


class CropService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_crops(
        self,
        offset: int = 0,
        limit: int = 10,
    ) -> list[Crop]:
        result = await self._db.execute(
            select(Crop).order_by(Crop.name).offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def get_crop_by_id(self, crop_id: int) -> Crop | None:
        result = await self._db.execute(select(Crop).where(Crop.id == crop_id))
        return result.scalar_one_or_none()

    async def search_crops(self, name: str) -> list[Crop]:
        result = await self._db.execute(select(Crop).where(Crop.name.ilike(f"%{name}%")))
        return list(result.scalars().all())

    async def create_crop(
        self,
        name: str,
        scientific_name: str | None = None,
        category: str | None = None,
    ) -> Crop:
        crop = Crop(
            name=name,
            scientific_name=scientific_name,
            category=category,
        )

        self._db.add(crop)

        try:
            await self._db.commit()
            await self._db.refresh(crop)
        except IntegrityError as err:
            await self._db.rollback()
            raise ValueError(
                "Cannot delete this crop because it is associated with fields"
            ) from err

        return crop

    async def update_crop(
        self,
        crop_id: int,
        data: dict,
    ) -> Crop | None:
        crop = await self.get_crop_by_id(crop_id)

        if crop is None:
            return None

        for key, value in data.items():
            setattr(crop, key, value)

        try:
            await self._db.commit()
            await self._db.refresh(crop)
        except IntegrityError:
            await self._db.rollback()
            raise ValueError("A crop with this name already exists")

        return crop

    async def delete_crop(self, crop_id: int) -> bool:
        crop = await self.get_crop_by_id(crop_id)

        if crop is None:
            return False

        await self._db.delete(crop)

        try:
            await self._db.commit()
        except IntegrityError:
            await self._db.rollback()
            raise ValueError("Cannot delete this crop because it is associated with fields")

        return True

    async def count_crops(self) -> int:
        result = await self._db.execute(select(func.count()).select_from(Crop))
        return result.scalar_one()
