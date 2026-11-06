import json
import os
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest

# Required because the service validates these variables when imported.
os.environ.setdefault("GEMINI_API_KEY", "test-api-key")
os.environ.setdefault("MODEL_USE_IN_RECOMENDATION", "gemini-3.5-flash-lite")

from services.field_recommendations_service import (
    FieldRecommendationService,
    _read_env_setting,
    serialize_rows,
)


def result(*, one=None, rows=None, mappings=None):
    value = Mock()
    value.scalar_one_or_none.return_value = one
    value.scalar_one.return_value = one
    value.scalars.return_value.all.return_value = rows or []
    value.mappings.return_value.all.return_value = mappings or []
    return value


@pytest.fixture
def db():
    session = Mock()
    session.execute = AsyncMock()
    session.add = Mock()
    session.delete = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def service(db):
    return FieldRecommendationService(db)


def test_read_env_setting_strips_trailing_newline(monkeypatch):
    monkeypatch.setenv("MODEL_USE_IN_RECOMENDATION", "gemini-3.5-flash-lite\n")

    assert _read_env_setting("MODEL_USE_IN_RECOMENDATION") == "gemini-3.5-flash-lite"


# --------------------------------------------------
# SERIALIZATION
# --------------------------------------------------


def test_serialize_rows_converts_datetime_to_isoformat():
    date = datetime(2026, 11, 6, tzinfo=UTC)

    rows = [
        {
            "field_id": 1,
            "name": "Ordi",
            "planted_at": date,
        }
    ]

    serialized = serialize_rows(rows)

    assert serialized[0]["field_id"] == 1
    assert serialized[0]["name"] == "Ordi"
    assert serialized[0]["planted_at"] == date.isoformat()


def test_serialize_rows_preserves_other_values():
    rows = [{"field_id": 1, "name": "Pèsol", "status": "planned"}]

    assert serialize_rows(rows) == rows


def test_serialize_rows_returns_empty_list():
    assert serialize_rows([]) == []


# --------------------------------------------------
# FIELD OWNERSHIP
# --------------------------------------------------


@pytest.mark.asyncio
async def test_field_belongs_to_user(service, db):
    db.execute.return_value = result(one=7)

    assert await service.field_belongs_to_user(7, uuid4()) is True

    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_field_does_not_belong_to_user(service, db):
    db.execute.return_value = result(one=None)

    assert await service.field_belongs_to_user(7, uuid4()) is False


# --------------------------------------------------
# LIST RECOMMENDATIONS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_list_recommendations_returns_rows(service, db):
    rows = [
        SimpleNamespace(id=uuid4()),
        SimpleNamespace(id=uuid4()),
    ]

    db.execute.return_value = result(rows=rows)

    recommendations = await service.list_recommendations(
        user_id=uuid4(),
        offset=5,
        limit=2,
        field_id=7,
    )

    assert recommendations == rows
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_recommendations_without_field_filter(service, db):
    rows = [SimpleNamespace(id=uuid4())]
    db.execute.return_value = result(rows=rows)

    recommendations = await service.list_recommendations(
        user_id=uuid4(),
    )

    assert recommendations == rows


@pytest.mark.asyncio
async def test_list_recommendations_returns_empty_list(service, db):
    db.execute.return_value = result()

    assert await service.list_recommendations(uuid4()) == []


# --------------------------------------------------
# GET RECOMMENDATION
# --------------------------------------------------


@pytest.mark.asyncio
async def test_get_recommendation_returns_recommendation(service, db):
    recommendation = SimpleNamespace(id=uuid4())
    db.execute.return_value = result(one=recommendation)

    found = await service.get_recommendation(
        recommendation.id,
        uuid4(),
    )

    assert found is recommendation
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_recommendation_returns_none_when_not_found(service, db):
    db.execute.return_value = result(one=None)

    assert await service.get_recommendation(uuid4(), uuid4()) is None


# --------------------------------------------------
# CREATE RECOMMENDATION
# --------------------------------------------------


@pytest.mark.asyncio
async def test_create_recommendation_saves_record(service, db):
    data = {
        "field_id": 7,
        "category": "crops",
        "title": "Plantar pèsol",
        "description": "Bona opció després de l'ordi.",
        "severity": "medium",
        "based_on": {"previous_crop": "Ordi"},
        "model": "gemini-3.5-flash-lite",
    }

    recommendation = await service.create_recommendation(data)

    assert recommendation.field_id == 7
    assert recommendation.category == "crops"
    assert recommendation.title == "Plantar pèsol"

    db.add.assert_called_once_with(recommendation)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(recommendation)


# --------------------------------------------------
# UPDATE RECOMMENDATION
# --------------------------------------------------


@pytest.mark.asyncio
async def test_update_recommendation_updates_fields(service, db):
    recommendation = SimpleNamespace(
        id=uuid4(),
        title="Plantar fava",
        severity="low",
    )

    service.get_recommendation = AsyncMock(return_value=recommendation)

    updated = await service.update_recommendation(
        recommendation.id,
        uuid4(),
        {
            "title": "Plantar pèsol",
            "severity": "medium",
        },
    )

    assert updated is recommendation
    assert recommendation.title == "Plantar pèsol"
    assert recommendation.severity == "medium"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(recommendation)


@pytest.mark.asyncio
async def test_update_recommendation_returns_none_when_not_found(
    service,
    db,
):
    service.get_recommendation = AsyncMock(return_value=None)

    updated = await service.update_recommendation(
        uuid4(),
        uuid4(),
        {"title": "New title"},
    )

    assert updated is None
    db.commit.assert_not_awaited()


# --------------------------------------------------
# DELETE RECOMMENDATION
# --------------------------------------------------


@pytest.mark.asyncio
async def test_delete_recommendation_deletes_record(service, db):
    recommendation = SimpleNamespace(id=uuid4())

    service.get_recommendation = AsyncMock(return_value=recommendation)

    deleted = await service.delete_recommendation(
        recommendation.id,
        uuid4(),
    )

    assert deleted is True
    db.delete.assert_awaited_once_with(recommendation)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_recommendation_returns_false_when_not_found(
    service,
    db,
):
    service.get_recommendation = AsyncMock(return_value=None)

    deleted = await service.delete_recommendation(
        uuid4(),
        uuid4(),
    )

    assert deleted is False
    db.delete.assert_not_awaited()
    db.commit.assert_not_awaited()


# --------------------------------------------------
# COUNT RECOMMENDATIONS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_count_recommendations(service, db):
    db.execute.return_value = result(one=5)

    count = await service.count_recommendations(uuid4())

    assert count == 5
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_count_recommendations_by_field(service, db):
    db.execute.return_value = result(one=3)

    count = await service.count_recommendations(
        user_id=uuid4(),
        field_id=7,
    )

    assert count == 3


# --------------------------------------------------
# NEARBY FIELDS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_get_nearby_fields_returns_fields(service, db):
    fields = [
        {
            "id": 8,
            "name": "Camp proper",
            "soil_type": "clay",
            "distance_meters": 450,
        },
        {
            "id": 9,
            "name": "Camp veí",
            "soil_type": "loam",
            "distance_meters": 800,
        },
    ]

    db.execute.return_value = result(mappings=fields)

    nearby = await service.get_nearby_fields(
        field_id=7,
        user_id=uuid4(),
        radius_meters=1000,
    )

    assert nearby == fields
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_nearby_fields_returns_empty_list(service, db):
    db.execute.return_value = result()

    nearby = await service.get_nearby_fields(
        field_id=7,
        user_id=uuid4(),
    )

    assert nearby == []


# --------------------------------------------------
# GET CROPS FROM FIELDS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_get_crops_from_fields_returns_crops(service, db):
    crops = [
        {
            "field_id": 7,
            "status": "planted",
            "name": "Ordi",
            "scientific_name": "Hordeum vulgare",
            "category": "cereal",
            "planted_at": None,
            "expected_harvest_at": None,
        }
    ]

    db.execute.return_value = result(mappings=crops)

    found = await service.get_crops_from_fields([7])

    assert found == crops
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_crops_from_fields_returns_empty_without_field_ids(
    service,
    db,
):
    crops = await service.get_crops_from_fields([])

    assert crops == []
    db.execute.assert_not_awaited()


# --------------------------------------------------
# ACTIVE RECOMMENDATIONS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_get_active_recommendations_returns_rows(service, db):
    recommendations = [
        SimpleNamespace(id=uuid4()),
        SimpleNamespace(id=uuid4()),
    ]

    db.execute.return_value = result(rows=recommendations)

    active = await service._get_active_recommendations(
        field_id=7,
        now=datetime.now(UTC),
    )

    assert active == recommendations
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_active_recommendations_returns_empty_list(
    service,
    db,
):
    db.execute.return_value = result()

    active = await service._get_active_recommendations(
        field_id=7,
        now=datetime.now(UTC),
    )

    assert active == []


