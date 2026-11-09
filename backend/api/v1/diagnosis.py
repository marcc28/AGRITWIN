from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from api.v1.auth import get_current_user
from db import User
from models.diagnosis import PlantDiagnosis
from services.plant_diagnosis_service import (
    DEFAULT_LANG,
    MAX_IMAGE_BYTES,
    DiagnosisError,
    FallbackDiagnosisService,
    validate_image,
)
from services.rate_limit import enforce_ai_rate_limit

router = APIRouter(prefix="/diagnosis", tags=["Diagnosis"])


def get_diagnosis_service() -> FallbackDiagnosisService:
    return FallbackDiagnosisService()


@router.post(
    "",
    response_model=PlantDiagnosis,
    dependencies=[Depends(enforce_ai_rate_limit)],
)
async def diagnose_plant(
    image: UploadFile = File(..., description="Foto JPEG o PNG de la planta (màx. 5 MB)"),
    lang: str = Query(DEFAULT_LANG, min_length=2, max_length=5, pattern=r"^[a-zA-Z_-]+$"),
    current_user: User = Depends(get_current_user),
    service: FallbackDiagnosisService = Depends(get_diagnosis_service),
):
    content = await image.read(MAX_IMAGE_BYTES + 1)
    try:
        content_type = validate_image(content, image.content_type)
        return await service.diagnose(content, content_type, lang)
    except DiagnosisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
