import json


def build_translation_prompt(
    recommendations: list[dict],
    language: str,
) -> str:

    languages = {
        "ca": "Catalan",
        "es": "Spanish",
        "en": "English",
        "it": "Italian"
    }

    target_language = languages.get(language, "Catalan")

    return f"""
You are a professional agricultural translator.

TASK
Translate the following agricultural recommendations into
{target_language}.

RULES
- Preserve the exact meaning of the original content.
- Use correct agricultural terminology.
- Keep the tone professional, clear and accessible to farmers.
- Do not add, remove or modify agricultural advice.
- Do not invent information.
- Preserve all numerical values, dates and measurements.
- Translate all user-facing strings, including nested JSON values.
- Preserve category and severity enum values unchanged.
- Preserve all JSON keys and data types.
- Keep crop scientific names unchanged.
- Return valid JSON only.

INPUT RECOMMENDATIONS:
{json.dumps(recommendations, ensure_ascii=False, default=str)}

OUTPUT FORMAT:
{{
    "recommendations": []
}}
"""