from uuid import uuid4
from datetime import datetime

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks
)

from db.database import db
from utils.gcs import upload_file_to_gcs
from services.pipeline_stream import run_pipeline

router = APIRouter()

MAX_FILE_SIZE = 500 * 1024 * 1024


@router.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    exercise_id: str = Form(...),
    weight_value: float = Form(...),
    weight_unit: str = Form(...),
    user_id: str = Form(...),
    session_id: str = Form(...)
):

    # DEBUG MIME TYPE
    print("CONTENT TYPE:", file.content_type)

    # MIME TYPE VALIDATION
    if not (
        file.content_type.startswith("video/")
        or file.content_type == "application/octet-stream"
    ):
        raise HTTPException(
            status_code=415,
            detail={"error": "UNSUPPORTED_MEDIA_TYPE"}
        )
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={"error": "FILE_TOO_LARGE"}
        )

    analysis_id = str(uuid4())

    weight_kg_normalised = weight_value

    if weight_unit.lower() == "lb":
        weight_kg_normalised = round(weight_value * 0.453592, 2)

    gcs_path = (
        f"videos/{user_id}/{analysis_id}/{file.filename}"
    )

    try:

        video_url = await upload_file_to_gcs(
            file,
            gcs_path
        )

    except Exception:
        raise HTTPException(
            status_code=503,
            detail={"error": "GCS_UNAVAILABLE"}
        )

    await db.execute(
        """
        INSERT INTO form_analyses (
            analysis_id,
            session_id,
            user_id,
            exercise_id,
            weight_value,
            weight_unit,
            weight_kg_normalised,
            video_url,
            status,
            created_at
        )
        VALUES (
            :analysis_id,
            :session_id,
            :user_id,
            :exercise_id,
            :weight_value,
            :weight_unit,
            :weight_kg_normalised,
            :video_url,
            'uploaded',
            :created_at
        )
        """,
        {
            "analysis_id": analysis_id,
            "session_id": session_id,
            "user_id": user_id,
            "exercise_id": exercise_id,
            "weight_value": weight_value,
            "weight_unit": weight_unit,
            "weight_kg_normalised": weight_kg_normalised,
            "video_url": video_url,
            "created_at": datetime.utcnow().isoformat()
        }
    )

    background_tasks.add_task(
        run_pipeline,
        analysis_id,
        video_url
    )

    return {
        "analysis_id": analysis_id
    }