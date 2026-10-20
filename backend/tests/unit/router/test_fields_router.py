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

from api.v1.auth import get_current_user
from api.v1.fields import router
from db.schema import User

FIELD = SimpleNamespace(
    id=3,
    name="Hort de l'Ainhoa",
    location="Andorra la Vella",
    field_type="home_garden",
    soil_type="loam",
    size_m2=40.0,
    device_count=2,
)


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
        return self._results.pop(0)

    async def commit(self):
        self.committed = True

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
    assert response.json() == [
        {
            "id": 3,
            "name": "Hort de l'Ainhoa",
            "location": "Andorra la Vella",
            "field_type": "home_garden",
            "soil_type": "loam",
            "size_m2": 40.0,
            "device_count": 2,
        }
    ]


def test_list_fields_empty():
    client = make_client()
    session = FakeSession([FakeResult(rows=[])])

    with patch("api.v1.fields.AsyncSessionLocal", return_value=session):
        response = client.get("/fields")

    assert response.status_code == 200
    assert response.json() == []


def test_update_field():
    client = make_client()
    updated = SimpleNamespace(
        id=3,
        name="Hort nou",
        location="Andorra",
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
