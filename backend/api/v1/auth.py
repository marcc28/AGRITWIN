import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, Field
from sqlalchemy import text

from db import AsyncSessionLocal, User
from models.token import Token
from models.userProfile import EmailUpdate, MeRead, MeUpdate, PasswordUpdate
from services.user_service import UserService

load_dotenv()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no està configurada al .env")


router = APIRouter()

password_hash = PasswordHash.recommended()

# GOOGLE IDS:
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_ALLOWED_CLIENT_IDS = tuple(
    client_id.strip()
    for client_id in os.getenv("GOOGLE_ALLOWED_CLIENT_IDS", "").split(",")
    if client_id.strip()
)
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID not in GOOGLE_ALLOWED_CLIENT_IDS:
    GOOGLE_ALLOWED_CLIENT_IDS = (*GOOGLE_ALLOWED_CLIENT_IDS, GOOGLE_CLIENT_ID)

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")


# remove in the future just to try in the backend the oauth:
templates = Jinja2Templates(directory="templates")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token")


class SocialLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class SocialSignupRequest(BaseModel):
    signup_token: str = Field(min_length=1)
    username: str = Field(min_length=1, max_length=255)
    privacy_terms_accepted: bool
    security_terms_accepted: bool


def verify_google_id_token(token: str) -> dict:
    if not GOOGLE_ALLOWED_CLIENT_IDS:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not configured on this server",
        )

    last_error = None
    for client_id in GOOGLE_ALLOWED_CLIENT_IDS:
        try:
            return id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as error:
            last_error = error

    raise HTTPException(
        status_code=401,
        detail=(
            "Invalid Google ID token. Check that its audience matches one of "
            "the configured Google OAuth client IDs."
        ),
    ) from last_error


def create_social_signup_token(provider: str, identity: dict) -> str:
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


def create_token_pair(username: str) -> dict[str, str]:
    return {
        "access_token": create_access_token(
            {"sub": username, "type": "access"},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        ),
        "refresh_token": create_refresh_token({"sub": username}),
        "token_type": "bearer",
    }


def google_identity_from_token(token: str) -> dict:
    identity = verify_google_id_token(token)
    subject = identity.get("sub")
    email = (identity.get("email") or "").strip().lower()
    if not subject or not email:
        raise HTTPException(
            status_code=400,
            detail="Google account information is incomplete",
        )
    if not identity.get("email_verified"):
        raise HTTPException(status_code=403, detail="Google email is not verified")
    return {**identity, "sub": subject, "email": email}


@router.post("/social/{provider}/login")
async def social_login(provider: str, body: SocialLoginRequest):
    if provider != "google":
        raise HTTPException(status_code=501, detail="Social provider is not supported yet")

    identity = google_identity_from_token(body.id_token)
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        user = await service.get_user_by_auth_provider(provider, identity["sub"])
        if user:
            return create_token_pair(user.username)

        existing_user = await service.get_user_by_email(identity["email"])
        if existing_user:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This email already belongs to an AgriTwin account. "
                    "Sign in with that account before linking Google."
                ),
            )

    return {
        "status": "signup_required",
        "signup_token": create_social_signup_token(provider, identity),
        "email": identity["email"],
        "name": identity.get("name", ""),
    }


@router.post("/social/signup")
async def complete_social_signup(body: SocialSignupRequest):
    try:
        signup_data = jwt.decode(
            body.signup_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except InvalidTokenError as error:
        raise HTTPException(
            status_code=401,
            detail="Signup token expired or invalid",
        ) from error

    provider = signup_data.get("provider")
    if signup_data.get("purpose") != "social_signup" or provider != "google":
        raise HTTPException(status_code=401, detail="Invalid signup token")

    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username cannot be empty")

    async with AsyncSessionLocal() as db:
        service = UserService(db)
        if await service.get_user_by_auth_provider(
            provider,
            signup_data["provider_sub"],
        ):
            raise HTTPException(status_code=409, detail="Social account already registered")

        user = await service.create_social_user(
            username=username,
            email=signup_data["email"],
            provider=provider,
            provider_user_id=signup_data["provider_sub"],
            privacy_terms_accepted=body.privacy_terms_accepted,
            security_terms_accepted=body.security_terms_accepted,
            display_name=signup_data.get("name"),
        )

    return create_token_pair(user.username)


@router.get("/")
async def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={})


