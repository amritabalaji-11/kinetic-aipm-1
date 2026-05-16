# SSE HTTP endpoint

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from utils.sse_manager import sse_manager
from db.database import db

router = APIRouter()


@router.get("/analysis/{analysis_id}/stream")
async def stream_analysis(
    analysis_id: str,
    request: Request
):
    analysis = await db.fetch_one(
        """
        SELECT *
        FROM form_analyses
        WHERE analysis_id = :analysis_id
        """,
        {"analysis_id": analysis_id}
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )

    # Pipeline starts from POST /upload (BackgroundTasks). This endpoint only streams SSE.

    return StreamingResponse(
        sse_manager.subscribe(
            analysis_id,
            request
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
