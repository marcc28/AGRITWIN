import json
import logging
import math
import os
from collections import OrderedDict
from threading import Lock
from time import monotonic, sleep
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NOMINATIM_URL = os.getenv("GEOCODING_BASE_URL", "https://nominatim.openstreetmap.org").rstrip("/")
FALLBACK_URL = os.getenv("GEOCODING_FALLBACK_URL", "https://photon.komoot.io").rstrip("/")
logger = logging.getLogger(__name__)
_cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
_lock = Lock()
_last_request = 0.0


def _request(path: str, params: dict, base_url: str | None = None):
    global _last_request
    url = f"{base_url or NOMINATIM_URL}/{path}?{urlencode(params)}"
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
        except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as error:
            # Do not log query strings or precise coordinates.
            logger.warning(
                "Geocoding request failed: %s (%s)",
                type(error).__name__,
                getattr(error, "code", "upstream"),
            )
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
        label = _fallback_address(lat, lon)
        if not label:
            return None
        return {"lat": lat, "lon": lon, "label": label}
    # Retain the selected coordinates; the provider returns a nearby mapped object.
    return {"lat": lat, "lon": lon, "label": result["label"]}


def _fallback_address(lat: float, lon: float) -> str | None:
    if not FALLBACK_URL:
        return None
    payload = _request(
        "reverse",
        {"lat": round(lat, 6), "lon": round(lon, 6), "limit": 1, "radius": 1},
        base_url=FALLBACK_URL,
    )
    if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
        return None
    for feature in payload["features"]:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict):
            continue
        street = properties.get("street")
        city = properties.get("city")
        if not street and properties.get("osm_key") == "highway":
            street = properties.get("name")
        if (
            not city
            and properties.get("osm_key") == "place"
            and properties.get("osm_value")
            in {"city", "town", "village", "hamlet", "municipality", "locality"}
        ):
            city = properties.get("name")
        label = _address_label({"address": {"road": street, "city": city}})
        if label:
            return label
    return None
