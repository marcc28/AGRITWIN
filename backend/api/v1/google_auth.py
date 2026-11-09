import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from jwt.exceptions import InvalidTokenError

from api.v1.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
)
from db import AsyncSessionLocal
from models.userProfile import SocialLoginRequest, SocialSignupRequest
from services.google_auth_service import GoogleAuthService
from services.social_auth_service import SOCIAL_PROVIDERS
from services.user_service import UserService

router = APIRouter()
templates = Jinja2Templates(directory="templates")


def _signup_token(provider: str, identity: dict) -> str:
    return jwt.encode(
        {
            "purpose": "social_signup",
            "provider": provider,
            "provider_sub": identity["sub"],
            "email": identity["email"],
            "name": identity.get("name", ""),
            "exp": datetime.now(UTC) + timedelta(minutes=10),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _token_pair(username: str) -> dict[str, str]:
    return {
        "access_token": create_access_token(
            {"sub": username, "type": "access"},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        ),
        "refresh_token": create_refresh_token({"sub": username}),
        "token_type": "bearer",
    }


@router.post("/social/google/login")
async def social_google_login(body: SocialLoginRequest):
    identity = GoogleAuthService.identity_from_token(body.id_token)
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        user = await service.get_user_by_auth_provider("google", identity["sub"])
        if user:
            return _token_pair(user.username)
        if await service.get_user_by_email(identity["email"]):
            raise HTTPException(
                status_code=409,
                detail="This email already belongs to an AgriTwin account. Sign in with that account before linking Google.",
            )
    return {
        "status": "signup_required",
        "signup_token": _signup_token("google", identity),
        "email": identity["email"],
        "name": identity.get("name", ""),
    }


@router.post("/social/signup")
async def complete_social_signup(body: SocialSignupRequest):
    try:
        data = jwt.decode(body.signup_token, SECRET_KEY, algorithms=[ALGORITHM])
    except InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Signup token expired or invalid") from error
    provider = data.get("provider")
    if data.get("purpose") != "social_signup" or provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=401, detail="Invalid signup token")
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username cannot be empty")
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        if await service.get_user_by_auth_provider(provider, data["provider_sub"]):
            raise HTTPException(status_code=409, detail="Social account already registered")
        email = data.get("email") or (str(body.email).strip().lower() if body.email else "")
        if not email:
            raise HTTPException(status_code=422, detail="Email is required to complete this social signup")
        user = await service.create_social_user(
            username=username,
            email=email,
            provider=provider,
            provider_user_id=data["provider_sub"],
            privacy_terms_accepted=body.privacy_terms_accepted,
            security_terms_accepted=body.security_terms_accepted,
            display_name=data.get("name"),
        )
    return {**_token_pair(user.username), "username": user.username}


@router.get("/login")
async def google_login(request: Request):
    state = secrets.token_urlsafe(32)
    request.session["google_oauth_state"] = state
    return RedirectResponse(GoogleAuthService.authorization_url(state))


@router.get("/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if error:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {error}")
    expected = request.session.pop("google_oauth_state", None)
    if not expected or not state or not secrets.compare_digest(expected, state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")
    identity = GoogleAuthService.identity_from_token(await GoogleAuthService.exchange_code(code))

    async with AsyncSessionLocal() as db:
        service = UserService(db)
        user = await service.get_user_by_auth_provider("google", identity["sub"])
        if not user:
            if await service.get_user_by_email(identity["email"]):
                raise HTTPException(
                    status_code=409,
                    detail="This email already belongs to an AgriTwin account. Sign in with that account before linking Google.",
                )
            signup_token = jwt.encode(
                {
                    "purpose": "google_signup",
                    "google_sub": identity["sub"],
                    "email": identity["email"],
                    "name": identity.get("name") or "",
                    "exp": datetime.now(UTC) + timedelta(minutes=10),
                },
                SECRET_KEY,
                algorithm=ALGORITHM,
            )
            return templates.TemplateResponse(
                request=request,
                name="complete_google_signup.html",
                context={"name": identity.get("name") or "", "email": identity["email"], "signup_token": signup_token},
            )
    access_token = create_access_token(
        {"sub": user.username, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={"name": user.username, "access_token": access_token},
    )


@router.post("/complete-google-signup")
async def complete_google_signup(
    request: Request,
    signup_token: str = Form(...),
    username: str = Form(...),
    privacy_terms_accepted: bool = Form(False),
    security_terms_accepted: bool = Form(False),
):
    try:
        data = jwt.decode(signup_token, SECRET_KEY, algorithms=[ALGORITHM])
    except InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Signup token expired or invalid") from error
    if data.get("purpose") != "google_signup":
        raise HTTPException(status_code=401, detail="Invalid signup token")
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        if await service.get_user_by_auth_provider("google", data["google_sub"]):
            raise HTTPException(status_code=409, detail="Google account already registered")
        user = await service.create_google_user(
            username=username.strip(),
            email=data["email"],
            google_id=data["google_sub"],
            privacy_terms_accepted=privacy_terms_accepted,
            security_terms_accepted=security_terms_accepted,
        )
    access_token = create_access_token(
        {"sub": user.username, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={"name": user.username, "access_token": access_token},
    )


@router.get("/welcome")
async def welcome(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={
            "name": request.session.get("user_name", "Guest"),
            "access_token": request.session.get("access_token"),
        },
    )