# 1. Redirect user to Google
@router.get("/login")
async def google_login(request: Request):

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth client ID, secret, and redirect URI must be configured",
        )

    # CSRF protection
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
    }

    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    return RedirectResponse(url=google_auth_url)


# 2. Google callback


@router.get("/callback")
async def auth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if error:
        raise HTTPException(
            status_code=400,
            detail=f"Google authentication failed: {error}",
        )

    # 1. Validar OAuth state
    expected_state = request.session.pop("oauth_state", None)

    if not expected_state or not state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state",
        )

    if not code:
        raise HTTPException(
            status_code=400,
            detail="Authorization code missing",
        )

    # 2. Intercanviar el codi per tokens de Google
    token_url = "https://oauth2.googleapis.com/token"

    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()

        token_response = response.json()
        id_token_value = token_response.get("id_token")

        if not id_token_value:
            raise HTTPException(
                status_code=400,
                detail="Missing Google ID token",
            )

        # Verify signature, issuer, expiration, and configured client audiences.
        id_info = google_identity_from_token(id_token_value)

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not communicate with Google",
        )
    except HTTPException:
        raise

    # 4. Obtenir les dades verificades
    google_id = id_info["sub"]
    email = id_info["email"]
    name = id_info.get("name") or ""

    if not google_id or not email:
        raise HTTPException(
            status_code=400,
            detail="Google account information is incomplete",
        )

    # 5. Buscar l'usuari per la identitat de Google
    async with AsyncSessionLocal() as db:
        service = UserService(db)

        user = await service.get_user_by_google_id(google_id)

        if user:
            # Ja té Google vinculat: iniciar sessió
            pass

        else:
            # Comprovar si el correu ja pertany a un altre compte
            existing_user = await service.get_user_by_email(email)

            if existing_user:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "This email already belongs to an AgriTwin account. "
                        "Sign in with that account before linking Google."
                    ),
                )

            # Nou usuari: encara no el creem.
            # Primer ha d'escollir username i acceptar els termes.
            signup_token = jwt.encode(
                {
                    "purpose": "google_signup",
                    "google_sub": google_id,
                    "email": email,
                    "name": name,
                    "exp": datetime.now(UTC) + timedelta(minutes=10),
                },
                SECRET_KEY,
                algorithm=ALGORITHM,
            )

            return templates.TemplateResponse(
                request=request,
                name="complete_google_signup.html",
                context={
                    "name": name,
                    "email": email,
                    "signup_token": signup_token,
                },
            )

    # 6. Crear JWT propi d'AgriTwin
    access_token = create_access_token(
        data={
            "sub": user.username,
            "type": "access",
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={
            "name": user.username,
            "access_token": access_token,
        },
    )


@router.post("/complete-google-signup")
async def complete_google_signup(
    request: Request,
    signup_token: str = Form(...),
    username: str = Form(...),
    privacy_terms_accepted: bool = Form(False),
    security_terms_accepted: bool = Form(False),
):
    # 1. Validar el token temporal de registre
    try:
        signup_data = jwt.decode(
            signup_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if signup_data.get("purpose") != "google_signup":
            raise HTTPException(
                status_code=401,
                detail="Invalid signup token",
            )

    except InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Signup token expired or invalid",
        )

    email = signup_data["email"]
    google_id = signup_data["google_sub"]

    # 2. Crear l'usuari
    async with AsyncSessionLocal() as db:
        service = UserService(db)

        # Evitar crear comptes duplicats
        existing_google_user = await service.get_user_by_google_id(google_id)

        if existing_google_user:
            raise HTTPException(
                status_code=409,
                detail="Google account already registered",
            )

        user = await service.create_google_user(
            username=username,
            email=email,
            google_id=google_id,
            privacy_terms_accepted=privacy_terms_accepted,
            security_terms_accepted=security_terms_accepted,
        )

    # 3. Crear JWT d'AgriTwin
    access_token = create_access_token(
        data={
            "sub": user.username,
            "type": "access",
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={
            "name": user.username,
            "access_token": access_token,
        },
    )


# 3. Welcome page
@router.get("/welcome")
async def welcome(request: Request):

    name = request.session.get("user_name", "Guest")
    access_token = request.session.get("access_token")

    return templates.TemplateResponse(
        request=request,
        name="welcome.html",
        context={
            "name": name,
            "access_token": access_token,
        },
    )


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

        if not user.password_hash:
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


PROFILE_COLUMNS = "name, language, notifications_enabled, weather_alerts_enabled"
PROFILE_NOT_FOUND = "User profile not found"


def _me_from_row(current_user: User, row) -> MeRead:
    return MeRead(
        username=current_user.username,
        email=current_user.email,
        name=row.name,
        language=row.language,
        notifications_enabled=row.notifications_enabled,
        weather_alerts_enabled=row.weather_alerts_enabled,
    )


@router.get(
    "/me",
    responses={
        404: {"description": "User profile not found"},
    },
)
async def read_me(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> MeRead:
    userprofile = await service.get_user_profile(current_user.id)

    if not userprofile:
        raise HTTPException(
            status_code=404,
            detail=PROFILE_NOT_FOUND,
        )

    return _me_from_row(current_user, userprofile)


@router.put(
    "/me",
    responses={
        400: {"description": "Name is required"},
        404: {"description": "User profile not found"},
    },
)
async def update_me(
    body: MeUpdate,
    current_user: User = Depends(get_current_user),
) -> MeRead:
    name = body.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required",
        )

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "UPDATE user_profile SET "
                "name = :name, "
                "language = :language, "
                "notifications_enabled = :notifications_enabled, "
                "weather_alerts_enabled = :weather_alerts_enabled "
                "WHERE id = :user_id "
                "RETURNING " + PROFILE_COLUMNS
            ),
            {
                "name": name,
                "language": body.language,
                "notifications_enabled": body.notifications_enabled,
                "weather_alerts_enabled": body.weather_alerts_enabled,
                "user_id": current_user.id,
            },
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(
                status_code=404,
                detail=PROFILE_NOT_FOUND,
            )
        await session.commit()

    return _me_from_row(current_user, row)


@router.put(
    "/me/email",
    responses={
        404: {"description": "User profile not found"},
        409: {"description": "Email already registered"},
    },
)
async def update_my_email(
    body: EmailUpdate,
    current_user: User = Depends(get_current_user),
) -> MeRead:
    new_email = str(body.email).strip().lower()
    async with AsyncSessionLocal() as session:
        taken = await session.execute(
            text("SELECT id FROM users WHERE lower(email) = :email AND id <> :user_id"),
            {"email": new_email, "user_id": current_user.id},
        )
        if taken.one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        await session.execute(
            text("UPDATE users SET email = :email WHERE id = :user_id"),
            {"email": new_email, "user_id": current_user.id},
        )
        result = await session.execute(
            text("SELECT " + PROFILE_COLUMNS + " FROM user_profile WHERE id = :user_id"),
            {"user_id": current_user.id},
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(
                status_code=404,
                detail=PROFILE_NOT_FOUND,
            )
        await session.commit()

    current_user.email = new_email
    return _me_from_row(current_user, row)


@router.put("/me/password")
async def update_my_password(
    body: PasswordUpdate,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if body.new_password != body.new_password_conf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    try:
        current_ok = verify_password(body.current_password, current_user.password_hash)
    except Exception:
        current_ok = False

    if not current_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    hashed = password_hash.hash(body.new_password)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE users SET password_hash = :password_hash WHERE id = :user_id"),
            {"password_hash": hashed, "user_id": current_user.id},
        )
        await session.commit()

    return {"detail": "Password updated"}
