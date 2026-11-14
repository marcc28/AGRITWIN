import html
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.templating import Jinja2Templates
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from jwt.exceptions import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from db import AsyncSessionLocal
from models.password import (
    ForgetPasswordRequest,
    ResetPasswordRequest,
    SuccessMessage,
)
from services.password_service import PasswordService

load_dotenv()

router = APIRouter(prefix="/password", tags=["Password"])

# Utilitzar la mateixa configuració que auth.py
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
BASE_DIR = Path(__file__).resolve().parents[2]

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no està configurada al .env")

RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("FORGET_PASSWORD_LINK_EXPIRE_MINUTES", "15")
)

APP_HOST = os.getenv("APP_HOST")
FORGET_PASSWORD_URL = os.getenv("FORGET_PASSWORD_URL")

if not APP_HOST or not FORGET_PASSWORD_URL:
    raise RuntimeError(
        "APP_HOST i FORGET_PASSWORD_URL han d'estar configurats al .env"
    )
TEMPLATES = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)
page_router = APIRouter(tags=["Password Pages"])

# Configuració del correu
mail_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "AGRITWIN"),
    MAIL_PORT=465,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=BASE_DIR / "templates",
)


async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session


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
    


@router.post("/forget-password")
async def forget_password(
    request: ForgetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
):
    service = PasswordService(db)

    user = await service.get_user_by_email(str(request.email))

    # No revelar si el correu està registrat.
    if user is not None:
        token = create_reset_password_token(user.email)

        reset_link = (
            f"{APP_HOST.rstrip('/')}/"
            f"{FORGET_PASSWORD_URL.strip('/')}/{token}"
        )

        email_body = {
            "company_name": os.getenv("MAIL_FROM_NAME", "AGRITWIN"),
            "link_expiry_min": RESET_TOKEN_EXPIRE_MINUTES,
            "reset_link": reset_link,
        }

        message = MessageSchema(
            subject="Password Reset Instructions",
            recipients=[str(request.email)],
            template_body=email_body,
            subtype=MessageType.html,
        )

        fm = FastMail(mail_conf)

        background_tasks.add_task(
            fm.send_message,
            message,
            template_name="mail/password_reset.html",
        )

    return {
        "success": True,
        "status_code": status.HTTP_200_OK,
        "message": "If the email is registered, password reset instructions will be sent.",
    }


@router.post(
    "/reset-password",
    response_model=SuccessMessage,
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
):
    # Validar el JWT.
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