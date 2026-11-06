from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from api.v1.auth import get_current_user
from db import AsyncSessionLocal
from db.schema import User
from models.field_recommendations import (
    FieldRecommendationCreate,
    FieldRecommendationRead,
    FieldRecommendationUpdate,
)
from services.field_recommendations_service import (
    FieldRecommendationService,
)
from services.rate_limit import enforce_ai_rate_limit

router = APIRouter(
    tags=["Field Recommendations"],
    dependencies=[Depends(get_current_user)],
)


async def get_field_recommendation_service():
    async with AsyncSessionLocal() as session:
        yield FieldRecommendationService(session=session)


# --------------------------------------------------
# GET: Obtenir recomanacions d'un camp
# --------------------------------------------------


@router.get(
    "/fields/{field_id}/recommendations",
    response_model=list[FieldRecommendationRead],
    dependencies=[Depends(enforce_ai_rate_limit)],
)
async def get_field_recommendations(
    field_id: int,
    radius_meters: int = Query(1000, ge=100, le=10000),
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    recommendations = await service.get_or_generate_recommendations(
        field_id=field_id,
        user_id=current_user.id,
        radius_meters=radius_meters,
    )

    if recommendations is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    return recommendations


# --------------------------------------------------
# POST: Forçar la generació de noves recomanacions
# --------------------------------------------------


@router.post(
    "/fields/{field_id}/recommendations/refresh",
    response_model=list[FieldRecommendationRead],
    dependencies=[Depends(enforce_ai_rate_limit)],
)
async def refresh_field_recommendations(
    field_id: int,
    radius_meters: int = Query(1000, ge=100, le=10000),
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    recommendations = await service.get_or_generate_recommendations(
        field_id=field_id,
        user_id=current_user.id,
        radius_meters=radius_meters,
        force_refresh=True,
    )

    if recommendations is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    return recommendations


# --------------------------------------------------
# GET: Llistar recomanacions de l'usuari
# --------------------------------------------------


@router.get(
    "/field-recommendations",
    response_model=list[FieldRecommendationRead],
)
async def get_recommendations(
    field_id: int | None = Query(None, gt=0),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    return await service.list_recommendations(
        user_id=current_user.id,
        field_id=field_id,
        offset=offset,
        limit=limit,
    )


# --------------------------------------------------
# GET: Comptar recomanacions
# --------------------------------------------------


@router.get(
    "/field-recommendations/count",
)
async def count_recommendations(
    field_id: int | None = Query(None, gt=0),
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    total = await service.count_recommendations(
        user_id=current_user.id,
        field_id=field_id,
    )

    return {"total": total}


# --------------------------------------------------
# GET: Obtenir una recomanació per UUID
# --------------------------------------------------


@router.get(
    "/field-recommendations/{recommendation_id}",
    response_model=FieldRecommendationRead,
)
async def get_recommendation(
    recommendation_id: UUID,
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    recommendation = await service.get_recommendation(
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )

    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return recommendation


# --------------------------------------------------
# POST: Crear una recomanació manualment
# --------------------------------------------------


@router.post(
    "/field-recommendations",
    response_model=FieldRecommendationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_recommendation(
    data: FieldRecommendationCreate,
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    belongs = await service.field_belongs_to_user(
        field_id=data.field_id,
        user_id=current_user.id,
    )

    if not belongs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    return await service.create_recommendation(data=data.model_dump())


# --------------------------------------------------
# PATCH: Actualitzar una recomanació
# --------------------------------------------------


@router.patch(
    "/field-recommendations/{recommendation_id}",
    response_model=FieldRecommendationRead,
)
async def update_recommendation(
    recommendation_id: UUID,
    data: FieldRecommendationUpdate,
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    update_data = data.model_dump(exclude_unset=True)

    # No permetre canviar el camp associat
    if "field_id" in update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot change the field of a recommendation",
        )

    recommendation = await service.update_recommendation(
        recommendation_id=recommendation_id,
        user_id=current_user.id,
        data=update_data,
    )

    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return recommendation


# --------------------------------------------------
# DELETE: Eliminar una recomanació
# --------------------------------------------------


@router.delete(
    "/field-recommendations/{recommendation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_recommendation(
    recommendation_id: UUID,
    current_user: User = Depends(get_current_user),
    service: FieldRecommendationService = Depends(get_field_recommendation_service),
):
    deleted = await service.delete_recommendation(
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
