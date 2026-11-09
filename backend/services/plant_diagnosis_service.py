import asyncio
import base64
import json
import logging
import os
from typing import Any

import httpx

from models.diagnosis import PlantCare, PlantDiagnosis

logger = logging.getLogger(__name__)

PLANTNET_URL = "https://my-api.plantnet.org/v2/diseases/identify"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest"

DEFAULT_LANG = "ca"
DEFAULT_TIMEOUT_SECONDS = 30.0
MIN_PLANTNET_SCORE = 0.5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_SIGNATURES = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
}
LANGUAGE_NAMES = {"ca": "Catalan", "es": "Spanish", "en": "English", "it": "Italian"}

CARE_LEVELS = ["lack", "ok", "excess", "unknown"]
HARVEST_STATUSES = ["ready", "not_ready", "no_fruit", "unknown"]
BLOCKED_FINISH_REASONS = {"SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "IMAGE_SAFETY", "SPII"}

CARE_PROMPT = (
    "Judge only from what is visible in the photo. "
    "water: lack if leaves are drooping, wrinkled, dry or have brown edges; "
    "excess if leaves are yellow and soft; ok if the plant shows no watering symptoms. "
    "light: lack if stems are long and stretched with small pale leaves; "
    "excess if leaves are scorched or bleached; ok if the plant shows no light symptoms. "
    "harvest: ready or not_ready from the colour and size of the fruit or the harvestable part; "
    "no_fruit if no fruit or harvestable part is visible. "
    "Use unknown only if the photo is too blurry or the plant is too small to judge."
)
DIAGNOSIS_PROMPT = (
    "You are an agronomist. Look at the photo and give a short diagnosis of the plant: "
    "the main problem (a pest, a disease, lack or excess of water or light) "
    "or harvest advice if it looks healthy. "
    "Answer name and advice in {language}. Keep name under 60 characters and advice under "
    "200 characters. If the photo does not show a plant, set is_plant to false. " + CARE_PROMPT
)
COMPLETE_PROMPT = (
    "You are an agronomist. The plant in the photo has been diagnosed with: {name}. "
    "Write this diagnosis name in {language}, keeping the scientific name if there is one, "
    "and give short advice in {language} on what to do. Keep name under 80 characters and "
    "advice under 200 characters. " + CARE_PROMPT
)
CARE_SCHEMA_PROPERTIES = {
    "water": {"type": "STRING", "enum": CARE_LEVELS},
    "light": {"type": "STRING", "enum": CARE_LEVELS},
    "harvest": {"type": "STRING", "enum": HARVEST_STATUSES},
}
COMPLETE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "name": {"type": "STRING"},
        "advice": {"type": "STRING"},
        **CARE_SCHEMA_PROPERTIES,
    },
    "required": ["name", "advice", *CARE_SCHEMA_PROPERTIES],
}
DIAGNOSIS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_plant": {"type": "BOOLEAN"},
        "healthy": {"type": "BOOLEAN"},
        "name": {"type": "STRING"},
        "confidence": {"type": "NUMBER"},
        "advice": {"type": "STRING"},
        **CARE_SCHEMA_PROPERTIES,
    },
    "required": ["is_plant", "healthy", "name", "confidence", "advice", *CARE_SCHEMA_PROPERTIES],
}


class DiagnosisError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DiagnosisUnavailableError(DiagnosisError):
    def __init__(self, message: str = "Diagnosis provider is unavailable"):
        super().__init__(message, status_code=503)


class DiagnosisNotFoundError(DiagnosisError):
    def __init__(self, message: str = "No diagnosis found for this photo"):
        super().__init__(message, status_code=404)


def validate_image(content: bytes, content_type: str | None) -> str:
    signature = IMAGE_SIGNATURES.get(content_type or "")
    if signature is None:
        raise DiagnosisError("Only JPEG or PNG images are allowed", status_code=415)
    if not content:
        raise DiagnosisError("The image is empty", status_code=400)
    if len(content) > MAX_IMAGE_BYTES:
        raise DiagnosisError("The image is larger than 5 MB", status_code=413)
    if not content.startswith(signature):
        raise DiagnosisError("The file is not a valid image", status_code=415)
    return content_type


async def _send(client: httpx.AsyncClient | None, provider: str, **request: Any) -> httpx.Response:
    async def perform(http: httpx.AsyncClient) -> httpx.Response:
        for attempt in range(2):
            try:
                response = await http.post(**request)
            except httpx.HTTPError as exc:
                logger.warning("%s request failed: %s", provider, exc)
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
                raise DiagnosisUnavailableError() from exc

            if response.status_code >= 500 and attempt == 0:
                await asyncio.sleep(0.5)
                continue
            return response
        raise DiagnosisUnavailableError()

    if client is not None:
        return await perform(client)
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as http:
        return await perform(http)


def _check_status(response: httpx.Response, provider: str) -> None:
    status = response.status_code
    if status < 400:
        return
    if status == 404:
        raise DiagnosisNotFoundError()
    if status == 429:
        raise DiagnosisUnavailableError(f"{provider} rate limit exceeded")
    if status >= 500:
        raise DiagnosisUnavailableError()
    if status in (401, 403):
        raise DiagnosisError(f"{provider} API key is invalid")
    raise DiagnosisError(f"{provider} error (HTTP {status})")


