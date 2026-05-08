# SSE HTTP endpoint

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from services.pipeline_stream import pipeline_stream

router = APIRouter()

@router.get("/analysis/{analysis_id}/stream")
async def stream_analysis_status(analysis_id: str):
    if not analysis_id:
        raise HTTPException(status_code=400, detail="analysis_id required")

    return StreamingResponse(
        pipeline_stream(analysis_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )