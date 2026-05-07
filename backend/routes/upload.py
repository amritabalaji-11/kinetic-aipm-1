from fastapi import APIRouter, UploadFile, File, Form
from uuid import uuid4

from utils.gcs import upload_file_to_gcs
from db.database import db

router = APIRouter()


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    exercise: str = Form(...),
    weight: float = Form(...)
):

    # Generate unique analysis ID
    analysis_id = str(uuid4())

    # GCS path required by spec
    gcs_path = f"videos/{analysis_id}/{file.filename}"

    # Upload to Google Cloud Storage
    await upload_file_to_gcs(file, gcs_path)

    # Insert session into database
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

    # STRICT response contract
    return {
        "analysis_id": analysis_id
    }