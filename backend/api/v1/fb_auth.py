import secrets

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from services.fb_auth_service import FacebookAuthService

router = APIRouter()


@router.get("/facebook/login")
async def facebook_login(request: Request):
    state = secrets.token_urlsafe(32)
    request.session["facebook_oauth_state"] = state
    return RedirectResponse(FacebookAuthService.authorization_url(state))


@router.get("/facebook/callback")
async def facebook_callback(request: Request):
    error = request.query_params.get("error")
    if error:
        raise HTTPException(status_code=400, detail=f"Facebook authentication failed: {error}")

    expected_state = request.session.pop("facebook_oauth_state", None)
    state = request.query_params.get("state")
    if not expected_state or not state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(status_code=400, detail="Invalid Facebook OAuth state")

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Facebook authorization code missing")

    identity = await FacebookAuthService.fetch_identity(code)
    return {
        "provider": "facebook",
        "id": identity.get("id"),
        "name": identity.get("name"),
        "email": identity.get("email"),
    }
