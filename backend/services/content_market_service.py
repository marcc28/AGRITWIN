from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import ConteMercat


class ConteMercatService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_conte_mercat(
        self,
        offset: int = 0,
        limit: int = 10,
    ) -> list[ConteMercat]:
        result = await self._db.execute(select(ConteMercat).offset(offset).limit(limit))

        return list(result.scalars().all())

    async def get_conte_mercat_by_id(
        self,
        id: int,
    ) -> ConteMercat | None:
        result = await self._db.execute(select(ConteMercat).where(ConteMercat.id == id))

        return result.scalar_one_or_none()

    async def get_conte_mercat_by_product(
        self,
        product: str,
    ) -> list[ConteMercat]:
        result = await self._db.execute(
            select(ConteMercat).where(ConteMercat.product.ilike(f"%{product}%"))
        )

        return list(result.scalars().all())

    async def create_conte_mercat(
        self,
        product: str,
        tecnical_name: str | None = None,
        price=None,
        price_per_kg=None,
        left_units: int = 0,
    ) -> ConteMercat:
        conte_mercat = ConteMercat(
            product=product,
            tecnical_name=tecnical_name,
            price=price,
            price_per_kg=price_per_kg,
            left_units=left_units,
        )

        self._db.add(conte_mercat)

        await self._db.commit()
        await self._db.refresh(conte_mercat)

        return conte_mercat

    async def delete_conte_mercat(
        self,
        id: int,
    ) -> None:
        conte_mercat = await self.get_conte_mercat_by_id(id)

        if conte_mercat is None:
            raise HTTPException(
                status_code=404,
                detail="Conte mercat not found",
            )

        await self._db.delete(conte_mercat)
        await self._db.commit()
