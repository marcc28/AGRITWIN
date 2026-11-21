import os
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

FB_CLIENT_ID = os.getenv("FB_CLIENT_ID")
FB_CLIENT_SECRET = os.getenv("FB_CLIENT_SECRET")
FB_REDIRECT_URI = os.getenv("FB_REDIRECT_URI")
FB_GRAPH_VERSION = os.getenv("FB_GRAPH_VERSION", "v21.0").strip()


class FacebookAuthService:
    """Facebook OAuth code exchange and Graph API identity lookup."""

    @staticmethod
    def authorization_url(state: str) -> str:
        if not FB_CLIENT_ID or not FB_CLIENT_SECRET or not FB_REDIRECT_URI:
            raise HTTPException(status_code=503, detail="Facebook OAuth is not configured")
        params = urlencode(
            {
                "client_id": FB_CLIENT_ID,
                "redirect_uri": FB_REDIRECT_URI,
                "response_type": "code",
                "scope": "email,public_profile",
                "state": state,
            }
        )
        return f"https://www.facebook.com/{FB_GRAPH_VERSION}/dialog/oauth?{params}"

    @staticmethod
    async def fetch_identity(code: str) -> dict:
        if not FB_CLIENT_ID or not FB_CLIENT_SECRET or not FB_REDIRECT_URI:
            raise HTTPException(status_code=503, detail="Facebook OAuth is not configured")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_response = await client.get(
                    f"https://graph.facebook.com/{FB_GRAPH_VERSION}/oauth/access_token",
                    params={
                        "client_id": FB_CLIENT_ID,
                        "client_secret": FB_CLIENT_SECRET,
                        "redirect_uri": FB_REDIRECT_URI,
                        "code": code,
                    },
                )
                token_response.raise_for_status()
                access_token = token_response.json().get("access_token")
                if not access_token:
                    raise HTTPException(status_code=502, detail="Facebook access token missing")

                user_response = await client.get(
                    f"https://graph.facebook.com/{FB_GRAPH_VERSION}/me",
                    params={"fields": "id,name,email", "access_token": access_token},
                )
                user_response.raise_for_status()
                identity = user_response.json()
        except httpx.HTTPStatusError as error:
            raise HTTPException(
                status_code=502, detail="Facebook returned an authentication error"
            ) from error
        except httpx.RequestError as error:
            raise HTTPException(
                status_code=502, detail="Could not communicate with Facebook"
            ) from error
        if not identity.get("id"):
            raise HTTPException(
                status_code=502, detail="Facebook account information is incomplete"
            )
        return identity
