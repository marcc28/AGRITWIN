import os
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from db import AsyncSessionLocal, User
from models.token import Token
from models.userProfile import UserProfileRead
from services.user_service import UserService

load_dotenv()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no està configurada al .env")


templates = Jinja2Templates(directory="app/templates")

router = APIRouter()

password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token")


async def get_user_service():
    async with AsyncSessionLocal() as session:
        yield UserService(session=session)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


async def authenticate_user(
    username: str,
    password: str,
) -> User | bool:

    async with AsyncSessionLocal() as db:
        service = UserService(db)

        user = await service.get_user_by_username(username)

        if not user:
            return False

        if not verify_password(
            password,
            user.password_hash,
        ):
            return False

        return user


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:

    to_encode = data.copy()

    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=15))

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_refresh_token(data: dict) -> str:

    to_encode = data.copy()

    expire = datetime.now(UTC) + timedelta(days=7)

    to_encode.update(
        {
            "exp": expire,
            "type": "refresh",
        }
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except InvalidTokenError as err:
        raise credentials_exception from err

    async with AsyncSessionLocal() as db:
        service = UserService(db)

        user = await service.get_user_by_username(username)

        if user is None:
            raise credentials_exception

        return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> dict:

    user = await authenticate_user(
        form_data.username,
        form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )

    refresh_token = create_refresh_token(data={"sub": user.username})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh")
async def refresh_token_endpoint(
    refresh_token: str = Form(...),
):
    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type",
            )

        username = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token",
            )

        new_access_token = create_access_token(
            data={"sub": username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
        }

    except InvalidTokenError as err:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        ) from err


@router.get("/me")
async def read_me(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserProfileRead:

    userprofile = await service.get_user_profile(current_user.username)

    if not userprofile:
        raise HTTPException(
            status_code=404,
            detail="User profile not found",
        )

    return userprofile


@router.get("/")
async def index(request: Request):
    return templates.TemplateResponse(
        name="home.html",
        context={"request": request},
    )
