from fastapi import APIRouter
from services.service import example_logic


router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}