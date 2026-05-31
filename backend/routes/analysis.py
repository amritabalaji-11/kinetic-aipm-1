import json

from fastapi import APIRouter, HTTPException
from db.database import db

router = APIRouter()


def safe_json(val):
    if not val:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return val


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):

    # =====================================================
    # 1. BASE SESSION
    # =====================================================
    analysis = await db.fetch_one(
        """
        SELECT *
        FROM form_analyses
        WHERE analysis_id = :analysis_id
        """,
        {"analysis_id": analysis_id}
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis = dict(analysis)

    # =====================================================
    # 2. HAIKU CALL 1
    # =====================================================
    results = await db.fetch_one(
        """
        SELECT *
        FROM form_analysis_results
        WHERE analysis_id = :analysis_id
        """,
        {"analysis_id": analysis_id}
    )

    haiku_call_1 = None

    if results:
        results = dict(results)
        haiku_call_1 = {
            **results,
            "rep_scores":      safe_json(results.get("rep_scores")),
            "coaching_output": safe_json(results.get("coaching_output")),
            "issues_json":     safe_json(results.get("issues_json")),
        }

    # =====================================================
    # 3. HAIKU CALL 2
    # =====================================================
    progression = await db.fetch_one(
        """
        SELECT *
        FROM progression_results
        WHERE analysis_id = :analysis_id
        """,
        {"analysis_id": analysis_id}
    )

    haiku_call_2 = None

    if progression:
        progression = dict(progression)
        haiku_call_2 = {
            **progression,
            "weight_recommendation": safe_json(
                progression.get("weight_recommendation")
            )
        }

    # =====================================================
    # 4. RESPONSE
    # =====================================================
    return {
        "analysis":    analysis,
        "haiku_call_1": haiku_call_1,
        "haiku_call_2": haiku_call_2,
    }


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
                "progression_verdict":   prog["progression_verdict"],
                "progress_direction":    prog["progress_direction"],
                "weight_recommendation": (
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
            response["available"] = False

    return response
