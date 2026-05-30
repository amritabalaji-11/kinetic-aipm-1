import json
from fastapi import APIRouter, HTTPException
from db.database import db

router = APIRouter()


@router.get("/analysis/{analysis_id}/progression")
async def get_progression(analysis_id: str):
    """
    Returns the Haiku Call 2 longitudinal coaching output for a given analysis.

    Shape returned (matches form-comparison fixture):
    {
      has_comparison, current, previous, comparison_coaching, progression_timeline
    }

    202 — Haiku Call 2 still running (status is uploaded/processing)
    404 — analysis not found, or progression data unavailable after completion
    """
    record = await db.fetch_one(
        "SELECT status, progression_output FROM form_analyses WHERE analysis_id = :aid",
        {"aid": analysis_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if not record["progression_output"]:
        if record["status"] in ("uploaded", "processing"):
            raise HTTPException(status_code=202, detail="Progression analysis still processing")
            # completed/failed but no progression data (e.g. first-ever session)
        raise HTTPException(status_code=404, detail="Progression data not available")
 

    return json.loads(record["progression_output"])
