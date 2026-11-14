from datetime import datetime

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db import User
from db.schema import UsedPasswordResetToken

password_hash = PasswordHash.recommended()


class PasswordService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User).where(User.email == email)
        )

        return result.scalar_one_or_none()

    async def update_password(
        self,
        email: str,
        new_password: str,
        jti: str,
        expires_at: datetime,
    ) -> str:

        try:
            # Buscar l'usuari.
            user = await self.get_user_by_email(email)

            if user is None:
                return "not_found"

            # Evitar reutilitzar la contrasenya actual.
            if (
                user.password_hash
                and password_hash.verify(
                    new_password,
                    user.password_hash,
                )
            ):
                return "same_password"

            # Registrar el token com a utilitzat.
            # ON CONFLICT DO NOTHING evita reutilitzacions,
            # fins i tot amb peticions simultànies.
            statement = (
                insert(UsedPasswordResetToken)
                .values(
                    jti=jti,
                    user_id=user.id,
                    expires_at=expires_at,
                )
                .on_conflict_do_nothing(
                    index_elements=["jti"]
                )
                .returning(UsedPasswordResetToken.id)
            )

            result = await self._db.execute(statement)

            token_id = result.scalar_one_or_none()

            if token_id is None:
                await self._db.rollback()
                return "token_used"

            # Actualitzar la contrasenya.
            user.password_hash = password_hash.hash(new_password)

            # Confirmar conjuntament el registre del token
            # i el canvi de contrasenya.
            await self._db.commit()

            return "updated"

        except Exception:
            await self._db.rollback()
            raise