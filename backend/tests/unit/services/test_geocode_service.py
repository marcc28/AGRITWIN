from unittest.mock import MagicMock, patch
from urllib.error import URLError

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
