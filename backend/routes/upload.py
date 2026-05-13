from fastapi import APIRouter, UploadFile, File, Form
from uuid import uuid4

from utils.gcs import upload_file_to_gcs
from db.database import db

import asyncio
from services.analysis_pipeline import run_analysis

router = APIRouter()

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    exercise: str = Form(...),
    weight: float = Form(...)
):

    analysis_id = str(uuid4())

    gcs_path = f"videos/{analysis_id}/{file.filename}"

    await upload_file_to_gcs(file, gcs_path)

    await db.execute(
        """
        INSERT INTO form_sessions
            (
                session_id,
                user_id,
                exercise_name,
                weight_used,
                status,
                video_gcs_path
            )
        VALUES
            (
                :id,
                :uid,
                :exercise,
                :weight,
                'processing',
                :path
            )
        """,
        {
            "id": analysis_id,
            "uid": "stub_user",
            "exercise": exercise,
            "weight": weight,
            "path": gcs_path
        }
    )

    asyncio.create_task(run_analysis(analysis_id, gcs_path))

    return {
        "analysis_id": analysis_id
    }