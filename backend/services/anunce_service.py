from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import Anunce


class AnunceService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_anunces(
        self,
        offset: int = 0,
        limit: int = 10,
    ) -> list[Anunce]:
        result = await self._db.execute(select(Anunce).offset(offset).limit(limit))
        return list(result.scalars().all())

    async def get_anunce_by_id(
        self,
        id: UUID,
    ) -> Anunce | None:
        result = await self._db.execute(select(Anunce).where(Anunce.id == id))
        return result.scalar_one_or_none()

    async def get_anunces_by_title(
        self,
        title: str,
    ) -> list[Anunce]:
        result = await self._db.execute(select(Anunce).where(Anunce.title.ilike(f"%{title}%")))
        return list(result.scalars().all())

    async def get_anunces_by_agent(
        self,
        agent: str,
    ) -> list[Anunce]:
        result = await self._db.execute(select(Anunce).where(Anunce.agent == agent))
        return list(result.scalars().all())

    async def create_anunce(
        self,
        title: str,
        subtile: str | None = None,
        agent: str | None = None,
        content: str | None = None,
    ) -> Anunce:
        anunce = Anunce(
            title=title,
            subtile=subtile,
            agent=agent,
            content=content,
        )

        self._db.add(anunce)

        await self._db.commit()
        await self._db.refresh(anunce)

        return anunce
    
    async def count_anunces(self) -> int:
        result = await self._db.execute(
            select(func.count()).select_from(Anunce)
        )
        return result.scalar_one()
    
    async def update_image_url(
        self,
        anunce_id: UUID,
        image_url: str,
    ) -> Anunce:
        anunce = await self.get_anunce_by_id(anunce_id)

        if anunce is None:
            raise HTTPException(
                status_code=404,
                detail="Anunce not found",
            )

        anunce.image_url = image_url

        await self._db.commit()
        await self._db.refresh(anunce)

        return anunce

    async def delete_anunce(
        self,
        id: UUID,
    ) -> None:
        anunce = await self.get_anunce_by_id(id)

        if anunce is None:
            raise HTTPException(
                status_code=404,
                detail="Anunce not found",
            )

        await self._db.delete(anunce)
        await self._db.commit()
