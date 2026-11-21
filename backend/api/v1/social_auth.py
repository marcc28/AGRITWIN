from fastapi import APIRouter, HTTPException

from models.userProfile import SocialTicketRequest
from services.social_auth_service import (
    SOCIAL_PROVIDERS,
    complete_social_login,
    consume_social_auth_ticket,
)

router = APIRouter()


@router.post("/social/{provider}/exchange")
async def exchange_social_ticket(provider: str, body: SocialTicketRequest):
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=404, detail="Social provider is not supported")
    identity = await consume_social_auth_ticket(body.ticket, provider)
    return await complete_social_login(provider, identity)
