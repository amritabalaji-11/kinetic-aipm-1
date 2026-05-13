import json

from fastapi import APIRouter, HTTPException

from db.database import db

router = APIRouter()


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):

    session = await db.fetch_one(
        query="""
        SELECT *
        FROM form_sessions
        WHERE session_id = :session_id
        """,
        values={
            "session_id": analysis_id
        }
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )

    biomechanics_json = None

    if session["biomechanics_json"]:
        biomechanics_json = json.loads(
            session["biomechanics_json"]
        )

    return {
        "analysis_id": session["session_id"],
        "status": session["status"],
        "exercise_name": session["exercise_name"],
        "weight_used": session["weight_used"],
        "video_gcs_path": session["video_gcs_path"],
        "overlay_video_url": session["overlay_video_url"],
        "biomechanics_json": biomechanics_json
    }