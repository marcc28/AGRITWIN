import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

<<<<<<< HEAD
from api.v1 import auth, legal, user
=======
from api.v1 import legal, user
>>>>>>> feature/9-sprint-1-implement-signup-system

load_dotenv()


app = FastAPI(title="AgriTwin")
# Base.metadata.create_all(bind=engine)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # carpeta de main.py
# UPLOAD_DIR = os.path.join(BASE_DIR, "profile_images")

secret_key = os.getenv("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY environment variable is not set")

app.add_middleware(SessionMiddleware, secret_key=secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routes
app.include_router(user.router, prefix="/api/v1")
app.include_router(legal.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")

# app.mount("/profile_images", StaticFiles(directory=UPLOAD_DIR), name="profile_images")


# PING ENDPOINT
@app.api_route("/ping", methods=["GET", "HEAD"])
def ping(request: Request):
    if request.method == "HEAD":
        return JSONResponse(content=None, status_code=200)
    return JSONResponse(content=None, status_code=200)
