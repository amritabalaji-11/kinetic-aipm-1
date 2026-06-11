from fastapi import APIRouter, HTTPException
from db.database import db

router = APIRouter(prefix="/users")


@router.get("/")
async def list_users():
    rows = await db.fetch_all(
        """
        SELECT
            profile_id,
            user_id,
            display_name,
            age,
            gender,
            level,
            injury_report,
            injury_details
        FROM user_profiles
        ORDER BY display_name
        """
    )
    return [dict(row) for row in rows]


@router.get("/{user_id}/profile")
async def get_user_profile(user_id: str):
    profile = await db.fetch_one(
        """
        SELECT
            profile_id,
            user_id,
            display_name,
            annotated_frame_url
        FROM user_profiles
        WHERE user_id = :user_id
        """,
        {"user_id": user_id}
    )

    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(profile)


@router.get("/{user_id}/details")
async def get_user_details(user_id: str):
    profile = await db.fetch_one(
        """
        SELECT
            profile_id,
            user_id,
            display_name,
            age,
            gender,
            level,
            injury_report,
            injury_details
        FROM user_profiles
        WHERE user_id = :user_id
        """,
        {"user_id": user_id}
    )

    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")

    workout_rows = await db.fetch_all(
        """
        SELECT
            log_id,
            user_id,
            exercise_id,
            exercise_name,
            session_id,
            logged_at,
            set_number,
            weight_use,
            weight_unit,
            weight_value,
            rep_count
        FROM workout_sessions_log
        WHERE user_id = :user_id
        ORDER BY logged_at, session_id, set_number
        """,
        {"user_id": user_id}
    )

    return {
        "user_profile": dict(profile),
        "workout_sessions": [dict(row) for row in workout_rows]
    }
