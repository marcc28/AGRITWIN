import json
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

from google import genai
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from db.schema import Crop, Field, FieldCrop, FieldRecommendation
from prompts.field_recommendation_prompt import build_recommendation_prompt

api_key = os.getenv("GEMINI_API_KEY")
model_gemini = os.getenv("MODEL_USE_IN_RECOMENDATION")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")

if not model_gemini:
    raise RuntimeError("MODEL_USE_IN_RECOMENDATION is not configured")


def serialize_rows(rows):
    serialized = []

    for row in rows:
        item = dict(row)

        for key, value in item.items():
            if isinstance(value, (datetime,)):
                item[key] = value.isoformat()

        serialized.append(item)

    return serialized


class FieldRecommendationService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def field_belongs_to_user(
        self,
        field_id: int,
        user_id: UUID,
    ) -> bool:
        result = await self._db.execute(
            select(Field.id).where(
                Field.id == field_id,
                Field.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def list_recommendations(
        self,
        user_id: UUID,
        field_id: int | None = None,
        offset: int = 0,
        limit: int = 10,
    ) -> list[FieldRecommendation]:

        query = (
            select(FieldRecommendation)
            .join(
                Field,
                FieldRecommendation.field_id == Field.id,
            )
            .where(Field.user_id == user_id)
            .order_by(FieldRecommendation.generated_at.desc())
            .offset(offset)
            .limit(limit)
        )

        if field_id is not None:
            query = query.where(FieldRecommendation.field_id == field_id)

        result = await self._db.execute(query)
        return list(result.scalars().all())

    async def get_recommendation(
        self,
        recommendation_id: UUID,
        user_id: UUID,
    ) -> FieldRecommendation | None:

        result = await self._db.execute(
            select(FieldRecommendation)
            .join(
                Field,
                FieldRecommendation.field_id == Field.id,
            )
            .where(
                FieldRecommendation.id == recommendation_id,
                Field.user_id == user_id,
            )
        )

        return result.scalar_one_or_none()

    async def create_recommendation(
        self,
        data: dict,
    ) -> FieldRecommendation:

        recommendation = FieldRecommendation(**data)

        self._db.add(recommendation)
        await self._db.commit()
        await self._db.refresh(recommendation)

        return recommendation

    async def update_recommendation(
        self,
        recommendation_id: UUID,
        user_id: UUID,
        data: dict,
    ) -> FieldRecommendation | None:

        recommendation = await self.get_recommendation(
            recommendation_id,
            user_id,
        )

        if recommendation is None:
            return None

        for key, value in data.items():
            setattr(recommendation, key, value)

        await self._db.commit()
        await self._db.refresh(recommendation)

        return recommendation

    async def delete_recommendation(
        self,
        recommendation_id: UUID,
        user_id: UUID,
    ) -> bool:

        recommendation = await self.get_recommendation(
            recommendation_id,
            user_id,
        )

        if recommendation is None:
            return False

        await self._db.delete(recommendation)
        await self._db.commit()

        return True

    async def count_recommendations(
        self,
        user_id: UUID,
        field_id: int | None = None,
    ) -> int:

        query = (
            select(func.count())
            .select_from(FieldRecommendation)
            .join(
                Field,
                FieldRecommendation.field_id == Field.id,
            )
            .where(Field.user_id == user_id)
        )

        if field_id is not None:
            query = query.where(FieldRecommendation.field_id == field_id)

        result = await self._db.execute(query)
        return result.scalar_one()

    async def get_nearby_fields(
        self,
        field_id: int,
        user_id: UUID,
        radius_meters: int = 1000,
    ):
        target = aliased(Field)

        distance = (
            6371000
            * 2
            * func.asin(
                func.sqrt(
                    func.power(
                        func.sin(func.radians(Field.lat - target.lat) / 2),
                        2,
                    )
                    + func.cos(func.radians(target.lat))
                    * func.cos(func.radians(Field.lat))
                    * func.power(
                        func.sin(func.radians(Field.lon - target.lon) / 2),
                        2,
                    )
                )
            )
        )

        query = (
            select(
                Field.id,
                Field.name,
                Field.lat,
                Field.lon,
                Field.soil_type,
                Field.field_type,
                distance.label("distance_meters"),
            )
            .join(
                target,
                target.id == field_id,
            )
            .where(
                Field.id != field_id,
                Field.user_id == user_id,
                Field.lat.is_not(None),
                Field.lon.is_not(None),
                target.lat.is_not(None),
                target.lon.is_not(None),
                distance <= radius_meters,
            )
            .order_by(distance)
        )

        result = await self._db.execute(query)

        return result.mappings().all()

    async def _get_active_recommendations(
        self,
        field_id: int,
        now: datetime,
    ) -> list[FieldRecommendation]:

        latest_generation_expiry = (
            select(func.max(FieldRecommendation.expires_at))
            .where(
                FieldRecommendation.field_id == field_id,
                FieldRecommendation.expires_at > now,
            )
            .scalar_subquery()
        )

        result = await self._db.execute(
            select(FieldRecommendation)
            .where(
                FieldRecommendation.field_id == field_id,
                FieldRecommendation.expires_at == latest_generation_expiry,
            )
            .order_by(FieldRecommendation.generated_at.asc())
        )

        return list(result.scalars().all())

    async def get_crops_from_fields(
        self,
        field_ids: list[int],
    ):
        if not field_ids:
            return []

        query = (
            select(
                Field.id.label("field_id"),
                FieldCrop.status,
                Crop.name,
                Crop.scientific_name,
                Crop.category,
                FieldCrop.planted_at,
                FieldCrop.expected_harvest_at,
            )
            .join(
                FieldCrop,
                FieldCrop.field_id == Field.id,
            )
            .join(
                Crop,
                Crop.id == FieldCrop.crop_id,
            )
            .where(
                Field.id.in_(field_ids),
                FieldCrop.status.in_(["planned", "planted"]),
            )
        )

        result = await self._db.execute(query)

        return result.mappings().all()

    async def get_or_generate_recommendations(
        self,
        field_id: int,
        user_id: UUID,
        radius_meters: int = 1000,
        force_refresh: bool = False,
    ) -> list[FieldRecommendation] | None:

        # --------------------------------------------------
        # 1. Comprovar que el camp pertany a l'usuari
        # --------------------------------------------------

        belongs = await self.field_belongs_to_user(
            field_id=field_id,
            user_id=user_id,
        )

        if not belongs:
            return None

        now = datetime.now(timezone.utc)

        # --------------------------------------------------
        # 2. Buscar recomanacions vigents a PostgreSQL
        # --------------------------------------------------

        if not force_refresh:
            existing_recommendations = await self._get_active_recommendations(
                field_id=field_id,
                now=now,
            )
            if existing_recommendations:
                return existing_recommendations
        # --------------------------------------------------
        # 3. Recuperar les dades del camp principal
        # --------------------------------------------------

        result = await self._db.execute(select(Field).where(Field.id == field_id))

        field = result.scalar_one_or_none()

        if field is None:
            return None

        field_context = field.to_dict()

        # --------------------------------------------------
        # 4. Recuperar els cultius del camp principal
        # --------------------------------------------------

        field_crops = await self.get_crops_from_fields(
            field_ids=[field_id],
        )

        # --------------------------------------------------
        # 5. Recuperar camps propers
        # Reutilitzem get_nearby_fields()
        # --------------------------------------------------

        nearby_fields = await self.get_nearby_fields(
            field_id=field_id,
            user_id=user_id,
            radius_meters=radius_meters,
        )

        nearby_fields = [dict(row) for row in nearby_fields]

        nearby_field_ids = [field["id"] for field in nearby_fields]

        # --------------------------------------------------
        # 6. Recuperar els cultius dels camps propers
        # Reutilitzem get_crops_from_fields()
        # --------------------------------------------------

        nearby_crops = await self.get_crops_from_fields(
            field_ids=nearby_field_ids,
        )

        # --------------------------------------------------
        # 7. Construir el context per a Gemini
        # --------------------------------------------------
        context = {
            "current_date": now.date().isoformat(),
            "main_field": field_context,
            "main_field_crops": serialize_rows(field_crops),
            "nearby_fields": nearby_fields,
            "nearby_fields_crops": serialize_rows(nearby_crops),
        }

        # --------------------------------------------------
        # 8. Preparar la petició a Gemini Flash
        # --------------------------------------------------
        client = genai.Client(api_key=api_key)

        prompt = build_recommendation_prompt(context)
        # --------------------------------------------------
        # 9. Cridar Gemini Flash
        # --------------------------------------------------

        response = await client.aio.interactions.create(
            model=model_gemini,
            input=prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 3000
            },
        )

        # Recuperar resposta
        response_text = response.output_text
        if not response_text:
            raise RuntimeError("Gemini returned an empty response")

        try:
            ai_data = json.loads(response_text)

        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Gemini returned invalid JSON: {response_text}") from exc

        recommendations_data = ai_data.get("recommendations")

        if not isinstance(recommendations_data, list):
            raise RuntimeError("Invalid Gemini response structure")

        # --------------------------------------------------
        # 10. Validar i guardar les recomanacions
        # --------------------------------------------------

        valid_categories = {
            "soil",
            "irrigation",
            "crops",
            "fertilization",
            "pests",
            "weather",
            "general",
        }

        valid_severities = {
            "info",
            "low",
            "medium",
            "high",
        }

        saved_recommendations = []

        expires_at = now + timedelta(days=7)

        for item in recommendations_data:
            if not isinstance(item, dict):
                continue

            category = item.get("category")
            title = item.get("title")
            description = item.get("description")
            severity = item.get("severity")
            based_on = item.get("based_on", {})

            if (
                category not in valid_categories
                or severity not in valid_severities
                or not isinstance(title, str)
                or not title.strip()
                or not isinstance(description, str)
                or not description.strip()
                or not isinstance(based_on, dict)
            ):
                continue

            recommendation = await self.create_recommendation(
                data={
                    "field_id": field_id,
                    "category": category,
                    "title": title.strip(),
                    "description": description.strip(),
                    "severity": severity,
                    "based_on": based_on,
                    "model": model_gemini,
                    "generated_at": now,
                    "expires_at": expires_at,
                }
            )

            saved_recommendations.append(recommendation)

        # --------------------------------------------------
        # 11. Retornar les recomanacions guardades
        # --------------------------------------------------

        if not saved_recommendations:
            raise RuntimeError("Gemini did not generate any valid recommendations")

        return saved_recommendations
