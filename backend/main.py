import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from starlette.middleware.sessions import SessionMiddleware

from api.v1 import (
    anunces,
    auth,
    content_market,
    crops,
    crops_field,
    dashboard,
    fb_auth,
    field_recommendations,
    fields,
    google_auth,
    legal,
    payments,
    social_auth,
    user,
    weather,
    xauth,
)

load_dotenv()

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,"
        "https://agritwin.com,https://www.agritwin.com",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="AgriTwin")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

secret_key = os.getenv("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY environment variable is not set")

app.add_middleware(SessionMiddleware, secret_key=secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response


app.include_router(user.router, prefix="/api/v1")
app.include_router(legal.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(google_auth.router, prefix="/api/v1", tags=["google auth"])
app.include_router(fb_auth.router, prefix="/api/v1", tags=["facebook auth"])
app.include_router(xauth.router, prefix="/api/v1/x", tags=["x auth"])
app.include_router(social_auth.router, prefix="/api/v1", tags=["social auth"])
app.include_router(anunces.router, prefix="/api/v1")
app.include_router(content_market.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(fields.router, prefix="/api/v1")
app.include_router(field_recommendations.router, prefix="/api/v1")
app.include_router(weather.router, prefix="/api/v1")
app.include_router(
    payments.router,
    prefix="/api/v1/payments",
    tags=["payments"],
)

app.include_router(crops_field.router, prefix="/api/v1/crops")
app.include_router(crops.router, prefix="/api/v1")
app.include_router(
    field_recommendations.router,
    prefix="/api/v1",
)


@app.api_route("/ping", methods=["GET", "HEAD"])
def ping(request: Request):
    return JSONResponse(content=None, status_code=200)


# AWS Lambda handler
handler = Mangum(app)
