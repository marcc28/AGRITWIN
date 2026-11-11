import os
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from api.v1.auth import get_current_user
from api.v1.fields import router
from db.schema import User

FIELD = SimpleNamespace(
    id=3,
    name="Hort de l'Ainhoa",
    location="Andorra la Vella",
    lat=42.5,
    lon=1.5,
    field_type="home_garden",
    soil_type="loam",
    size_m2=40.0,
    device_count=2,
    devices_online=2,
)

FIELD_JSON = {
    "id": 3,
    "name": "Hort de l'Ainhoa",
    "location": "Andorra la Vella",
    "lat": 42.5,
    "lon": 1.5,
    "field_type": "home_garden",
    "soil_type": "loam",
    "size_m2": 40.0,
    "device_count": 2,
    "boundary": None,
    "excluded_zones": [],
    "devices_online": 2,
}


class FakeResult:
    def __init__(self, one=None, rows=None):
        self._one = one
        self._rows = rows or []

    def all(self):
        return self._rows

    def one_or_none(self):
        return self._one

    def one(self):
        return self._one


class FakeSession:
    def __init__(self, results):
        self._results = list(results)
        self.committed = False

    async def execute(self, *_args, **_kwargs):
        next_result = self._results.pop(0)
        if isinstance(next_result, BaseException):
            raise next_result
        return next_result

    async def commit(self):
        self.committed = True

    async def rollback(self):
        return None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)

    async def override_user():
        return User(
            id=uuid4(),
            username="ainhoa",
            email="ainhoa@test.com",
            password_hash="hash",
        )

    app.dependency_overrides[get_current_user] = override_user
    return TestClient(app)


def test_fields_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/fields")

    assert response.status_code == 401


def test_list_fields():
    client = make_client()
    session = FakeSession([FakeResult(rows=[FIELD])])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields")

    assert response.status_code == 200
    assert response.json() == [FIELD_JSON]


def test_list_fields_counts_online_devices():
    client = make_client()
    mixed = SimpleNamespace(
        id=5,
        name="Camp mixt",
        location=None,
        lat=None,
        lon=None,
        field_type=None,
        soil_type=None,
        size_m2=None,
        device_count=3,
        devices_online=1,
    )
    offline = SimpleNamespace(
        id=6,
        name="Camp offline",
        location=None,
        lat=None,
        lon=None,
        field_type=None,
        soil_type=None,
        size_m2=None,
        device_count=2,
        devices_online=0,
    )
    session = FakeSession([FakeResult(rows=[mixed, offline])])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["device_count"] == 3
    assert payload[0]["devices_online"] == 1
    assert payload[1]["device_count"] == 2
    assert payload[1]["devices_online"] == 0


def test_list_fields_defaults_devices_online_when_missing():
    client = make_client()
    legacy = SimpleNamespace(
        id=7,
        name="Camp antic",
        location=None,
        lat=None,
        lon=None,
        field_type=None,
        soil_type=None,
        size_m2=None,
        device_count=1,
    )
    session = FakeSession([FakeResult(rows=[legacy])])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields")

    assert response.status_code == 200
    assert response.json()[0]["devices_online"] == 0


def test_list_fields_empty():
    client = make_client()
    session = FakeSession([FakeResult(rows=[])])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields")

    assert response.status_code == 200
    assert response.json() == []


def test_get_field_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/fields/3")

    assert response.status_code == 401


def test_get_field():
    client = make_client()
    field_row = SimpleNamespace(
        id=3,
        name="Hort de l'Ainhoa",
        location="Andorra la Vella",
        lat=42.5,
        lon=1.5,
        field_type="home_garden",
        soil_type="loam",
        size_m2=40.0,
    )
    devices = [
        SimpleNamespace(
            id="dev-1",
            battery_status=True,
            brand="ESP32",
            serial_number="SN-1",
        ),
        SimpleNamespace(
            id="dev-2",
            battery_status=False,
            brand=None,
            serial_number=None,
        ),
    ]
    session = FakeSession(
        [
            FakeResult(one=field_row),
            FakeResult(rows=devices),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields/3")

    assert response.status_code == 200
    assert response.json() == {
        **FIELD_JSON,
        "devices_online": 1,
        "devices": [
            {
                "id": "dev-1",
                "battery_status": True,
                "brand": "ESP32",
                "serial_number": "SN-1",
            },
            {
                "id": "dev-2",
                "battery_status": False,
                "brand": None,
                "serial_number": None,
            },
        ],
    }


def test_get_field_without_devices():
    client = make_client()
    field_row = SimpleNamespace(
        id=3,
        name="Hort de l'Ainhoa",
        location="Andorra la Vella",
        lat=42.5,
        lon=1.5,
        field_type="home_garden",
        soil_type="loam",
        size_m2=40.0,
    )
    session = FakeSession(
        [
            FakeResult(one=field_row),
            FakeResult(rows=[]),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields/3")

    assert response.status_code == 200
    assert response.json()["device_count"] == 0
    assert response.json()["devices_online"] == 0
    assert response.json()["devices"] == []


def test_get_field_all_devices_online():
    client = make_client()
    field_row = SimpleNamespace(
        id=3,
        name="Hort de l'Ainhoa",
        location="Andorra la Vella",
        lat=42.5,
        lon=1.5,
        field_type="home_garden",
        soil_type="loam",
        size_m2=40.0,
    )
    devices = [
        SimpleNamespace(
            id="dev-1",
            battery_status=True,
            brand="ESP32",
            serial_number="SN-1",
        ),
        SimpleNamespace(
            id="dev-2",
            battery_status=True,
            brand="ESP32",
            serial_number="SN-2",
        ),
    ]
    session = FakeSession(
        [
            FakeResult(one=field_row),
            FakeResult(rows=devices),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields/3")

    assert response.status_code == 200
    assert response.json()["device_count"] == 2
    assert response.json()["devices_online"] == 2


def test_get_field_not_found():
    client = make_client()
    session = FakeSession([FakeResult(one=None)])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields/99")

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"


def test_update_field():
    client = make_client()
    updated = SimpleNamespace(
        id=3,
        name="Hort nou",
        location="Andorra",
        lat=42.5,
        lon=1.5,
        field_type="greenhouse",
        soil_type="clay",
        size_m2=12.5,
        device_count=1,
    )
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(one=updated),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/fields/3",
            json={
                "name": "Hort nou",
                "location": "Andorra",
                "field_type": "greenhouse",
                "soil_type": "clay",
                "size_m2": 12.5,
            },
        )

    assert response.status_code == 200
    assert response.json()["name"] == "Hort nou"
    assert response.json()["device_count"] == 1
    assert session.committed is True


def test_update_field_not_found():
    client = make_client()
    session = FakeSession([FakeResult(one=None)])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/fields/99",
            json={"name": "Hort nou"},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"


def test_update_field_name_required():
    client = make_client()

    response = client.put("/fields/3", json={"name": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Name is required"


def test_create_field():
    client = make_client()
    created = SimpleNamespace(
        id=8,
        name="Hort nou",
        location="Andorra",
        lat=42.5,
        lon=1.5,
        field_type="home_garden",
        soil_type="loam",
        size_m2=20.0,
        device_count=0,
    )
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=8)),
            FakeResult(one=created),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.post(
            "/fields",
            json={
                "name": "Hort nou",
                "location": "Andorra",
                "lat": 42.5,
                "lon": 1.5,
                "field_type": "home_garden",
                "soil_type": "loam",
                "size_m2": 20,
            },
        )

    assert response.status_code == 200
    assert response.json()["id"] == 8
    assert response.json()["lat"] == 42.5
    assert session.committed is True


def test_create_field_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post("/fields", json={"name": "Hort nou"})

    assert response.status_code == 401


def test_create_field_name_required():
    client = make_client()

    response = client.post("/fields", json={"name": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Name is required"


def test_geocode_location():
    client = make_client()

    with patch(
        "api.v1.fields.lookup_location",
        return_value={"lat": 42.5, "lon": 1.5, "label": "Andorra"},
    ):
        response = client.get("/geocode", params={"q": "Andorra"})

    assert response.status_code == 200
    assert response.json()["lat"] == 42.5


def test_geocode_not_found():
    client = make_client()

    with patch("api.v1.fields.lookup_location", return_value=None):
        response = client.get("/geocode", params={"q": "xxxx"})

    assert response.status_code == 404


def test_geocode_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/geocode", params={"q": "Andorra"})

    assert response.status_code == 401


def test_create_device():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.post(
            "/fields/3/devices",
            json={
                "id": "esp32_sim_01",
                "brand": "ESP32",
                "serial_number": "SN-1",
            },
        )

    assert response.status_code == 200
    assert response.json()["id"] == "esp32_sim_01"
    assert response.json()["battery_status"] is False
    assert session.committed is True


def test_create_device_requires_id():
    client = make_client()

    response = client.post(
        "/fields/3/devices",
        json={"id": "   ", "brand": "ESP32", "serial_number": "SN-1"},
    )

    assert response.status_code == 400


def test_create_device_field_not_found():
    client = make_client()
    session = FakeSession([FakeResult(one=None)])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.post(
            "/fields/99/devices",
            json={
                "id": "esp32_sim_01",
                "brand": "ESP32",
                "serial_number": "SN-1",
            },
        )

    assert response.status_code == 404


def test_update_device():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(
                one=SimpleNamespace(
                    id="esp32_sim_01",
                    battery_status=True,
                    brand="ESP32",
                    serial_number="SN-9",
                )
            ),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/fields/3/devices/esp32_sim_01",
            json={"brand": "ESP32", "serial_number": "SN-9"},
        )

    assert response.status_code == 200
    assert response.json()["serial_number"] == "SN-9"


def test_delete_device():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(one=SimpleNamespace(id="esp32_sim_01")),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.delete("/fields/3/devices/esp32_sim_01")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert session.committed is True


def test_delete_device_not_found():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(one=None),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.delete("/fields/3/devices/missing")

    assert response.status_code == 404


def test_create_device_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/fields/3/devices",
        json={
            "id": "esp32_sim_01",
            "brand": "ESP32",
            "serial_number": "SN-1",
        },
    )

    assert response.status_code == 401


def test_create_field_rejects_partial_coords():
    client = make_client()
    response = client.post("/fields", json={"name": "Hort", "lat": 42.5})
    assert response.status_code == 400


def test_create_field_rejects_invalid_coords_and_size():
    client = make_client()
    assert client.post("/fields", json={"name": "Hort", "lat": 99, "lon": 1}).status_code == 400
    assert client.post("/fields", json={"name": "Hort", "lat": 42, "lon": 200}).status_code == 400
    assert client.post("/fields", json={"name": "Hort", "size_m2": 0}).status_code == 400


def test_create_device_requires_brand():
    client = make_client()
    response = client.post(
        "/fields/3/devices",
        json={"id": "esp32_sim_01", "brand": "  ", "serial_number": "SN-1"},
    )
    assert response.status_code == 400


def test_create_device_conflict():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            IntegrityError("insert", {}, Exception("dup")),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.post(
            "/fields/3/devices",
            json={
                "id": "esp32_sim_01",
                "brand": "ESP32",
                "serial_number": "SN-1",
            },
        )

    assert response.status_code == 409


def test_update_device_requires_serial():
    client = make_client()
    response = client.put(
        "/fields/3/devices/esp32_sim_01",
        json={"brand": "ESP32", "serial_number": "  "},
    )
    assert response.status_code == 400


def test_update_device_not_found():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            FakeResult(one=None),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/fields/3/devices/missing",
            json={"brand": "ESP32", "serial_number": "SN-9"},
        )

    assert response.status_code == 404


def test_update_device_conflict():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=SimpleNamespace(id=3)),
            IntegrityError("update", {}, Exception("dup")),
        ]
    )

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/fields/3/devices/esp32_sim_01",
            json={"brand": "ESP32", "serial_number": "SN-9"},
        )

    assert response.status_code == 409


def test_create_boundary_recomputes_area_and_center():
    import json

    from services.field_geometry_service import field_geometry

    corners = [
        {"lat": 0.0, "lon": 0.0},
        {"lat": 0.0, "lon": 0.001},
        {"lat": 0.001, "lon": 0.001},
        {"lat": 0.001, "lon": 0.0},
    ]
    area, lat, lon = field_geometry(corners)
    row = SimpleNamespace(
        **{**vars(FIELD), "size_m2": area, "lat": lat, "lon": lon, "boundary": corners}
    )

    class CaptureSession(FakeSession):
        async def execute(self, statement, params):
            if "INSERT" in str(statement):
                self.insert = params
            return await super().execute(statement, params)

    session = CaptureSession([FakeResult(one=SimpleNamespace(id=3)), FakeResult(one=row)])
    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = make_client().post(
            "/fields",
            json={
                "name": "Field",
                "field_type": "orchard",
                "size_m2": 99,
                "lat": 40,
                "lon": 2,
                "boundary": corners,
            },
        )
    assert response.status_code == 200
    assert response.json()["size_m2"] == 12364.35
    assert session.insert["size_m2"] == area
    assert session.insert["lat"] == lat
    assert json.loads(session.insert["boundary"]) == corners
    assert session.committed


def test_create_boundary_rejects_crossed_edges_before_database():
    corners = [
        {"lat": 0, "lon": 0},
        {"lat": 0.001, "lon": 0.001},
        {"lat": 0, "lon": 0.001},
        {"lat": 0.001, "lon": 0},
    ]
    with patch("api.v1.fields.AsyncSessionLocal") as database:
        response = make_client().post(
            "/fields", json={"name": "Field", "field_type": "open_field", "boundary": corners}
        )
    assert response.status_code == 400
    database.assert_not_called()


