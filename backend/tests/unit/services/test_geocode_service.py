from unittest.mock import MagicMock, patch
from urllib.error import URLError

import pytest

import services.geocode_service as geocoder
from services.geocode_service import lookup_location


def test_lookup_location_empty():
    assert lookup_location("   ") is None


def test_lookup_location_reads_first_result():
    response = MagicMock()
    response.read.return_value = b'[{"lat": "42.5", "lon": "1.5", "display_name": "Andorra"}]'
    response.__enter__.return_value = response
    response.__exit__.return_value = False

    with patch("services.geocode_service.urlopen", return_value=response):
        result = lookup_location("Andorra")

    assert result == {"lat": 42.5, "lon": 1.5, "label": "Andorra"}


def test_lookup_location_handles_bad_payload():
    response = MagicMock()
    response.read.return_value = b"[]"
    response.__enter__.return_value = response
    response.__exit__.return_value = False

    with patch("services.geocode_service.urlopen", return_value=response):
        assert lookup_location("xxxx") is None


def test_lookup_location_handles_network_error():
    with patch(
        "services.geocode_service.urlopen",
        side_effect=URLError("offline"),
    ):
        assert lookup_location("Andorra") is None


def test_lookup_location_handles_bad_coords():
    response = MagicMock()
    response.read.return_value = b'[{"lat": "nope", "lon": "1.5"}]'
    response.__enter__.return_value = response
    response.__exit__.return_value = False

    with patch("services.geocode_service.urlopen", return_value=response):
        assert lookup_location("Andorra") is None


@pytest.fixture(autouse=True)
def reset_geocoder(monkeypatch):
    geocoder._cache.clear()
    geocoder._last_request = 0
    monkeypatch.setattr(geocoder, "sleep", lambda _: None)


def test_reverse_retains_original_coordinates_and_caches():
    response = MagicMock()
    response.read.return_value = b'{"lat":"42.6","lon":"1.7","display_name":"Field road"}'
    response.__enter__.return_value = response
    with patch("services.geocode_service.urlopen", return_value=response) as request:
        first = geocoder.reverse_location(42.5, 1.5)
        assert first == {"lat": 42.5, "lon": 1.5, "label": "Field road"}
        assert geocoder.reverse_location(42.5, 1.5) == first
        assert request.call_count == 1


def test_reverse_rejects_invalid_coordinates():
    with patch("services.geocode_service.urlopen") as request:
        assert geocoder.reverse_location(float("nan"), 1) is None
        assert geocoder.reverse_location(92, 1) is None
        request.assert_not_called()


@pytest.mark.parametrize(
    ("address", "label"),
    [
        (
            {
                "road": "Carrer Major",
                "house_number": "12",
                "city": "Lleida",
                "county": "Segrià",
                "state": "Catalunya",
                "postcode": "25007",
                "country": "España",
            },
            "Carrer Major, Lleida",
        ),
        (
            {"pedestrian": "Plaça de Catalunya", "city": "Barcelona"},
            "Plaça de Catalunya, Barcelona",
        ),
        (
            {"road": "Camí del Molí", "village": "Alpicat", "country": "España"},
            "Camí del Molí, Alpicat",
        ),
        ({"city": "Lleida", "country": "España"}, "Lleida"),
        ({"road": "Camí rural"}, "Camí rural"),
        ({"country": "España", "state": "Catalunya"}, None),
    ],
)
def test_location_label_contains_only_street_and_city(address, label):
    result = geocoder._result(
        {
            "lat": "41.6",
            "lon": "0.6",
            "display_name": "Business, full address, country",
            "address": address,
        }
    )
    assert result["label"] == label


def test_forward_and_reverse_queries_request_structured_addresses():
    with patch("services.geocode_service._request", return_value=[]) as request:
        geocoder.lookup_location("Carrer Major, Lleida")
        assert request.call_args.args[1]["addressdetails"] == 1
    with patch(
        "services.geocode_service._request",
        return_value={
            "lat": "41.6",
            "lon": "0.6",
            "address": {"road": "Carrer Major", "city": "Lleida"},
        },
    ) as request:
        result = geocoder.reverse_location(41.600123, 0.600456)
        assert request.call_args.args[1]["addressdetails"] == 1
        assert result == {"lat": 41.600123, "lon": 0.600456, "label": "Carrer Major, Lleida"}
