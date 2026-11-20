"""Browser-facing security contracts for the self-hosted documentation."""

import base64
import hashlib
import os
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.security_docs import ASSET_DIRECTORY, install_documentation


class Resources(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def make_client(root_path=""):
    app = FastAPI(title="Documentation regression", docs_url=None, redoc_url=None)
    install_documentation(app)

    @app.get("/example")
    def example():
        return {"unchanged": True}

    return TestClient(app, root_path=root_path)


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/docs/oauth2-redirect"])
def test_docs_have_fresh_nonce_and_deny_framing(path):
    client = make_client()
    first, second = client.get(path), client.get(path)
    assert first.status_code == second.status_code == 200
    policy = first.headers["Content-Security-Policy"]
    nonce = re.search(r"'nonce-([^']+)'", policy).group(1)
    assert len(nonce) >= 32
    assert nonce not in second.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in policy
    assert "object-src 'none'" in policy
    assert "base-uri 'none'" in policy
    assert "'unsafe-inline'" not in policy
    assert "'unsafe-eval'" not in policy
    assert first.headers["X-Frame-Options"] == "DENY"
    for tag, attrs in Resources(first.text).tags:
        if tag in ("script", "style"):
            assert attrs.get("nonce") == nonce


@pytest.mark.parametrize("path", ["/docs", "/redoc"])
@pytest.mark.parametrize("root_path", ["", "/gateway"])
def test_docs_assets_are_local_with_valid_integrity_and_proxy_prefix(path, root_path):
    client = make_client(root_path)
    response = client.get(path)
    resources = []
    for tag, attrs in Resources(response.text).tags:
        url = attrs.get("src") or attrs.get("href")
        if not url:
            continue
        assert url.startswith(root_path + "/docs-assets/")
        asset_response = client.get(url)
        assert asset_response.status_code == 200
        if tag == "script" or attrs.get("rel") == "stylesheet":
            digest = base64.b64encode(hashlib.sha384(asset_response.content).digest()).decode()
            assert attrs["integrity"] == "sha384-" + digest
            assert attrs["crossorigin"] == "anonymous"
            resources.append(url)
    assert len(resources) == (2 if path == "/docs" else 1)
    assert root_path + "/openapi.json" in response.text
    assert "fonts.googleapis.com" not in response.text
    assert "cdn.jsdelivr.net" not in response.text
    assert client.get(root_path + "/docs-assets/../security_docs.py").status_code == 404


def test_schema_and_existing_route_are_preserved():
    client = make_client()
    assert client.get("/example").json() == {"unchanged": True}
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) == {"/example"}
    assert schema["info"]["title"] == "Documentation regression"
    assert client.get("/missing").status_code == 404
    assert (ASSET_DIRECTORY / "swagger-ui-5.35.1/LICENSE").is_file()


def test_real_application_keeps_headers_authentication_and_cors():
    # Isolate main from other tests' mocked modules and from developer credentials.
    environment = {
        "PATH": os.defpath,
        # Keep a deliberately selected framework test environment in the child.
        "PYTHONPATH": str(Path(sys.modules["fastapi"].__file__).resolve().parent.parent),
        "PYTHON_DOTENV_DISABLED": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "SECRET_KEY": "dummy-docs-security-secret-at-least-32-characters",
        "ENVIRONMENT": "test",
        "PROD": "False",
        "PRODUCTION": "False",
        "AWS_EC2_METADATA_DISABLED": "true",
        "SUPABASE_URL": "http://127.0.0.1:9999",
        "SUPABASE_SECRET_KEY": "sb_secret_dummy_local_docs_fixture",
        "GEMINI_API_KEY": "dummy",
        "MODEL_USE_IN_RECOMENDATION": "dummy",
        "MODEL_USE_IN_TRANSLATION": "dummy",
        "OPENWEATHER_API_KEY": "dummy",
        "APP_HOST": "http://localhost:8081",
        "FORGET_PASSWORD_URL": "http://localhost:8081/reset-password",
        "BREVO_API_KEY": "dummy",
        "BREVO_SENDER_EMAIL": "demo@example.invalid",
    }
    program = """
from fastapi.testclient import TestClient
from main import app
client = TestClient(app)
for path in ('/ping', '/docs', '/redoc', '/docs/oauth2-redirect', '/openapi.json'):
    response = client.get(path)
    assert response.status_code == 200, path
    assert response.headers['X-Content-Type-Options'] == 'nosniff', path
    assert response.headers['Cache-Control'] == 'no-store, no-cache, must-revalidate, private'
assert client.head('/ping').status_code == 200
assert client.head('/ping').content == b''
assert client.get('/api/v1/me').status_code == 401
preflight = client.options('/api/v1/me', headers={
    'Origin': 'http://localhost:8081', 'Access-Control-Request-Method': 'GET'
})
assert preflight.status_code == 200
assert preflight.headers['Access-Control-Allow-Origin'] == 'http://localhost:8081'
assert '/api/v1/me' in client.get('/openapi.json').json()['paths']
"""
    result = subprocess.run(
        [sys.executable, "-c", program],
        cwd=Path(__file__).resolve().parents[2],
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
