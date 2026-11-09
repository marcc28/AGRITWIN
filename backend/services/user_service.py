from uuid import UUID

from fastapi import HTTPException
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import User, UserAuthProvider, UserConsent, UserProfile

password_hash = PasswordHash.recommended()

TERMS_VERSION = "1.0"


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

    async def get_user_by_auth_provider(
        self,
        provider: str,
        provider_user_id: str,
    ) -> User | None:
        result = await self._db.execute(
            select(User)
            .join(UserAuthProvider)
            .where(
                UserAuthProvider.provider == provider,
                UserAuthProvider.provider_user_id == provider_user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_user_by_google_id(self, google_id: str) -> User | None:
        return await self.get_user_by_auth_provider("google", google_id)

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
            id=user.id,
            name=user.username,
            user=user,
        )

        self._db.add(profile)

        consent = UserConsent(
            user_id=user.id,
            document_version=TERMS_VERSION,
        )
        self._db.add(consent)

        await self._db.commit()
        await self._db.refresh(user)

        return user

    async def get_user_profile(
        self,
        user_id: UUID,
    ) -> UserProfile | None:
        result = await self._db.execute(select(UserProfile).where(UserProfile.id == user_id))

        return result.scalar_one_or_none()

    async def create_google_user(
        self,
        username: str,
        email: str,
        google_id: str,
        privacy_terms_accepted: bool,
        security_terms_accepted: bool,
    ) -> User:
        return await self.create_social_user(
            username=username,
            email=email,
            provider="google",
            provider_user_id=google_id,
            privacy_terms_accepted=privacy_terms_accepted,
            security_terms_accepted=security_terms_accepted,
        )

    async def create_social_user(
        self,
        username: str,
        email: str,
        provider: str,
        provider_user_id: str,
        privacy_terms_accepted: bool,
        security_terms_accepted: bool,
        display_name: str | None = None,
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

        # Comprovar si ja existeix el correu
        existing_user = await self.get_user_by_email(email)

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Email already registered",
            )

        # Comprovar si ja existeix el username
        existing_username = await self.get_user_by_username(username)

        if existing_username:
            raise HTTPException(
                status_code=409,
                detail="Username already registered",
            )

        # Crear usuari AgriTwin
        user = User(
            username=username,
            email=email,
            password_hash=None,
        )

        self._db.add(user)
        await self._db.flush()

        # Associate the provider identity with the AgriTwin account.
        auth_provider = UserAuthProvider(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
        )

        self._db.add(auth_provider)

        # Crear perfil
        profile = UserProfile(
            id=user.id,
            name=display_name or username,
            user=user,
        )

        self._db.add(profile)

        # Crear registre de consentiment
        consent = UserConsent(
            user_id=user.id,
            document_version=TERMS_VERSION,
        )

        self._db.add(consent)

        await self._db.commit()
        await self._db.refresh(user)

        return user
