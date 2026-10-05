import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from db import AsyncSessionLocal, Base, engine, init_db
from models.user import UserCreate, UserRead
from models.userProfile import UserProfileRead
from services.user_service import UserService

# Re-export explícit (per ruff i per importacions)
__all__ = ["AsyncSessionLocal", "Base", "engine", "init_db"]
#from .auth import get_current_user

PRODUCTION = os.environ.get("PRODUCTION") == "True"

router = APIRouter()

BASE_URL = "http://localhost:8000/profile_images/"
UPLOAD_DIR = "app/profile_images/"


async def get_user_service() -> UserService:
    async with AsyncSessionLocal() as session:
        yield UserService(session=session)


@router.get("/users", response_model=list[UserRead])
async def get_users(
    offset: int = 0, limit: int = 10, service: UserService = Depends(get_user_service)
):
    return await service.list_users(offset=offset, limit=limit)


@router.get("/user_profile", response_model=list[UserProfileRead])
async def get_user_profiles(
    offset: int = 0,
    limit: int = 10,
    nickname: str | None = None,
    service: UserService = Depends(get_user_service),
):
    return await service.list_users_profile(limit=limit, offset=offset, nickname=nickname)


@router.post("/users", response_model=UserRead)
async def create_user(
    user: UserCreate,
    service: UserService = Depends(get_user_service),
):
    if not user.privacy_terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Privacy terms must be accepted",
        )

    if not user.security_terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security terms must be accepted",
        )

    if user.password != user.password_conf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    return await service.create_user(
        user.username,
        user.email,
        user.password,
        user.privacy_terms_accepted,
        user.security_terms_accepted,
    )


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(user_id: uuid.UUID, service: UserService = Depends(get_user_service)):
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/user_profile/{user_id}", response_model=UserProfileRead)
async def get_user_profile(user_id: uuid.UUID, service: UserService = Depends(get_user_service)):
    userprof = await service.get_user_profile(user_id)
    if not userprof:
        raise HTTPException(status_code=404, detail="Userprof not found")
    return userprof


@router.put("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    user: UserCreate,
    service: UserService = Depends(get_user_service),
):
    updated = await service.update_user(
        user_id, user.username, user.password, user.password_conf, user.email
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated
