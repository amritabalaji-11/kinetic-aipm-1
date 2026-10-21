import json
from fastapi import APIRouter, Depends, HTTPException
from db.database import db
from utils.security import get_current_user_id, require_same_user

router = APIRouter()



@router.get("/history/{user_id}")
async def get_history(user_id: str, current_user: str = Depends(get_current_user_id)):
    require_same_user(user_id, current_user)
    try:
        rows = await db.fetch_all(
            """
            SELECT
                a.session_id, a.user_id, a.weight_value, a.weight_unit, a.video_url,
                a.status, a.quality_gate_status, a.video_score, a.created_at,
                r.analysis_id, r.overall_form_score, r.rep_count
            FROM form_analyses a
            LEFT JOIN form_analysis_results r ON a.analysis_id = r.analysis_id
            WHERE a.user_id = :user_id AND a.status = 'completed'
            ORDER BY a.created_at DESC
            """,
            {"user_id": user_id},
        )
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"[history] failed for {user_id}: {e}")  # details stay in the server log, not in the response
        raise HTTPException(status_code=500, detail="Could not load your history")
