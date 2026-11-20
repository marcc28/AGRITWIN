"""Self-hosted API documentation with a CSP scoped to each HTML document."""

import json
import re
import secrets
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

ASSET_DIRECTORY = Path(__file__).with_name("docs_static")
ASSET_URL = "/docs-assets"
SWAGGER_VERSION = "5.35.1"
REDOC_VERSION = "2.5.3"
ASSET_INTEGRITY = {
    "swagger-ui-5.35.1/swagger-ui-bundle.js": "sha384-J5eKRXKO1KzUTPkO0GRmGH2WEYUg6SSZlufilxvTwI6nmhLumjNWFMby3QQnyobZ",
    "swagger-ui-5.35.1/swagger-ui.css": "sha384-WlYgdmXYOOBWL5apwjDEZwN+U3HmXSSu5R6V5aGxEcf7z+KuRNwBhoxKVN1i3D5I",
    "redoc-2.5.3/redoc.standalone.js": "sha384-xiEssMQFSpSfLbzRZCGfxxIM5QDb2DTrU6vyoZdp2sV1L6pmOMy6MpTtUoLbpC96",
}


def _secure_document(response: HTMLResponse, nonce: str, *, redoc: bool = False) -> HTMLResponse:
    # FastAPI's bootstrap and redirect scripts remain intact. Authorize only those
    # scripts, the local bundles, and ReDoc's nonce-aware generated styles.
    html = re.sub(r"<(script|style)(?=[\s>])", rf'<\1 nonce="{nonce}"', response.body.decode())
    for asset, integrity in ASSET_INTEGRITY.items():
        html = re.sub(
            rf'((?:src|href)="[^"]*/{re.escape(asset)}")',
            rf'\1 integrity="{integrity}" crossorigin="anonymous"',
            html,
        )
    response = HTMLResponse(html)
    directives = [
        "default-src 'none'",
        f"script-src 'self' 'nonce-{nonce}'",
        f"style-src 'self' 'nonce-{nonce}'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
    if redoc:
        # ReDoc's search index runs in an embedded, bundled Web Worker.
        directives.append("worker-src blob:")
    response.headers["Content-Security-Policy"] = "; ".join(directives)
    response.headers["X-Frame-Options"] = "DENY"
    return response


def install_documentation(app: FastAPI) -> None:
    """Replace FastAPI's CDN-based views without changing the OpenAPI endpoint."""
    app.mount(ASSET_URL, StaticFiles(directory=ASSET_DIRECTORY), name="docs-assets")

    @app.get("/docs", include_in_schema=False)
    async def swagger_ui(request: Request) -> HTMLResponse:
        root_path = request.scope.get("root_path", "").rstrip("/")
        assets = root_path + ASSET_URL
        response = get_swagger_ui_html(
            openapi_url=root_path + app.openapi_url,
            title=app.title + " - Swagger UI",
            swagger_js_url=f"{assets}/swagger-ui-{SWAGGER_VERSION}/swagger-ui-bundle.js",
            swagger_css_url=f"{assets}/swagger-ui-{SWAGGER_VERSION}/swagger-ui.css",
            swagger_favicon_url=f"{assets}/swagger-ui-{SWAGGER_VERSION}/favicon-32x32.png",
            oauth2_redirect_url=root_path + app.swagger_ui_oauth2_redirect_url,
            init_oauth=app.swagger_ui_init_oauth,
            swagger_ui_parameters=app.swagger_ui_parameters,
        )
        return _secure_document(response, secrets.token_urlsafe(32))

    @app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)
    async def swagger_oauth_redirect() -> HTMLResponse:
        return _secure_document(get_swagger_ui_oauth2_redirect_html(), secrets.token_urlsafe(32))

    @app.get("/redoc", include_in_schema=False)
    async def redoc(request: Request) -> HTMLResponse:
        root_path = request.scope.get("root_path", "").rstrip("/")
        assets = root_path + ASSET_URL
        nonce = secrets.token_urlsafe(32)
        response = get_redoc_html(
            openapi_url=root_path + app.openapi_url,
            title=app.title + " - ReDoc",
            redoc_js_url=f"{assets}/redoc-{REDOC_VERSION}/redoc.standalone.js",
            redoc_favicon_url=f"{assets}/swagger-ui-{SWAGGER_VERSION}/favicon-32x32.png",
            with_google_fonts=False,
        )
        # Explicit initialization passes ReDoc's supported nonce option through to
        # styled-components. The custom element would initialize without it.
        html = re.sub(r"<redoc spec-url=\"[^\"]*\"></redoc>", '<div id="redoc"></div>', response.body.decode())
        init = (
            "Redoc.init("
            + json.dumps(root_path + app.openapi_url)
            + ", {nonce: "
            + json.dumps(nonce)
            + "}, document.getElementById('redoc'));"
        )
        html = html.replace("</body>", f"<script>{init}</script></body>")
        return _secure_document(HTMLResponse(html), nonce, redoc=True)
