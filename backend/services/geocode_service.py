import json
import math
import os
from collections import OrderedDict
from threading import Lock
from time import monotonic, sleep
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NOMINATIM_URL = os.getenv("GEOCODING_BASE_URL", "https://nominatim.openstreetmap.org").rstrip("/")
_cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
_lock = Lock()
_last_request = 0.0


def _request(path: str, params: dict):
    global _last_request
    url = f"{NOMINATIM_URL}/{path}?{urlencode(params)}"
    with _lock:
        cached = _cache.get(url)
        if cached and cached[0] > monotonic():
            return cached[1]
        delay = 1.05 - (monotonic() - _last_request)
        if delay > 0:
            sleep(delay)
        _last_request = monotonic()
        request = Request(
            url,
            headers={
                "User-Agent": "AGRITWIN/1.0 (+https://github.com/marcc28/AGRITWIN)",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError):
            payload = None
        _cache[url] = (monotonic() + (3600 if payload else 30), payload)
        if len(_cache) > 512:
            _cache.popitem(last=False)
        return payload


def _address_label(payload: dict) -> str | None:
    address = payload.get("address")
    if isinstance(address, dict):

        def first(keys):
            return next(
                (
                    address[key].strip()
                    for key in keys
                    if isinstance(address.get(key), str) and address[key].strip()
                ),
                None,
            )

        street = first(("road", "pedestrian", "residential", "footway", "path", "cycleway"))
        city = first(("city", "town", "village", "hamlet", "municipality", "locality"))
        parts = [part for part in (street, city) if part]
        return ", ".join(dict.fromkeys(parts)) or None
    label = payload.get("display_name")
    return label.strip() if isinstance(label, str) and "," not in label else None


def _result(payload):
    if not isinstance(payload, dict):
        return None
    try:
        lat, lon = float(payload["lat"]), float(payload["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
        return None
    return {"lat": lat, "lon": lon, "label": _address_label(payload)}


def lookup_location(query: str) -> dict | None:
    cleaned = query.strip()
    if not cleaned:
        return None
    payload = _request(
        "search", {"q": cleaned, "format": "jsonv2", "limit": 1, "addressdetails": 1}
    )
    return _result(payload[0]) if isinstance(payload, list) and payload else None


def reverse_location(lat: float, lon: float) -> dict | None:
    if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
        return None
    payload = _request(
        "reverse",
        {
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "format": "jsonv2",
            "zoom": 18,
            "addressdetails": 1,
        },
    )
    result = _result(payload)
    if not result or not result["label"]:
        return None
    # Retain the selected coordinates; the provider returns a nearby mapped object.
    return {"lat": lat, "lon": lon, "label": result["label"]}
