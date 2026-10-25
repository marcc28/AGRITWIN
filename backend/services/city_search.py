from typing import Any

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
MAX_RESULTS = 10


def build_params(name: str, lang: str) -> dict[str, Any]:
    return {"name": name, "count": MAX_RESULTS, "language": lang, "format": "json"}


def pick(raw: dict, country: str | None = None) -> dict | None:
    results = (raw or {}).get("results") or []
    if country:
        results = [r for r in results if (r.get("country_code") or "").upper() == country.upper()]
    for result in results:
        if result.get("latitude") is not None and result.get("longitude") is not None:
            return result
    return None
