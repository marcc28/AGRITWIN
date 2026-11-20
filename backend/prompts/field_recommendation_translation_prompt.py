import json

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


def build_translation_prompt(
    content: dict | list,
    language: str,
    source_language: str | None = None,
) -> str:
    """Build a structure-preserving prompt for translating agricultural JSON."""
    normalized_language = language.strip().replace("_", "-").lower()
    base_language = normalized_language.split("-")[0]
    target_language = SUPPORTED_LANGUAGES.get(
        base_language,
        f"the language identified by the BCP 47 tag {normalized_language}",
    )
    if normalized_language != base_language:
        target_language = f"{target_language} ({normalized_language})"

    source_instruction = ""
    if source_language:
        normalized_source = source_language.strip().replace("_", "-").lower()
        source_base = normalized_source.split("-")[0]
        source_name = SUPPORTED_LANGUAGES.get(
            source_base,
            f"the language identified by the BCP 47 tag {normalized_source}",
        )
        source_instruction = f"- The source content is in {source_name}.\n"

    serialized_content = json.dumps(content, ensure_ascii=False, default=str)
    return f"""
You are a professional agricultural translator.

TASK
Translate all user-facing text in the JSON content into {target_language}.
{source_instruction}
RULES
- Preserve the exact meaning of the original content.
- Use accurate agricultural terminology and a clear, professional tone.
- Do not add, remove, or invent information.
- Translate user-facing strings, including strings nested in JSON objects and arrays.
- Preserve every JSON key, the top-level structure, and all data types.
- Preserve numerical values, dates, measurements, IDs, URLs, and email addresses.
- Preserve scientific names and technical identifiers.
- Do not translate enum values, categories, or status codes.
- Return only one valid JSON value with the same top-level type as the input.
- Do not include Markdown or explanations.

INPUT JSON:
{serialized_content}
"""
