from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from utils.sse_manager import sse_manager

router = APIRouter()

@router.get("/stream")
async def stream_analysis_status(analysis_id: str, request: Request):
    if not analysis_id:
        raise HTTPException(status_code=400, detail="analysis_id required")

    return StreamingResponse(
        sse_manager.subscribe(analysis_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )