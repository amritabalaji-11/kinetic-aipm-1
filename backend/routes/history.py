import json
from fastapi import APIRouter, HTTPException
from db.database import db

router = APIRouter()



@router.get("/history/{user_id}")
async def get_history(user_id: str):
    try:
        async with db.connection() as conn:

            rows = await db.fetch_all(

                """
                SELECT 
                    a.session_id, a.user_id, a.weight_value, a.weight_unit, a.video_url, 
                    a.status, a.quality_gate_status, a.video_score, a.created_at,
                    r.analysis_id, r.overall_score, r.rep_count
                FROM form_analyses a
                LEFT JOIN form_analysis_results r ON a.analysis_id = r.analysis_id
                WHERE a.user_id = ? AND a.status = 'completed'
                ORDER BY a.created_at DESC
                """,
                user_id
            )
            return [dict(row) for row in rows]
    except Exception as e:
        return {"error": f"Failed to fetch history: {str(e)}"}
