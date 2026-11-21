import ipaddress
import os
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, parse_qsl, urlencode, urlsplit, urlunsplit

import jwt
from dotenv import load_dotenv
from fastapi import HTTPException
from sqlalchemy import delete

from api.v1.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
)
from db import AsyncSessionLocal
from db.schema import SocialAuthTicket
from services.user_service import UserService

load_dotenv()

SOCIAL_PROVIDERS = {"google", "facebook", "x"}
TICKET_LIFETIME = timedelta(minutes=3)


def validate_app_redirect_uri(uri: str, provider: str) -> str:
    parts = urlsplit(uri)
    if not parts.scheme or parts.fragment or parts.username or parts.password:
        raise HTTPException(status_code=400, detail="Invalid app redirect URI")
    expected_path = "/auth/oauth-callback"
    native_scheme_callback = (
        parts.scheme == "agritwin" and parts.netloc == "auth" and parts.path == "/oauth-callback"
    )
    if (not native_scheme_callback and not parts.path.endswith(expected_path)) or parse_qs(
        parts.query
    ).get("provider") != [provider]:
        raise HTTPException(status_code=400, detail="Invalid social login callback URI")

    if parts.scheme == "agritwin":
        if parts.netloc not in {"", "auth"}:
            raise HTTPException(status_code=400, detail="Invalid AgriTwin callback URI")
        return uri

    host = (parts.hostname or "").lower()
    allowed_hosts = {
        host.strip().lower()
        for host in os.getenv(
            "SOCIAL_AUTH_REDIRECT_HOSTS",
            "agritwin.com,www.agritwin.com,localhost,127.0.0.1,::1",
        ).split(",")
        if host.strip()
    }
    if parts.scheme == "exp":
        try:
            if host in {"localhost", "127.0.0.1"} or ipaddress.ip_address(host).is_private:
                return uri
        except ValueError:
            pass
        raise HTTPException(status_code=400, detail="Invalid Expo redirect URI")
    if parts.scheme in {"http", "https"} and host in allowed_hosts:
        return uri
    raise HTTPException(status_code=400, detail="App redirect URI is not allowed")


def add_ticket_to_redirect_uri(uri: str, ticket: str) -> str:
    parts = urlsplit(uri)
    query = parse_qsl(parts.query, keep_blank_values=True)
    query.append(("ticket", ticket))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ""))


async def create_social_auth_ticket(provider: str, identity: dict) -> str:
    ticket = secrets.token_urlsafe(32)
    async with AsyncSessionLocal() as db:
        await db.execute(
            delete(SocialAuthTicket).where(
                SocialAuthTicket.expires_at < datetime.now(UTC).replace(tzinfo=None)
            )
        )
        db.add(
            SocialAuthTicket(
                ticket=ticket,
                provider=provider,
                provider_user_id=str(identity["sub"]),
                email=identity.get("email"),
                display_name=identity.get("name") or "",
                expires_at=datetime.now(UTC).replace(tzinfo=None) + TICKET_LIFETIME,
            )
        )
        await db.commit()
    return ticket


async def consume_social_auth_ticket(ticket: str, expected_provider: str) -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            delete(SocialAuthTicket)
            .where(
                SocialAuthTicket.ticket == ticket,
                SocialAuthTicket.provider == expected_provider,
                SocialAuthTicket.expires_at > datetime.now(UTC).replace(tzinfo=None),
            )
            .returning(
                SocialAuthTicket.provider_user_id,
                SocialAuthTicket.email,
                SocialAuthTicket.display_name,
            )
        )
        row = result.one_or_none()
        await db.commit()
        if not row:
            raise HTTPException(status_code=401, detail="Social login ticket is invalid or expired")

        identity = {
            "sub": row.provider_user_id,
            "email": row.email,
            "name": row.display_name or "",
        }
        return identity


def create_social_signup_token(provider: str, identity: dict) -> str:
    return jwt.encode(
        {
            "purpose": "social_signup",
            "provider": provider,
            "provider_sub": str(identity["sub"]),
            "email": identity.get("email"),
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
        "username": username,
    }


async def complete_social_login(provider: str, identity: dict) -> dict:
    async with AsyncSessionLocal() as db:
        service = UserService(db)
        user = await service.get_user_by_auth_provider(provider, str(identity["sub"]))
        if user:
            return _token_pair(user.username)

        email = (identity.get("email") or "").strip().lower()
        if email and await service.get_user_by_email(email):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This email already belongs to an AgriTwin account. "
                    "Sign in with that account before linking this provider."
                ),
            )

    identity = {**identity, "sub": str(identity["sub"]), "email": email or None}
    return {
        "status": "signup_required",
        "signup_token": create_social_signup_token(provider, identity),
        "email": email,
        "name": identity.get("name", ""),
        "provider": provider,
    }
