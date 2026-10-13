from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserConsentCreate(BaseModel):
    document_type: str
    document_version: str


class UserConsentRead(BaseModel):
    id: int
    user_id: UUID
    document_type: str
    document_version: str
    accepted_at: datetime
