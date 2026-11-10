import pytest

from services.field_geometry_service import field_geometry

SQUARE = [
    {"lat": 0.0, "lon": 0.0},
    {"lat": 0.0, "lon": 0.001},
    {"lat": 0.001, "lon": 0.001},
    {"lat": 0.001, "lon": 0.0},
]


def test_equatorial_square_and_centroid_ignore_winding():
    for points in (SQUARE, list(reversed(SQUARE))):
        area, lat, lon = field_geometry(points)
        assert area == pytest.approx(12364.35, abs=0.01)
        assert lat == pytest.approx(0.0005)
        assert lon == pytest.approx(0.0005)


@pytest.mark.parametrize(
    "points",
    [
        SQUARE[:2],
        [SQUARE[0], SQUARE[2], SQUARE[1], SQUARE[3]],
        [SQUARE[0], SQUARE[1], SQUARE[0]],
        [{"lat": 0, "lon": 0}, {"lat": 0, "lon": 1}, {"lat": 0, "lon": 2}],
        [{"lat": float("nan"), "lon": 0}, *SQUARE[1:]],
        [{"lat": True, "lon": 0}, *SQUARE[1:]],
        [SQUARE[0]] * 201,
    ],
)
def test_invalid_boundaries_are_rejected(points):
    with pytest.raises(ValueError):
        field_geometry(points)


HOLE = [
    {"lat": 0.0002, "lon": 0.0002},
    {"lat": 0.0002, "lon": 0.0004},
    {"lat": 0.0004, "lon": 0.0004},
    {"lat": 0.0004, "lon": 0.0002},
]


def test_excluded_cabin_is_subtracted_from_gross_area():
    assert field_geometry(SQUARE, [HOLE])[0] == pytest.approx(11869.78, abs=0.01)


@pytest.mark.parametrize("zones", [[HOLE, HOLE], [[SQUARE[0], *HOLE[1:]]], [HOLE] * 21])
def test_invalid_exclusions_are_rejected(zones):
    with pytest.raises(ValueError):
        field_geometry(SQUARE, zones)