def _json(response: httpx.Response, provider: str) -> dict:
    try:
        return response.json()
    except ValueError as exc:
        raise DiagnosisError(f"Invalid response from {provider}") from exc


class PlantNetDiagnosisService:
    provider = "plantnet"

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client
        self._api_key = os.getenv("PLANTNET_API_KEY")

    async def diagnose(
        self, content: bytes, content_type: str, lang: str = DEFAULT_LANG
    ) -> PlantDiagnosis:
        if not self._api_key:
            raise DiagnosisError("PLANTNET_API_KEY is not configured", status_code=500)

        response = await _send(
            self._client,
            "Pl@ntNet",
            url=PLANTNET_URL,
            params={"api-key": self._api_key, "lang": lang, "nb-results": 1},
            files={"images": ("plant", content, content_type)},
            data={"organs": "auto"},
        )
        _check_status(response, "Pl@ntNet")
        results = _json(response, "Pl@ntNet").get("results") or []
        if not results or (results[0].get("score") or 0) < MIN_PLANTNET_SCORE:
            raise DiagnosisNotFoundError()

        best = results[0]
        return PlantDiagnosis(
            healthy=False,
            name=best.get("description") or best.get("name") or "",
            confidence=round(float(best["score"]), 2),
            provider=self.provider,
        )


class GeminiDiagnosisService:
    provider = "gemini"

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client
        self._api_key = os.getenv("GEMINI_API_KEY")
        self._model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    async def _generate(self, content: bytes, content_type: str, prompt: str, schema: dict) -> dict:
        if not self._api_key:
            raise DiagnosisError("GEMINI_API_KEY is not configured", status_code=500)

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": content_type,
                                "data": base64.b64encode(content).decode(),
                            }
                        },
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }
        response = await _send(
            self._client,
            "Gemini",
            url=GEMINI_URL.format(model=self._model),
            headers={"x-goog-api-key": self._api_key},
            json=body,
        )
        _check_status(response, "Gemini")
        data = _json(response, "Gemini")

        candidates = data.get("candidates") or []
        finish_reason = candidates[0].get("finishReason") if candidates else None
        if (data.get("promptFeedback") or {}).get("blockReason") or (
            finish_reason in BLOCKED_FINISH_REASONS
        ):
            raise DiagnosisError("This photo cannot be diagnosed", status_code=422)

        try:
            parts = candidates[0]["content"]["parts"]
            text = "".join(part.get("text", "") for part in parts if not part.get("thought"))
            return json.loads(text)
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise DiagnosisError("Invalid response from Gemini") from exc

    async def diagnose(
        self, content: bytes, content_type: str, lang: str = DEFAULT_LANG
    ) -> PlantDiagnosis:
        prompt = DIAGNOSIS_PROMPT.format(language=LANGUAGE_NAMES.get(lang, lang))
        result = await self._generate(content, content_type, prompt, DIAGNOSIS_SCHEMA)

        if not result.get("is_plant", True):
            raise DiagnosisError("No plant was found in the photo", status_code=422)

        confidence = result.get("confidence")
        return PlantDiagnosis(
            healthy=result.get("healthy"),
            name=result.get("name") or "",
            confidence=round(float(confidence), 2) if confidence is not None else None,
            advice=result.get("advice") or None,
            provider=self.provider,
            **_care(result).model_dump(),
        )

    async def complete(
        self,
        content: bytes,
        content_type: str,
        diagnosis: PlantDiagnosis,
        lang: str = DEFAULT_LANG,
    ) -> PlantDiagnosis:
        prompt = COMPLETE_PROMPT.format(
            name=diagnosis.name, language=LANGUAGE_NAMES.get(lang, lang)
        )
        result = await self._generate(content, content_type, prompt, COMPLETE_SCHEMA)
        return diagnosis.model_copy(
            update={
                "name": result.get("name") or diagnosis.name,
                "advice": result.get("advice") or diagnosis.advice,
                **_care(result).model_dump(),
            }
        )


def _care(result: dict) -> PlantCare:
    def pick(key: str, allowed: list[str]) -> str:
        value = result.get(key)
        return value if value in allowed else "unknown"

    return PlantCare(
        water=pick("water", CARE_LEVELS),
        light=pick("light", CARE_LEVELS),
        harvest=pick("harvest", HARVEST_STATUSES),
    )


class FallbackDiagnosisService:
    def __init__(self, primary: Any | None = None, fallback: Any | None = None):
        self.primary = primary or PlantNetDiagnosisService()
        self.fallback = fallback or GeminiDiagnosisService()

    async def diagnose(
        self, content: bytes, content_type: str, lang: str = DEFAULT_LANG
    ) -> PlantDiagnosis:
        try:
            diagnosis = await self.primary.diagnose(content, content_type, lang)
        except DiagnosisError as exc:
            logger.warning("Pl@ntNet diagnosis failed (%s); trying Gemini", exc.message)
            return await self.fallback.diagnose(content, content_type, lang)

        try:
            return await self.fallback.complete(content, content_type, diagnosis, lang)
        except DiagnosisError as exc:
            logger.warning("Gemini could not complete the diagnosis (%s)", exc.message)
            return diagnosis
