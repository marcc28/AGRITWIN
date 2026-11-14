
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import jwt

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.templating import Jinja2Templates
from jwt.exceptions import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from db import AsyncSessionLocal
from models.password import (
    ForgetPasswordRequest,
    ResetPasswordRequest,
    SuccessMessage,
)
from services.password_service import PasswordService


# =====================================================
# CONFIGURATION
# =====================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/password", tags=["Password"])

page_router = APIRouter(tags=["Password Pages"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no està configurada")

RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("FORGET_PASSWORD_LINK_EXPIRE_MINUTES", "15")
)

APP_HOST = os.getenv("APP_HOST")
FORGET_PASSWORD_URL = os.getenv("FORGET_PASSWORD_URL")

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv(
    "BREVO_SENDER_NAME",
    "AGRITWIN",
)

if not APP_HOST or not FORGET_PASSWORD_URL:
    raise RuntimeError(
        "APP_HOST i FORGET_PASSWORD_URL han d'estar configurats"
    )

if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
    raise RuntimeError(
        "BREVO_API_KEY i BREVO_SENDER_EMAIL han d'estar configurats"
    )

BASE_DIR = Path(__file__).resolve().parents[2]

TEMPLATES = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


# =====================================================
# DATABASE
# =====================================================

async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session


# =====================================================
# JWT PASSWORD RESET
# =====================================================

def create_reset_password_token(email: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": email,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        ),
        "purpose": "password_reset",
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_reset_password_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("purpose") != "password_reset":
            return None

        email = payload.get("sub")
        jti = payload.get("jti")
        exp = payload.get("exp")

        if not isinstance(email, str) or not email:
            return None

        if not isinstance(jti, str) or not jti:
            return None

        if not isinstance(exp, (int, float)):
            return None

        return {
            "email": email,
            "jti": jti,
            "expires_at": datetime.fromtimestamp(
                exp,
                tz=timezone.utc,
            ),
        }

    except (InvalidTokenError, ValueError, TypeError):
        return None


# =====================================================
# BREVO HTTP EMAIL SERVICE
# =====================================================

async def send_password_reset_email(
    recipient: str,
    reset_link: str,
):
    """
    Send password reset email using Brevo HTTP API.
    """

    try:
        # Renderitzar la plantilla HTML existent.
        template = TEMPLATES.env.get_template(
            "mail/password_reset.html"
        )

        html_content = template.render(
            company_name=BREVO_SENDER_NAME,
            link_expiry_min=RESET_TOKEN_EXPIRE_MINUTES,
            reset_link=reset_link,
        )

        payload = {
            "sender": {
                "name": BREVO_SENDER_NAME,
                "email": BREVO_SENDER_EMAIL,
            },
            "to": [
                {
                    "email": recipient,
                }
            ],
            "subject": "Password Reset Instructions",
            "htmlContent": html_content,
        }

        headers = {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
        }

        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:

            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers=headers,
                json=payload,
            )

            response.raise_for_status()

            result = response.json()

            logger.info(
                "Password reset email sent successfully to %s. Message ID: %s",
                recipient,
                result.get("messageId"),
            )

            return result

    except httpx.HTTPStatusError as exc:
        logger.error(
            "Brevo API error. Status: %s. Response: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise

    except Exception:
        logger.exception(
            "Error sending password reset email to %s",
            recipient,
        )
        raise


# =====================================================
# FORGET PASSWORD
# =====================================================

@router.post("/forget-password")
async def forget_password(
    request: ForgetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
):

    service = PasswordService(db)

    user = await service.get_user_by_email(
        str(request.email)
    )

    # No revelar si el correu està registrat.
    if user is not None:

        token = create_reset_password_token(
            user.email
        )

        reset_link = (
            f"{APP_HOST.rstrip('/')}/"
            f"{FORGET_PASSWORD_URL.strip('/')}/{token}"
        )

        # Enviar el correu en segon pla mitjançant Brevo.
        background_tasks.add_task(
            send_password_reset_email,
            str(request.email),
            reset_link,
        )

    return {
        "success": True,
        "status_code": status.HTTP_200_OK,
        "message": (
            "If the email is registered, "
            "password reset instructions will be sent."
        ),
    }


# =====================================================
# RESET PASSWORD
# =====================================================

@router.post(
    "/reset-password",
    response_model=SuccessMessage,
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
):

    payload = decode_reset_password_token(
        request.secret_token
    )

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    service = PasswordService(db)

    result = await service.update_password(
        email=payload["email"],
        new_password=request.new_password,
        jti=payload["jti"],
        expires_at=payload["expires_at"],
    )

    if result == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if result == "same_password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password",
        )

    if result == "token_used":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used",
        )

    if result != "updated":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to reset password",
        )

    return SuccessMessage(
        success=True,
        status_code=status.HTTP_200_OK,
        message="Password reset successfully",
    )


# =====================================================
# RESET PASSWORD HTML PAGE
# =====================================================

@page_router.get(
    "/reset-password/{token}",
    name="reset_password_page",
)
async def reset_password_page(
    request: Request,
    token: str,
):

    payload = decode_reset_password_token(token)

    if payload is None:
        return TEMPLATES.TemplateResponse(
            request=request,
            name="reset_password.html",
            context={
                "token": "",
                "error": (
                    "L'enllaç és invàlid o ha caducat. "
                    "Sol·licita un nou correu de recuperació."
                ),
            },
            status_code=400,
        )

    return TEMPLATES.TemplateResponse(
        request=request,
        name="reset_password.html",
        context={
            "token": token,
            "error": None,
        },
    )
