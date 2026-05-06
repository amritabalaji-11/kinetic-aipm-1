from fastapi import APIRouter, Request, HTTPException
from utils.sse_manager import SSEManager
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.get("/stream")
async def stream_analysis_status(analysis_id: str, request: Request):
    if not analysis_id:
        raise HTTPException(status_code=400, detail="analysis_id query parameter is required")
    
    return StreamingResponse(
        SSEManager().susbcribe(analysis_id, request), 
        media_type="text/event-stream")