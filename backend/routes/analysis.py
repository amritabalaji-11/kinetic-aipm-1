from fastapi import APIRouter, HTTPException
from db.database import db
import json

router = APIRouter()

def safe_json(val):
    if not val:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except:
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
            "rep_scores": safe_json(results.get("rep_scores")),
            "coaching_output": safe_json(results.get("coaching_output")),
            "issues_json": safe_json(results.get("issues_json")),
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
        
        # Determine exercise_id
        exercise_id = results.get("exercise_id") if results else "goblet_squat"
        if not exercise_id and analysis:
            exercise_id = analysis.get("exercise_name") or "goblet_squat"

        # Dynamically build current session scores block
        current_session = {
            "overall_form_score": results.get("overall_form_score") or 0 if results else 0,
            "posture_score": results.get("posture_score") or 0 if results else 0,
            "stability_score": results.get("stability_score") or 0 if results else 0,
            "tempo_score": results.get("tempo_score") or 0 if results else 0,
            "movement_quality_score": results.get("movement_quality_score") or 0 if results else 0,
            "range_of_motion_score": (results.get("range_of_motion_score") or results.get("tempo_score") or 0) if results else 0,
        }

        # Dynamically query the previous session to get its scores and date
        previous_session = None
        previous_session_date = None
        try:
            previous = await db.fetch_one(
                """
                SELECT far.*, fa.created_at
                FROM form_analysis_results far
                JOIN form_analyses fa ON far.analysis_id = fa.analysis_id
                WHERE far.user_id = :user_id
                  AND far.exercise_id = :exercise_id
                  AND far.analysis_id != :analysis_id
                ORDER BY fa.created_at DESC
                LIMIT 1
                """,
                {
                    "user_id": analysis.get("user_id"),
                    "exercise_id": exercise_id,
                    "analysis_id": analysis_id,
                }
            )
            if previous:
                previous = dict(previous)
                previous_session = {
                    "overall_form_score": previous.get("overall_form_score") or 0,
                    "posture_score": previous.get("posture_score") or 0,
                    "stability_score": previous.get("stability_score") or 0,
                    "tempo_score": previous.get("tempo_score") or 0,
                    "movement_quality_score": previous.get("movement_quality_score") or 0,
                    "range_of_motion_score": previous.get("range_of_motion_score") or previous.get("tempo_score") or 0,
                }
                previous_session_date = previous.get("created_at")
        except Exception as e:
            print(f"[routes/analysis] Failed to fetch previous session details: {e}")

        # Construct highly-compatible progression block
        haiku_call_2 = {
            **progression,
            "weight_recommendation": safe_json(
                progression.get("weight_recommendation")
            ),
            
            # Map database trend columns to React expected note keys
            "posture_note": progression.get("posture_trend"),
            "stability_note": progression.get("stability_trend"),
            "range_of_motion_note": progression.get("range_of_motion_trend"),
            "movement_quality_note": progression.get("movement_quality_trend"),
            
            # Sidebar metrics for side-by-side comparison rings
            "current_session": current_session,
            "previous_session": previous_session,
            "previous_session_date": previous_session_date,
        }

    # =====================================================
    # 4. RESPONSE
    # =====================================================
    # We return BOTH top-level flat properties for LoadingPage.jsx
    # AND the nested 'analysis' block for ResultsPage.jsx.
    return {
        # Flat properties (for LoadingPage.jsx)
        **analysis,
        "analysis_id": analysis.get("analysis_id") or analysis_id,
        "session_id": analysis.get("session_id"),
        "user_id": analysis.get("user_id"),
        "exercise_id": results.get("exercise_id") if results else (analysis.get("exercise_name") or "goblet_squat"),
        "exercise_name": analysis.get("exercise_name"),
        "weight_value": analysis.get("weight_value"),
        "weight_unit": analysis.get("weight_unit"),
        "status": analysis.get("status"),
        "video_url": analysis.get("video_url"),
        "created_at": analysis.get("created_at"),
        "biomechanics_json": analysis.get("biomechanics_json"),

        # Nested keys (for ResultsPage.jsx)
        "analysis": analysis,
        "haiku_call_1": haiku_call_1,
        "haiku_call_2": haiku_call_2,
    }