import json

from fastapi import APIRouter, HTTPException

from db.database import db

router = APIRouter()


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):

    analysis = await db.fetch_one(
        """
        SELECT *
        FROM form_analyses
        WHERE analysis_id = :analysis_id
        """,
        {
            "analysis_id": analysis_id
        }
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )

    return dict(analysis)


@router.get("/form_analysis/{analysis_id}/haiku-status")
async def get_haiku_status(analysis_id: str):
    """
    GET /form_analysis/{id}/haiku-status

    Returns real-time status of the Haiku Call 2 async job.

    Response shape (all statuses):
      haiku_call_2_status  — queued | running | complete | failed
      queued_at            — ISO-8601 UTC or null
      started_at           — ISO-8601 UTC or null
      completed_at         — ISO-8601 UTC or null
      error                — error string or null

    Additional fields when status == "complete" (all 8 S2-W8-02 output fields):
      progression_verdict, progress_direction, weight_recommendation,
      focus_this_week, posture_trend, stability_trend,
      range_of_motion_trend, movement_quality_trend

    Response time: <50 ms (primary-key lookup on form_analyses).
    404 if analysis_id does not exist.
    """
    # ── Single indexed lookup — always <50 ms ─────────────────────────────────
    row = await db.fetch_one(
        """
        SELECT
            haiku_call_2_status,
            haiku_call_2_queued_at,
            haiku_call_2_started_at,
            haiku_call_2_completed_at,
            haiku_call_2_error
        FROM form_analyses
        WHERE analysis_id = :aid
        """,
        {"aid": analysis_id},
    )

    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    response = {
        "haiku_call_2_status": row["haiku_call_2_status"],
        "queued_at":           row["haiku_call_2_queued_at"],
        "started_at":          row["haiku_call_2_started_at"],
        "completed_at":        row["haiku_call_2_completed_at"],
        "error":               row["haiku_call_2_error"],
    }

    # ── Attach all 8 output fields when the job is complete ───────────────────
    if row["haiku_call_2_status"] == "complete":
        prog = await db.fetch_one(
            """
            SELECT
                available,
                progression_verdict,
                progress_direction,
                weight_recommendation,
                focus_this_week,
                posture_trend,
                stability_trend,
                range_of_motion_trend,
                movement_quality_trend
            FROM progression_results
            WHERE analysis_id = :aid
            """,
            {"aid": analysis_id},
        )

        if prog and prog["available"]:
            weight_rec_raw = prog["weight_recommendation"]
            response.update({
                "progression_verdict":    prog["progression_verdict"],
                "progress_direction":     prog["progress_direction"],
                "weight_recommendation":  (
                    json.loads(weight_rec_raw)
                    if isinstance(weight_rec_raw, str)
                    else weight_rec_raw
                ),
                "focus_this_week":        prog["focus_this_week"],
                "posture_trend":          prog["posture_trend"],
                "stability_trend":        prog["stability_trend"],
                "range_of_motion_trend":  prog["range_of_motion_trend"],
                "movement_quality_trend": prog["movement_quality_trend"],
            })
        else:
            # First-ever session — job completed but no comparison data exists
            response["available"] = False

    return response