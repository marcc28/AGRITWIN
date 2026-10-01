from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.user_service import (
    PRIVACY_TERMS_VERSION,
    SECURITY_TERMS_VERSION,
)

router = APIRouter(prefix="/legal", tags=["Legal"])

# Si legal.py està a app/routes/legal.py:
BASE_DIR = Path(__file__).resolve().parents[2]

PRIVACY_FILE = BASE_DIR / "PRIVACY.md"
SECURITY_FILE = BASE_DIR / "SECURITY.md"



class LegalDocumentResponse(BaseModel):
    document_type: str
    version: str
    content: str


def read_legal_document(
    file_path: Path,
    document_type: str,
    version: str,
) -> LegalDocumentResponse:

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Legal document not found: {file_path.name}",
        )

    try:
        content = file_path.read_text(encoding="utf-8")
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Could not read legal document",
        )

    return LegalDocumentResponse(
        document_type=document_type,
        version=version,
        content=content,
    )


@router.get("/privacy", response_model=LegalDocumentResponse)
async def get_privacy_policy():
    return read_legal_document(
        PRIVACY_FILE,
        "privacy_terms",
        PRIVACY_TERMS_VERSION,
    )


@router.get("/security", response_model=LegalDocumentResponse)
async def get_security_policy():
    return read_legal_document(
        SECURITY_FILE,
        "security_terms",
        SECURITY_TERMS_VERSION,
    )