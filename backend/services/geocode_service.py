import json
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def lookup_location(query: str) -> dict | None:
    cleaned = query.strip()
    if not cleaned:
        return None

    params = urlencode({"q": cleaned, "format": "json", "limit": 1})
    request = Request(
        f"{NOMINATIM_URL}?{params}",
        headers={
            "User-Agent": "AGRITWIN/1.0",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError):
        return None

    if not isinstance(payload, list) or not payload:
        return None

    first = payload[0]
    try:
        lat = float(first["lat"])
        lon = float(first["lon"])
    except (KeyError, TypeError, ValueError):
        return None

    return {
        "lat": lat,
        "lon": lon,
        "label": first.get("display_name"),
    }
