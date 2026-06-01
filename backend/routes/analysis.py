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
        "analysis": analysis,
        "haiku_call_1": haiku_call_1,
        "haiku_call_2": haiku_call_2,
    }