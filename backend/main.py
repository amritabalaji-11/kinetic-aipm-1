from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils.config import FRONTEND_ORIGIN
from routes.health import router as health_router
from routes import upload, stream

app = FastAPI()

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