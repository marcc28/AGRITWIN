"""Validate simple field polygons and calculate their spherical area in square metres."""

import math

RADIUS = 6371008.8
MAX_AREA = 99999999.99
BORDER_FIELD_TYPES = {"open_field", "greenhouse", "orchard"}
EPS = 1e-14


def _turn(a, b, c):
    return (b["lon"] - a["lon"]) * (c["lat"] - a["lat"]) - (b["lat"] - a["lat"]) * (
        c["lon"] - a["lon"]
    )


def _on_segment(a, b, c):
    return (
        abs(_turn(a, b, c)) < EPS
        and min(a["lon"], b["lon"]) - EPS <= c["lon"] <= max(a["lon"], b["lon"]) + EPS
        and min(a["lat"], b["lat"]) - EPS <= c["lat"] <= max(a["lat"], b["lat"]) + EPS
    )


def _intersects(a, b, c, d):
    return (
        (_turn(a, b, c) * _turn(a, b, d) < 0 and _turn(c, d, a) * _turn(c, d, b) < 0)
        or _on_segment(a, b, c)
        or _on_segment(a, b, d)
        or _on_segment(c, d, a)
        or _on_segment(c, d, b)
    )


def _ring_geometry(points: list[dict]) -> tuple[float, float, float]:
    if not 3 <= len(points) <= 200:
        raise ValueError("A boundary must contain between 3 and 200 corners")
    for point in points:
        if (
            not all(
                isinstance(point.get(k), (int, float))
                and not isinstance(point[k], bool)
                and math.isfinite(point[k])
                for k in ("lat", "lon")
            )
            or abs(point["lat"]) > 90
            or abs(point["lon"]) > 180
        ):
            raise ValueError("Invalid boundary coordinates")
    if len({(p["lat"], p["lon"]) for p in points}) != len(points):
        raise ValueError("Boundary corners must be unique")
    if max(p["lon"] for p in points) - min(p["lon"] for p in points) > 180:
        raise ValueError("Boundaries crossing the antimeridian are not supported")
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if j == i + 1 or (i == 0 and j == len(points) - 1):
                continue
            if _intersects(
                points[i], points[(i + 1) % len(points)], points[j], points[(j + 1) % len(points)]
            ):
                raise ValueError("Boundary edges must not cross or touch")
    origin = points[0]
    spherical = cross_sum = center_x = center_y = 0.0
    for i, a in enumerate(points):
        b = points[(i + 1) % len(points)]
        spherical += math.radians(b["lon"] - a["lon"]) * (
            math.sin(math.radians(a["lat"])) + math.sin(math.radians(b["lat"]))
        )
        ax, ay = a["lon"] - origin["lon"], a["lat"] - origin["lat"]
        bx, by = b["lon"] - origin["lon"], b["lat"] - origin["lat"]
        cross = ax * by - bx * ay
        cross_sum += cross
        center_x += (ax + bx) * cross
        center_y += (ay + by) * cross
    area = round(abs(spherical) * RADIUS * RADIUS / 2, 2)
    if area < 0.01 or abs(cross_sum) < EPS:
        raise ValueError("Boundary must enclose a positive area")
    if area > MAX_AREA:
        raise ValueError("Field area must be below 100000000 square metres")
    return (
        area,
        origin["lat"] + center_y / (3 * cross_sum),
        origin["lon"] + center_x / (3 * cross_sum),
    )


def _contains(point, ring):
    inside = False
    for i, b in enumerate(ring):
        a = ring[i - 1]
        if _on_segment(a, b, point):
            return False
        if (a["lat"] > point["lat"]) != (b["lat"] > point["lat"]) and point["lon"] < (
            b["lon"] - a["lon"]
        ) * (point["lat"] - a["lat"]) / (b["lat"] - a["lat"]) + a["lon"]:
            inside = not inside
    return inside


def _rings_intersect(a, b):
    return any(
        _intersects(p, a[(i + 1) % len(a)], q, b[(j + 1) % len(b)])
        for i, p in enumerate(a)
        for j, q in enumerate(b)
    )


def field_geometry(
    points: list[dict], excluded_zones: list[list[dict]] | None = None
) -> tuple[float, float, float]:
    zones = excluded_zones or []
    area, lat, lon = _ring_geometry(points)
    if len(zones) > 20 or len(points) + sum(len(z) for z in zones) > 1000:
        raise ValueError("At most 20 exclusions and 1000 total corners are supported")
    lat_weight, lon_weight = lat * area, lon * area
    excluded = 0.0
    for i, zone in enumerate(zones):
        hole_area, hole_lat, hole_lon = _ring_geometry(zone)
        if any(not _contains(p, points) for p in zone) or _rings_intersect(zone, points):
            raise ValueError("Excluded zones must be strictly inside the field")
        for previous in zones[:i]:
            if (
                _rings_intersect(zone, previous)
                or _contains(zone[0], previous)
                or _contains(previous[0], zone)
            ):
                raise ValueError("Excluded zones must not overlap or touch")
        excluded += hole_area
        lat_weight -= hole_lat * hole_area
        lon_weight -= hole_lon * hole_area
    net = round(area - round(excluded, 2), 2)
    if net < 0.01:
        raise ValueError("The usable field area must be positive")
    return net, lat_weight / net, lon_weight / net
