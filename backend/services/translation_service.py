import json
import logging
import re

from google import genai

from prompts.field_recommendation_translation_prompt import build_translation_prompt

logger = logging.getLogger(__name__)


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
        source_language: str | None = None,
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
        if source_language is not None:
            source_language = source_language.strip().replace("_", "-").lower()
            if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", source_language):
                raise ValueError(f"Invalid source language tag: {source_language}")

        if base_language == "ca" and (
            source_language is None or source_language.split("-")[0] == "ca"
        ):
            return content

        if not self._model:
            raise RuntimeError("MODEL_USE_IN_TRANSLATION is not configured")

        prompt = build_translation_prompt(
            content=content,
            language=language,
            source_language=source_language,
        )

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
