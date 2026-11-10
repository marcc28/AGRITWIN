import json

import httpx
import pytest

from models.diagnosis import PlantDiagnosis
from services.plant_diagnosis_service import (
    MAX_IMAGE_BYTES,
    DiagnosisError,
    DiagnosisNotFoundError,
    DiagnosisUnavailableError,
    FallbackDiagnosisService,
    GeminiDiagnosisService,
    PlantNetDiagnosisService,
    validate_image,
)

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 32
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32

DIAGNOSIS = {
    "is_plant": True,
    "healthy": False,
    "name": "Míldiu",
    "confidence": 0.876,
    "advice": "Retira les fulles afectades.",
    "water": "excess",
    "light": "ok",
    "harvest": "no_fruit",
}


@pytest.fixture(autouse=True)
def _api_keys(monkeypatch):
    monkeypatch.setenv("PLANTNET_API_KEY", "test-plantnet-key")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")


@pytest.fixture(autouse=True)
def _no_wait(monkeypatch):
    async def no_wait(_seconds):
        return None

    monkeypatch.setattr("services.plant_diagnosis_service.asyncio.sleep", no_wait)


def client_for(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def gemini_response(result: dict) -> httpx.Response:
    return httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": json.dumps(result)}]}}]},
    )


def plantnet_response(score: float) -> httpx.Response:
    return httpx.Response(
        200,
        json={"results": [{"name": "plasmopara", "description": "Downy mildew", "score": score}]},
    )


@pytest.mark.parametrize(("content", "content_type"), [(JPEG, "image/jpeg"), (PNG, "image/png")])
def test_validate_image_accepts_jpeg_and_png(content, content_type):
    assert validate_image(content, content_type) == content_type


@pytest.mark.parametrize(
    ("content", "content_type", "status"),
    [
        (JPEG, "image/gif", 415),
        (b"", "image/jpeg", 400),
        (b"\xff\xd8\xff" + b"0" * MAX_IMAGE_BYTES, "image/jpeg", 413),
        (b"not an image", "image/jpeg", 415),
    ],
    ids=["gif", "empty", "too large", "not an image"],
)
def test_validate_image_rejects_invalid_files(content, content_type, status):
    with pytest.raises(DiagnosisError) as exc:
        validate_image(content, content_type)

    assert exc.value.status_code == status


async def test_plantnet_sends_the_photo_and_returns_the_best_result():
    def handler(request: httpx.Request):
        assert request.url.params["api-key"] == "test-plantnet-key"
        assert request.url.params["lang"] == "es"
        assert JPEG in request.read()
        return plantnet_response(0.8765)

    result = await PlantNetDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg", "es")

    assert result == PlantDiagnosis(
        healthy=False, name="Downy mildew", confidence=0.88, provider="plantnet"
    )


async def test_plantnet_low_score_is_not_found():
    def handler(_request):
        return plantnet_response(0.2)

    with pytest.raises(DiagnosisNotFoundError):
        await PlantNetDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")


@pytest.mark.parametrize(
    ("status", "code"),
    [(404, 404), (429, 503), (401, 502)],
)
async def test_plantnet_errors_are_mapped(status, code):
    def handler(_request):
        return httpx.Response(status, json={})

    with pytest.raises(DiagnosisError) as exc:
        await PlantNetDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")

    assert exc.value.status_code == code


async def test_plantnet_retries_once_after_a_server_error():
    calls = []

    def handler(_request):
        calls.append(1)
        return httpx.Response(503) if len(calls) == 1 else plantnet_response(0.9)

    result = await PlantNetDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")

    assert len(calls) == 2
    assert result.confidence == 0.9


async def test_gemini_returns_the_diagnosis():
    def handler(request: httpx.Request):
        assert request.headers["x-goog-api-key"] == "test-gemini-key"
        assert "Italian" in request.read().decode()
        return gemini_response(DIAGNOSIS)

    result = await GeminiDiagnosisService(client_for(handler)).diagnose(PNG, "image/png", "it")

    assert result == PlantDiagnosis(
        healthy=False,
        name="Míldiu",
        confidence=0.88,
        advice="Retira les fulles afectades.",
        water="excess",
        light="ok",
        harvest="no_fruit",
        provider="gemini",
    )


async def test_gemini_unknown_care_values_become_unknown():
    def handler(_request):
        return gemini_response({**DIAGNOSIS, "water": "a lot", "harvest": None})

    result = await GeminiDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")

    assert (result.water, result.harvest) == ("unknown", "unknown")


@pytest.mark.parametrize(
    "body",
    [
        {"candidates": [{"content": {"parts": [{"text": json.dumps({"is_plant": False})}]}}]},
        {"promptFeedback": {"blockReason": "SAFETY"}},
    ],
)
async def test_gemini_photo_without_a_plant_or_blocked_is_rejected(body):
    def handler(_request):
        return httpx.Response(200, json=body)

    with pytest.raises(DiagnosisError) as exc:
        await GeminiDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")

    assert exc.value.status_code == 422


async def test_gemini_invalid_answer_is_an_error():
    def handler(_request):
        return httpx.Response(200, json={"candidates": []})

    with pytest.raises(DiagnosisError, match="Invalid response from Gemini"):
        await GeminiDiagnosisService(client_for(handler)).diagnose(JPEG, "image/jpeg")


async def test_gemini_complete_translates_the_name_and_adds_care():
    diagnosis = PlantDiagnosis(name="Downy mildew", confidence=0.8, provider="plantnet")

    def handler(request):
        assert "Downy mildew" in request.read().decode()
        return gemini_response(
            {"name": "Míldiu", "advice": "Retira les fulles.", "water": "ok", "light": "lack"}
        )

    result = await GeminiDiagnosisService(client_for(handler)).complete(
        JPEG, "image/jpeg", diagnosis, "ca"
    )

    assert result.name == "Míldiu"
    assert result.advice == "Retira les fulles."
    assert (result.water, result.light) == ("ok", "lack")
    assert (result.confidence, result.provider) == (0.8, "plantnet")


class FakeService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    async def diagnose(self, content, content_type, lang):
        if self.error:
            raise self.error
        return self.result

    async def complete(self, content, content_type, diagnosis, lang):
        if self.error:
            raise self.error
        return self.result


PLANTNET_RESULT = PlantDiagnosis(name="Downy mildew", provider="plantnet")
COMPLETED = PlantDiagnosis(name="Míldiu", provider="plantnet")
GEMINI_RESULT = PlantDiagnosis(name="Alfàbrega", healthy=True, provider="gemini")


@pytest.mark.parametrize(
    ("primary", "fallback", "expected"),
    [
        (FakeService(PLANTNET_RESULT), FakeService(COMPLETED), COMPLETED),
        (
            FakeService(PLANTNET_RESULT),
            FakeService(error=DiagnosisUnavailableError()),
            PLANTNET_RESULT,
        ),
        (FakeService(error=DiagnosisNotFoundError()), FakeService(GEMINI_RESULT), GEMINI_RESULT),
    ],
    ids=["gemini completes", "gemini fails", "plantnet fails"],
)
async def test_fallback_combines_plantnet_and_gemini(primary, fallback, expected):
    result = await FallbackDiagnosisService(primary, fallback).diagnose(JPEG, "image/jpeg")

    assert result == expected
