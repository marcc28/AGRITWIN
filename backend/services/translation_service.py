import json
import logging
import re

from google import genai

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "ca": "Catalan",
    "es": "Spanish",
    "en": "English",
    "it": "Italian",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "nl": "Dutch",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
}


class TranslationService:
    def __init__(
        self,
        client: genai.Client,
        model: str,
    ):
        self._client = client
        self._model = model

    async def translate(
        self,
        content: dict | list,
        language: str,
    ) -> dict | list:
        """
        Translate JSON content into the requested language.
        Preserves JSON keys and structure.
        """

        language = language.strip().replace("_", "-")
        if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", language):
            raise ValueError(f"Invalid language tag: {language}")

        language = language.lower()
        base_language = language.split("-")[0]

        if base_language == "ca":
            return content

        if not self._model:
            raise RuntimeError("MODEL_USE_IN_TRANSLATION is not configured")

        prompt = self._build_prompt(content, language)

        try:
            response = await self._client.aio.interactions.create(
                model=self._model,
                input=prompt,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 3000,
                },
            )

            response_text = response.output_text

            if not response_text:
                raise RuntimeError("Translation model returned an empty response")

            translated_content = json.loads(response_text)

            if not isinstance(translated_content, type(content)):
                raise RuntimeError("Translation changed the JSON structure type")

            return translated_content

        except Exception:
            logger.exception("Translation failed")
            raise

    @staticmethod
    def _build_prompt(
        content: dict | list,
        language: str,
    ) -> str:
        normalized_language = language.lower().replace("_", "-")
        base_language = normalized_language.split("-")[0]
        target_language = SUPPORTED_LANGUAGES.get(
            base_language,
            f"the language identified by the BCP 47 tag {normalized_language}",
        )
        if normalized_language != base_language:
            target_language = f"{target_language} ({normalized_language})"

        return f"""
You are a professional agricultural translator.

TASK:
Translate the following JSON content into {target_language}.

RULES:
- Translate all user-facing text.
- Preserve the original meaning exactly.
- Use accurate agricultural terminology.
- Do not add, remove or invent information.
- Preserve all JSON keys and the JSON structure.
- Preserve all data types.
- Preserve numerical values, dates and measurements.
- Preserve scientific names and technical identifiers.
- Do not translate enum values, IDs, categories or status codes.
- Do not modify URLs or email addresses.
- Return valid JSON only.
- Do not include Markdown or explanations.

CONTENT:
{json.dumps(content, ensure_ascii=False, default=str)}
"""
