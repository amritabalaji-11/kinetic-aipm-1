from fastapi import APIRouter, Depends, HTTPException
from db.database import db
from utils.security import get_current_user_id, require_same_user

router = APIRouter(prefix="/users")


@router.get("/")
async def list_users(current_user: str = Depends(get_current_user_id)):
    """Only the signed-in user's own profile (this used to list everyone)."""
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
        WHERE user_id = :uid
        ORDER BY display_name
        """,
        {"uid": current_user},
    )
    return [dict(row) for row in rows]


@router.get("/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: str = Depends(get_current_user_id)):
    require_same_user(user_id, current_user)
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
async def get_user_details(user_id: str, current_user: str = Depends(get_current_user_id)):
    require_same_user(user_id, current_user)
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
