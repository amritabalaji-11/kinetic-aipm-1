import json

from fastapi import APIRouter, HTTPException

from db.database import db

router = APIRouter()


@router.get("/analysis/{analysis_id}/progression")
async def get_progression(analysis_id: str):
    """
    Returns progression coaching + progression assets
    for the requested analysis_id.
    """

    # =====================================================
    # FETCH PROGRESSION RESULT
    # =====================================================

    progression = await db.fetch_one(
        """
        SELECT *
        FROM progression_results
        WHERE analysis_id = :aid
        """,
        {
            "aid": analysis_id
        }
    )

    # -----------------------------------------------------
    # NOT FOUND
    # -----------------------------------------------------

    if not progression:
        raise HTTPException(
            status_code=404,
            detail="Progression result not found"
        )

    # =====================================================
    # NO HISTORY CASE
    # available = false
    # =====================================================

    if progression["available"] == 0:

        return {
            "available": False,

            "error": progression["error_code"],

            "message": (
                "Complete another session to unlock progression insights."
            )
        }

    # =====================================================
    # FETCH USER PROFILE
    # =====================================================

    profile = await db.fetch_one(
        """
        SELECT
            annotated_frame_url,
            progress_ladder_image_url,
            age,
            gender,
            level,
            injury_report,
            injury_details
        FROM user_profile
        WHERE user_id = :uid
        """,
        {
            "uid": progression["user_id"]
        }
    )

    # =====================================================
    # PARSE WEIGHT RECOMMENDATION
    # =====================================================

    weight_recommendation = None

    if progression["weight_recommendation"]:

        try:

            weight_recommendation = json.loads(
                progression["weight_recommendation"]
            )

        except Exception:

            weight_recommendation = None

    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "available": True,

        "analysis_id": progression["analysis_id"],

        "user_id": progression["user_id"],

        "session_id": progression["session_id"],

        "exercise_id": progression["exercise_id"],

        "progression_verdict":
            progression["progression_verdict"],

        "progress_direction":
            progression["progress_direction"],

        "focus_this_week":
            progression["focus_this_week"],

        "coaching_reasoning":
            progression["coaching_reasoning"],

        "posture_trend":
            progression["posture_trend"],

        "stability_trend":
            progression["stability_trend"],

        "range_of_motion_trend":
            progression["range_of_motion_trend"],

        "movement_quality_trend":
            progression["movement_quality_trend"],

        "weight_recommendation":
            weight_recommendation,

        "computed_at":
            progression["computed_at"],

        # =================================================
        # USER PROFILE ASSETS
        # =================================================

        "profile": {

            "annotated_frame_url":
                profile["annotated_frame_url"]
                if profile else None,

            "progress_ladder_image_url":
                profile["progress_ladder_image_url"]
                if profile else None,

            "age":
                profile["age"]
                if profile else None,

            "gender":
                profile["gender"]
                if profile else None,

            "level":
                profile["level"]
                if profile else None,

            "injury_report":
                bool(profile["injury_report"])
                if profile else False,

            "injury_details":
                profile["injury_details"]
                if profile else None,
        }
    }