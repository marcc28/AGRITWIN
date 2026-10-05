import secrets

from fastapi import HTTPException
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import User, UserProfile

password_hash = PasswordHash.recommended()


class UserService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_users(
        self,
        offset: int = 0,
        limit: int = 10,
    ) -> list[User]:

        result = await self._db.execute(select(User).offset(offset).limit(limit))

        return list(result.scalars().all())

    async def get_user(
        self,
        username: str,
    ) -> User | None:

        result = await self._db.execute(select(User).where(User.username == username))

        return result.scalar_one_or_none()

    async def get_user_by_email(
        self,
        email: str,
    ) -> User | None:

        result = await self._db.execute(select(User).where(User.email == email))

        return result.scalar_one_or_none()

    async def get_user_by_username(
        self,
        username: str,
    ) -> User | None:

        result = await self._db.execute(select(User).where(User.username == username))

        return result.scalar_one_or_none()

    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
    ) -> User:

        existing_user = await self.get_user_by_email(email)

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Email already registered",
            )

        existing_username = await self.get_user_by_username(username)

        if existing_username:
            raise HTTPException(
                status_code=409,
                detail="Username already registered",
            )

        salt = secrets.token_hex(16)

        user = User(
            username=username,
            email=email,
            password_hash=password_hash.hash(password),
            salt=salt,
        )

        self._db.add(user)

        await self._db.flush()

        profile = UserProfile(
            username=user.username,
        )

        self._db.add(profile)

        await self._db.commit()
        await self._db.refresh(user)

        return user
