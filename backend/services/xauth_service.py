import os
import time
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, Request

load_dotenv()

X_CLIENT_ID = os.getenv("X_CLIENT_ID")
X_CLIENT_SECRET = os.getenv("X_SECRET_KEY_APP")
X_REDIRECT_URI = os.getenv("X_REDIRECT_URI")
X_AUTH_URL = "https://x.com/i/oauth2/authorize"
X_TOKEN_URL = "https://api.x.com/2/oauth2/token"
X_API_BASE_URL = "https://api.x.com/2"
X_SCOPES = ("tweet.read", "users.read", "tweet.write", "offline.access")


class XAuthService:
    """Builds X OAuth URLs, exchanges authorization codes, and posts tweets."""

    @staticmethod
    def authorization_url(state: str, code_challenge: str) -> str:
        if not X_CLIENT_ID:
            raise HTTPException(status_code=503, detail="X OAuth client ID is not configured")
        params = urlencode(
            {
                "response_type": "code",
                "client_id": X_CLIENT_ID,
                "redirect_uri": X_REDIRECT_URI,
                "scope": " ".join(X_SCOPES),
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{X_AUTH_URL}?{params}"

    @staticmethod
    async def exchange_code(code: str, code_verifier: str) -> dict:
        if not X_CLIENT_ID:
            raise HTTPException(status_code=503, detail="X OAuth client ID is not configured")
        form = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": X_REDIRECT_URI,
            "code_verifier": code_verifier,
        }
        auth = XAuthService._client_auth(form)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(X_TOKEN_URL, data=form, auth=auth)
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise HTTPException(
                status_code=502, detail="X rejected the OAuth token exchange"
            ) from error
        except httpx.RequestError as error:
            raise HTTPException(status_code=502, detail="Could not communicate with X") from error
        return XAuthService._prepare_token(response.json())

    @staticmethod
    def _client_auth(form: dict) -> tuple[str, str] | None:
        if X_CLIENT_SECRET:
            return X_CLIENT_ID, X_CLIENT_SECRET
        form["client_id"] = X_CLIENT_ID
        return None

    @staticmethod
    def _prepare_token(token: dict) -> dict:
        if not token.get("access_token"):
            raise HTTPException(status_code=502, detail="X did not return an access token")
        if token.get("expires_in"):
            token["expires_at"] = time.time() + int(token["expires_in"])
        return token

    @staticmethod
    async def refresh_access_token(token: dict) -> dict:
        refresh_token = token.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=401, detail="X access token expired; reconnect your account"
            )
        form = {"grant_type": "refresh_token", "refresh_token": refresh_token}
        auth = XAuthService._client_auth(form)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(X_TOKEN_URL, data=form, auth=auth)
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise HTTPException(
                status_code=401, detail="X token refresh failed; reconnect your account"
            ) from error
        except httpx.RequestError as error:
            raise HTTPException(status_code=502, detail="Could not communicate with X") from error
        refreshed = XAuthService._prepare_token(response.json())
        if not refreshed.get("refresh_token"):
            refreshed["refresh_token"] = refresh_token
        return refreshed

    @staticmethod
    async def access_token_for_request(request: Request) -> str:
        token_id = request.session.get("x_token_id")
        tokens = getattr(request.app.state, "x_oauth_tokens", {})
        token = tokens.get(token_id)
        if not token or not token.get("access_token"):
            raise HTTPException(status_code=401, detail="Connect your X account first")
        if token.get("expires_at") and token["expires_at"] <= time.time():
            token = await XAuthService.refresh_access_token(token)
            tokens[token_id] = token
        return token["access_token"]

    @staticmethod
    async def create_post(access_token: str, text: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{X_API_BASE_URL}/tweets",
                    json={"text": text},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            status_code = 401 if error.response.status_code == 401 else 502
            detail = (
                "X access token is invalid; reconnect your account"
                if status_code == 401
                else "X could not publish the post"
            )
            raise HTTPException(status_code=status_code, detail=detail) from error
        except httpx.RequestError as error:
            raise HTTPException(status_code=502, detail="Could not communicate with X") from error
        return response.json()

    @staticmethod
    async def get_user_identity(access_token: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{X_API_BASE_URL}/users/me",
                    params={"user.fields": "name,username"},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()

        except httpx.HTTPStatusError as error:
            raise HTTPException(
                status_code=502,
                detail="Could not retrieve X user identity",
            ) from error

        except httpx.RequestError as error:
            raise HTTPException(
                status_code=502,
                detail="Could not communicate with X",
            ) from error

        data = response.json().get("data")

        if not data or not data.get("id"):
            raise HTTPException(
                status_code=502,
                detail="X did not return a valid user identity",
            )

        return {
            "id": data["id"],
            "username": data.get("username", ""),
            "name": data.get("name", ""),
        }