# --------------------------------------------------
# GET OR GENERATE RECOMMENDATIONS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_rejects_unowned_field(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=False)

    recommendations = await service.get_or_generate_recommendations(
        field_id=7,
        user_id=uuid4(),
    )

    assert recommendations is None
    service.field_belongs_to_user.assert_awaited_once()
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_returns_cached_recommendations(
    service,
):
    cached = [SimpleNamespace(id=uuid4())]

    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=cached)

    recommendations = await service.get_or_generate_recommendations(
        field_id=7,
        user_id=uuid4(),
    )

    assert recommendations == cached
    service._get_active_recommendations.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_returns_none_when_field_missing(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    db.execute.return_value = result(one=None)

    recommendations = await service.get_or_generate_recommendations(
        field_id=7,
        user_id=uuid4(),
    )

    assert recommendations is None


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_force_refresh_skips_cache(
    service,
):
    cached = [SimpleNamespace(id=uuid4())]

    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=cached)

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7, "soil_type": "clay"}))

    service._db.execute.return_value = result(one=field)
    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    # Stop before the external Gemini request.
    with patch(
        "services.field_recommendations_service.genai.Client",
        side_effect=RuntimeError("Gemini unavailable"),
    ):
        with pytest.raises(RuntimeError, match="Gemini unavailable"):
            await service.get_or_generate_recommendations(
                field_id=7,
                user_id=uuid4(),
                force_refresh=True,
            )

    service._get_active_recommendations.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_invalid_json(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7, "soil_type": "clay"}))

    db.execute.return_value = result(one=field)

    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    response = SimpleNamespace(output_text="Invalid JSON")

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        with pytest.raises(RuntimeError, match="invalid JSON"):
            await service.get_or_generate_recommendations(
                field_id=7,
                user_id=uuid4(),
                force_refresh=True,
            )

    client.aio.interactions.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_empty_response(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7}))

    db.execute.return_value = result(one=field)

    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    response = SimpleNamespace(output_text="")

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        with pytest.raises(RuntimeError, match="empty response"):
            await service.get_or_generate_recommendations(
                field_id=7,
                user_id=uuid4(),
                force_refresh=True,
            )


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_invalid_structure(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7}))

    db.execute.return_value = result(one=field)

    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    response = SimpleNamespace(output_text=json.dumps({"recommendations": "invalid"}))

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        with pytest.raises(RuntimeError, match="Invalid Gemini response structure"):
            await service.get_or_generate_recommendations(
                field_id=7,
                user_id=uuid4(),
                force_refresh=True,
            )


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_saves_valid_recommendations(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(
        to_dict=Mock(
            return_value={
                "id": 7,
                "name": "Camp principal",
                "soil_type": "clay",
            }
        )
    )

    db.execute.return_value = result(one=field)

    crops = [
        {
            "field_id": 7,
            "name": "Ordi",
            "status": "planted",
        }
    ]

    service.get_crops_from_fields = AsyncMock(side_effect=[crops, []])
    service.get_nearby_fields = AsyncMock(return_value=[])

    ai_data = {
        "recommendations": [
            {
                "category": "crops",
                "title": "Plantar pèsol",
                "description": "Bona opció després de l'ordi.",
                "severity": "medium",
                "based_on": {
                    "previous_crop": "Ordi",
                },
            }
        ]
    }

    response = SimpleNamespace(output_text=json.dumps(ai_data))

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        recommendations = await service.get_or_generate_recommendations(
            field_id=7,
            user_id=uuid4(),
            force_refresh=True,
        )

    assert len(recommendations) == 1

    saved = recommendations[0]

    assert saved.field_id == 7
    assert saved.category == "crops"
    assert saved.title == "Plantar pèsol"
    assert saved.description == "Bona opció després de l'ordi."
    assert saved.severity == "medium"
    assert saved.based_on == {"previous_crop": "Ordi"}
    assert saved.model == "gemini-3.5-flash-lite"

    assert saved.generated_at.tzinfo == UTC
    assert saved.expires_at - saved.generated_at == timedelta(days=7)

    db.add.assert_called_once_with(saved)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(saved)


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_ignores_invalid_items(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7}))

    db.execute.return_value = result(one=field)

    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    ai_data = {
        "recommendations": [
            {
                "category": "invalid_category",
                "title": "Invalid",
                "description": "Invalid category",
                "severity": "medium",
                "based_on": {},
            },
            {
                "category": "crops",
                "title": "Valid",
                "description": "Valid recommendation",
                "severity": "medium",
                "based_on": {},
            },
        ]
    }

    response = SimpleNamespace(output_text=json.dumps(ai_data))

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        recommendations = await service.get_or_generate_recommendations(
            field_id=7,
            user_id=uuid4(),
            force_refresh=True,
        )

    assert len(recommendations) == 1
    assert recommendations[0].title == "Valid"


@pytest.mark.asyncio
async def test_get_or_generate_recommendations_fails_without_valid_items(
    service,
    db,
):
    service.field_belongs_to_user = AsyncMock(return_value=True)
    service._get_active_recommendations = AsyncMock(return_value=[])

    field = SimpleNamespace(to_dict=Mock(return_value={"id": 7}))

    db.execute.return_value = result(one=field)

    service.get_crops_from_fields = AsyncMock(return_value=[])
    service.get_nearby_fields = AsyncMock(return_value=[])

    ai_data = {
        "recommendations": [
            {
                "category": "invalid",
                "title": "Invalid",
                "description": "Invalid recommendation",
                "severity": "medium",
                "based_on": {},
            }
        ]
    }

    response = SimpleNamespace(output_text=json.dumps(ai_data))

    client = Mock()
    client.aio.interactions.create = AsyncMock(return_value=response)

    with patch(
        "services.field_recommendations_service.genai.Client",
        return_value=client,
    ):
        with pytest.raises(
            RuntimeError,
            match="Gemini did not generate any valid recommendations",
        ):
            await service.get_or_generate_recommendations(
                field_id=7,
                user_id=uuid4(),
                force_refresh=True,
            )

    db.add.assert_not_called()
