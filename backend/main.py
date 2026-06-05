from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import db

from utils.config import FRONTEND_ORIGIN
from routes.health import router as health_router
from init_db import init_db

from routes.analysis_haiku_integration_example import router as haiku_router
from routes import upload, stream, analysis, progression, history, stream

app = FastAPI()

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Kinetic backend is running 🚀"
    }

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(haiku_router) 
app.include_router(progression.router)

#DB connection management
@app.on_event("startup")
async def startup():
    init_db()
    await db.connect()


@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()