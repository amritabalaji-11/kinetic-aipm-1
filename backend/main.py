from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils.config import FRONTEND_ORIGIN
from routes.health import router as health_router

app = FastAPI()

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