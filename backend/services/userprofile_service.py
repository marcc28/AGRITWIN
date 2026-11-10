
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import UserProfile


class UserProfileService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_users_profile(
        self,
        offset: int = 0,
        limit: int = 10,
        nickname: str | None = None,
    ) -> list[UserProfile]:

        query = select(UserProfile)
        if nickname:
            query = query.where(UserProfile.name.ilike(f"%{nickname}%"))
        query = query.offset(offset).limit(limit)

        result = await self._db.execute(query)

        return list(result.scalars().all())

    async def get_user_profile(
        self,
        user_id: UUID,
    ) -> UserProfile | None:

        result = await self._db.execute(
            select(UserProfile).where(UserProfile.id == user_id)
        )

        return result.scalar_one_or_none()
