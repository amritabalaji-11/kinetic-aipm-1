from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from db.database import db

from utils.config import FRONTEND_ORIGIN
from utils.media_links import sign_media_links
from routes.health import router as health_router
from init_db import init_db

# routes/analysis_haiku_integration_example.py is a developer example (calls Claude with no login, costs money).
# It is deliberately NOT registered. To try it locally, import its router and include it, then remove it again.
from routes import upload, stream, analysis, progression, history, tts, workouts
from routes.user import router as user_router
from routes.auth import router as auth_router
from routes.exercises import router as exercises_router


app = FastAPI()

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Kinetic backend is running 🚀"
    }

# Videos and annotated photos live in a private bucket. Swap their gs:// addresses for
# 15-minute viewing links on the way out, so the browser can show them.
@app.middleware("http")
async def add_media_links(request: Request, call_next):
    response = await call_next(request)
    if "application/json" not in response.headers.get("content-type", ""):
        return response  # streams (SSE), files etc. pass through untouched
    body = b"".join([chunk async for chunk in response.body_iterator])
    text = body.decode("utf-8", errors="ignore")
    if "gs://" in text:
        body = sign_media_links(text).encode("utf-8")
    headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
    return Response(content=body, status_code=response.status_code, headers=headers, media_type="application/json")


# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health_router)
app.include_router(upload.router)
app.include_router(stream.router)
app.include_router(history.router)
app.include_router(analysis.router)
app.include_router(progression.router)
app.include_router(user_router)
app.include_router(auth_router)
app.include_router(exercises_router)
app.include_router(tts.router)
app.include_router(workouts.router)


#DB connection management
@app.on_event("startup")
async def startup():
    init_db()
    await db.connect()


@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()