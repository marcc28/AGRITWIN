
from fastapi import HTTPException
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import User, UserConsent, UserProfile

password_hash = PasswordHash.recommended()

PRIVACY_TERMS_VERSION = "1.0"
SECURITY_TERMS_VERSION = "1.0"


class UserService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def list_users(
        self,
        offset: int = 0,
        limit: int = 10,
    ) -> list[User]:

        result = await self._db.execute(
            select(User)
            .offset(offset)
            .limit(limit)
        )

        return list(result.scalars().all())

    async def get_user(
        self,
        username: str,
    ) -> User | None:

        result = await self._db.execute(
            select(User).where(User.username == username)
        )

        return result.scalar_one_or_none()

    async def get_user_by_email(
        self,
        email: str,
    ) -> User | None:

        result = await self._db.execute(
            select(User).where(User.email == email)
        )

        return result.scalar_one_or_none()

    async def get_user_by_username(
        self,
        username: str,
    ) -> User | None:

        result = await self._db.execute(
            select(User).where(User.username == username)
        )

        return result.scalar_one_or_none()

    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        privacy_terms_accepted: bool,
        security_terms_accepted: bool,
    ) -> User:

        if not privacy_terms_accepted:
            raise HTTPException(
                status_code=400,
                detail="Privacy terms must be accepted",
            )

        if not security_terms_accepted:
            raise HTTPException(
                status_code=400,
                detail="Security terms must be accepted",
            )

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

        user = User(
            username=username,
            email=email,
            password_hash=password_hash.hash(password),
        )

        self._db.add(user)

        await self._db.flush()

        profile = UserProfile(
            username=user.username,
        )

        self._db.add(profile)
        
        privacy_consent = UserConsent(
            username=user.username,
            document_type="privacy_terms",
            document_version=PRIVACY_TERMS_VERSION,
        )

        security_consent = UserConsent(
            username=user.username,
            document_type="security_terms",
            document_version=SECURITY_TERMS_VERSION,
        )

        self._db.add(privacy_consent)
        self._db.add(security_consent)

        await self._db.commit()
        await self._db.refresh(user)

        return user
    
    async def get_user_profile(
        self,
        username: str,
    ) -> UserProfile | None:

        result = await self._db.execute(
            select(UserProfile).where(
                UserProfile.username == username
            )
        )

        return result.scalar_one_or_none()