def test_reverse_geocode_requires_authentication():
    app = FastAPI()
    app.include_router(router)
    assert TestClient(app).get("/reverse-geocode?lat=41&lon=2").status_code == 401


def test_reverse_geocode_validates_coordinates_and_preserves_result():
    client = make_client()
    assert client.get("/reverse-geocode?lat=91&lon=2").status_code == 422
    with patch(
        "api.v1.fields.reverse_location",
        return_value={"lat": 41.0, "lon": 2.0, "label": "Field road"},
    ) as lookup:
        response = client.get("/reverse-geocode?lat=41&lon=2")
    assert response.status_code == 200
    assert response.json()["label"] == "Field road"
    lookup.assert_called_once_with(41.0, 2.0)


def test_update_replaces_geometry_and_subtracts_exclusions():
    import json

    from services.field_geometry_service import field_geometry

    outer = [
        {"lat": 0.0, "lon": 0.0},
        {"lat": 0.0, "lon": 0.001},
        {"lat": 0.001, "lon": 0.001},
        {"lat": 0.001, "lon": 0.0},
    ]
    hole = [
        {"lat": 0.0002, "lon": 0.0002},
        {"lat": 0.0002, "lon": 0.0004},
        {"lat": 0.0004, "lon": 0.0004},
        {"lat": 0.0004, "lon": 0.0002},
    ]
    net, lat, lon = field_geometry(outer, [hole])
    row = SimpleNamespace(
        **{
            **vars(FIELD),
            "boundary": outer,
            "excluded_zones": [hole],
            "lat": lat,
            "lon": lon,
            "size_m2": net,
        }
    )

    class Capture(FakeSession):
        async def execute(self, statement, params):
            if "UPDATE" in str(statement):
                self.parameters = params
            return await super().execute(statement, params)

    session = Capture([FakeResult(one=SimpleNamespace(id=3)), FakeResult(one=row)])
    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = make_client().put(
            "/fields/3",
            json={
                "name": "Field",
                "field_type": "orchard",
                "size_m2": 999,
                "boundary": outer,
                "excluded_zones": [hole],
            },
        )
    assert response.status_code == 200
    assert response.json()["size_m2"] == 11869.78
    assert json.loads(session.parameters["excluded_zones"]) == [hole]
    assert session.parameters["lat"] == lat


def test_update_explicitly_clears_boundary_and_exclusions():
    class Capture(FakeSession):
        async def execute(self, statement, params):
            if "UPDATE" in str(statement):
                self.parameters = params
            return await super().execute(statement, params)

    session = Capture([FakeResult(one=SimpleNamespace(id=3)), FakeResult(one=FIELD)])
    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = make_client().put(
            "/fields/3",
            json={
                "name": "Field",
                "field_type": "open_field",
                "size_m2": None,
                "boundary": None,
                "excluded_zones": [],
            },
        )
    assert response.status_code == 200
    assert session.parameters["boundary"] is None
    assert session.parameters["excluded_zones"] == "[]"
    assert session.parameters["size_m2"] is None
