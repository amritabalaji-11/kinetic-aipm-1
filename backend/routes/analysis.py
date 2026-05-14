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