import json

from fastapi import APIRouter, HTTPException

from db.database import db

router = APIRouter()


def _safe_delta(a, b):
    if a is None or b is None:
        return None
    return a - b


@router.get("/analysis/{analysis_id}/progression")
async def get_progression(analysis_id: str):

    current = await db.fetch_one(
        """
        SELECT
            far.analysis_id,
            far.session_id,
            far.user_id,
            far.exercise_id,
            far.overall_form_score,
            far.posture_score,
            far.stability_score,
            far.movement_quality_score,
            far.range_of_motion_score,
            far.rep_scores,
            fa.weight_value,
            fa.weight_unit,
            fa.created_at
        FROM form_analysis_results far
        JOIN form_analyses fa
            ON far.session_id = fa.session_id
        WHERE far.analysis_id = :analysis_id
        """,
        values={"analysis_id": analysis_id}
    )

    if not current:
        raise HTTPException(status_code=404, detail="Analysis not found")

    previous = await db.fetch_one(
        """
        SELECT
            far.analysis_id,
            far.session_id,
            far.overall_form_score,
            far.posture_score,
            far.stability_score,
            far.movement_quality_score,
            far.range_of_motion_score,
            far.rep_scores,
            far.coaching_output,
            far.annotated_frame_url,
            fa.weight_value,
            fa.weight_unit,
            fa.created_at
        FROM form_analysis_results far
        JOIN form_analyses fa
            ON far.session_id = fa.session_id
        WHERE far.user_id = :user_id
          AND far.exercise_id = :exercise_id
          AND far.analysis_id != :analysis_id
        ORDER BY fa.created_at DESC
        LIMIT 1
        """,
        values={
            "user_id": current["user_id"],
            "exercise_id": current["exercise_id"],
            "analysis_id": analysis_id
        }
    )

    if not previous:
        return {"available": False}

    current_rep_scores = []
    if current["rep_scores"]:
        try:
            current_rep_scores = json.loads(current["rep_scores"])
        except Exception:
            current_rep_scores = []

    spread = (
        max(current_rep_scores) - min(current_rep_scores)
        if current_rep_scores
        else 0
    )

    previous_next_session_focus = []
    if previous["coaching_output"]:
        try:
            coaching = (
                json.loads(previous["coaching_output"])
                if isinstance(previous["coaching_output"], str)
                else previous["coaching_output"]
            )
            
            print("PARSED coaching_output:")
            print(coaching)

            previous_next_session_focus = coaching.get("next_session_focus", [])
        except Exception:
            pass

    deltas = {
        "posture":          _safe_delta(current["posture_score"],          previous["posture_score"]),
        "stability":        _safe_delta(current["stability_score"],        previous["stability_score"]),
        "movement_quality": _safe_delta(current["movement_quality_score"], previous["movement_quality_score"]),
        "range_of_motion":  _safe_delta(current["range_of_motion_score"],  previous["range_of_motion_score"]),
    }

    profile = await db.fetch_one(
        """
        SELECT 
            progress_ladder_image_url,
            annotated_frame_url
        FROM user_profiles
        WHERE user_id = :uid
        """,
        values={"uid": current["user_id"]}
    )

    progression = await db.fetch_one(
        """
        SELECT *
        FROM progression_results
        WHERE analysis_id = :analysis_id
        """,
        values={"analysis_id": analysis_id}
    )

    ai_verdict = None
    if progression and progression["available"] == 1:
        weight_recommendation = None
        try:
            if progression["weight_recommendation"]:
                weight_recommendation = json.loads(progression["weight_recommendation"])
        except Exception:
            pass

        ai_verdict = {
            "progression_verdict":   progression["progression_verdict"],
            "progress_direction":    progression["progress_direction"],
            "focus_this_week":       progression["focus_this_week"],
            "weight_recommendation": weight_recommendation,
            "posture_trend":         progression["posture_trend"],
            "stability_trend":       progression["stability_trend"],
            "range_of_motion_trend": progression["range_of_motion_trend"],
            "movement_quality_trend": progression["movement_quality_trend"],
        }

    history_rows = await db.fetch_all(
        """
        SELECT
            fa.created_at,
            far.overall_form_score,
            far.annotated_frame_url,
            far.coaching_output,
            far.weight_value
        FROM form_analysis_results far
        JOIN form_analyses fa
            ON far.session_id = fa.session_id
        WHERE far.user_id = :user_id
          AND far.exercise_id = :exercise_id
        ORDER BY fa.created_at DESC
        LIMIT 3 OFFSET 1
        """,
        values={
            "user_id": current["user_id"],
            "exercise_id": current["exercise_id"]
        }
    )

    form_history = []
    for row in history_rows:
        verdict = None
        try:
            coaching = json.loads(row["coaching_output"]) if row["coaching_output"] else {}
            verdict = (
                coaching.get("summary")
                or coaching.get("verdict")
                or coaching.get("overall_feedback")
            )
        except Exception:
            pass

        form_history.append({
            "date":                row["created_at"],
            "overall_score":       row["overall_form_score"],
            "weight_used":         row["weight_value"],
            "annotated_frame_url": row["annotated_frame_url"],
            "verdict":             verdict,
        })

    return {
        "available": True,
        "current_session": {
            "date":             current["created_at"],
            "overall_score":          current["overall_form_score"],
            "posture_score":          current["posture_score"],
            "stability_score":        current["stability_score"],
            "movement_quality_score": current["movement_quality_score"],
            "range_of_motion_score":  current["range_of_motion_score"],
            "rep_scores":       current_rep_scores,
            "spread":           spread,
            "weight_value": current["weight_value"],
            "weight_unit": current["weight_unit"],
            "annotated_frame_url": (
                profile["annotated_frame_url"] if profile else None
            ),
        },
        "previous_session": {
            "date":               previous["created_at"],
            "overall_score":            previous["overall_form_score"],
            "posture_score":            previous["posture_score"],
            "stability_score":          previous["stability_score"],
            "movement_quality_score":   previous["movement_quality_score"],
            "range_of_motion_score":    previous["range_of_motion_score"],
            "next_session_focus":       previous_next_session_focus,
            "weight_value":             previous["weight_value"],
            "weight_unit":              previous["weight_unit"],
            "annotated_frame_url":      previous["annotated_frame_url"],
        },
        "deltas":                      deltas,
        "previous_next_session_focus": previous_next_session_focus,
        "progress_ladder_image_url":   profile["progress_ladder_image_url"] if profile else None,
        "ai_verdict":                  ai_verdict,
        "form_history":                form_history,
    }
