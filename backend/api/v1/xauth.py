import base64
import hashlib
import secrets
from hmac import compare_digest

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

from services.social_auth_service import (
    add_ticket_to_redirect_uri,
    create_social_auth_ticket,
    validate_app_redirect_uri,
)
from services.xauth_service import XAuthService

router = APIRouter()


class XPostRequest(BaseModel):
    text: str = Field(min_length=1, max_length=280)


def _generate_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
    return verifier, challenge.rstrip(b"=").decode("ascii")


@router.get("/login")
async def x_auth_start(request: Request, app_redirect_uri: str | None = None):
    state = secrets.token_urlsafe(32)
    verifier, challenge = _generate_pkce()
    request.session["x_oauth_state"] = state
    request.session["x_code_verifier"] = verifier
    if app_redirect_uri:
        request.session["x_app_redirect_uri"] = validate_app_redirect_uri(app_redirect_uri, "x")
    return RedirectResponse(XAuthService.authorization_url(state, challenge), status_code=302)


@router.get("/callback")
async def x_auth_callback(request: Request):
    error = request.query_params.get("error")
    if error:
        raise HTTPException(status_code=400, detail="X authorization was denied")

    expected_state = request.session.pop("x_oauth_state", None)
    state = request.query_params.get("state")
    verifier = request.session.pop("x_code_verifier", None)
    if not expected_state or not state or not compare_digest(expected_state, state) or not verifier:
        raise HTTPException(status_code=400, detail="X OAuth session expired or invalid")

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="X authorization code missing")

    token = await XAuthService.exchange_code(code, verifier)
    if not hasattr(request.app.state, "x_oauth_tokens"):
        request.app.state.x_oauth_tokens = {}
    token_id = secrets.token_urlsafe(32)
    request.app.state.x_oauth_tokens[token_id] = token
    request.session["x_token_id"] = token_id
    app_redirect_uri = request.session.pop("x_app_redirect_uri", None)
    if app_redirect_uri:
        identity = await XAuthService.get_user_identity(token["access_token"])
        ticket = await create_social_auth_ticket(
            "x",
            {
                "sub": identity["id"],
                "email": None,
                "name": identity.get("name") or identity.get("username") or "",
            },
        )
        return RedirectResponse(add_ticket_to_redirect_uri(app_redirect_uri, ticket))

    return JSONResponse(
        {
            "success": True,
            "message": "X account connected",
            "token_type": token.get("token_type"),
            "expires_at": token.get("expires_at"),
        }
    )


@router.post("/tweets")
async def create_x_post(body: XPostRequest, request: Request):
    access_token = await XAuthService.access_token_for_request(request)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Post text cannot be empty")
    return await XAuthService.create_post(access_token, text)
