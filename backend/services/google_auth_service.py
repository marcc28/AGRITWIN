import os
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_ALLOWED_CLIENT_IDS = tuple(
    client_id.strip()
    for client_id in os.getenv("GOOGLE_ALLOWED_CLIENT_IDS", "").split(",")
    if client_id.strip()
)
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID not in GOOGLE_ALLOWED_CLIENT_IDS:
    GOOGLE_ALLOWED_CLIENT_IDS = (*GOOGLE_ALLOWED_CLIENT_IDS, GOOGLE_CLIENT_ID)


class GoogleAuthService:
    """Google OAuth operations and verified identity handling."""

    @staticmethod
    def authorization_url(state: str) -> str:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
            raise HTTPException(
                status_code=503,
                detail="Google OAuth client ID, secret, and redirect URI must be configured",
            )
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    @staticmethod
    async def exchange_code(code: str) -> str:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
            raise HTTPException(status_code=503, detail="Google OAuth is not configured")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "redirect_uri": GOOGLE_REDIRECT_URI,
                        "grant_type": "authorization_code",
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=502, detail="Could not communicate with Google"
            ) from error
        token = response.json().get("id_token")
        if not token:
            raise HTTPException(status_code=400, detail="Missing Google ID token")
        return token

    @staticmethod
    def identity_from_token(token: str) -> dict:
        if not GOOGLE_ALLOWED_CLIENT_IDS:
            raise HTTPException(
                status_code=503, detail="Google sign-in is not configured on this server"
            )
        last_error = None
        for client_id in GOOGLE_ALLOWED_CLIENT_IDS:
            try:
                identity = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
                break
            except ValueError as error:
                last_error = error
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid Google ID token. Check that its audience matches a configured OAuth client ID.",
            ) from last_error

        subject = identity.get("sub")
        email = (identity.get("email") or "").strip().lower()
        if not subject or not email:
            raise HTTPException(status_code=400, detail="Google account information is incomplete")
        if not identity.get("email_verified"):
            raise HTTPException(status_code=403, detail="Google email is not verified")
        return {**identity, "sub": subject, "email": email}
