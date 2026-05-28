import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from utils.config import FRONTEND_ORIGIN
from utils.database import db
from routes.health import router as health_router
from routes import upload, stream

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB Pool
    await db.connect()
    yield
    # Shutdown: Close DB Pool
    await db.disconnect()

app = FastAPI(lifespan=lifespan)

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

# Static file serving
os.makedirs("worst_frames", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/worst_frames", StaticFiles(directory="worst_frames"), name="worst_frames")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")