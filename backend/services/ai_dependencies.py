import os

from google import genai

from services.translation_service import TranslationService


def _read_env_setting(name: str) -> str:
    return os.getenv(name, "").strip()


api_key = _read_env_setting("GEMINI_API_KEY")
model_gemini = _read_env_setting("MODEL_USE_IN_RECOMENDATION")
model_translation = _read_env_setting("MODEL_USE_IN_TRANSLATION")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")

if not model_gemini:
    raise RuntimeError("MODEL_USE_IN_RECOMENDATION is not configured")

# Shared Gemini client
gemini_client = genai.Client(api_key=api_key)

# Shared translation service
translation_service = TranslationService(
    client=gemini_client,
    model=model_translation,
)
