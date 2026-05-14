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

# 500MB
MAX_FILE_SIZE = 500 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "application/octet-stream"
}


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

    # =========================================================
    # MIME TYPE VALIDATION
    # =========================================================

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail={"error": "UNSUPPORTED_MEDIA_TYPE"}
        )

    # =========================================================
    # FILE SIZE VALIDATION
    # =========================================================

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={"error": "FILE_TOO_LARGE"}
        )

    # =========================================================
    # ANALYSIS ID
    # =========================================================

    analysis_id = str(uuid4())

    # =========================================================
    # NORMALIZE KG
    # =========================================================

    weight_kg_normalised = weight_value

    if weight_unit.lower() == "lb":
        weight_kg_normalised = round(weight_value * 0.453592, 2)

    # =========================================================
    # GCS PATH
    # =========================================================

    gcs_path = (
        f"videos/{user_id}/{analysis_id}/{file.filename}"
    )

    # =========================================================
    # GCS UPLOAD
    # =========================================================

    try:
        video_url = await upload_file_to_gcs(
            file,
            gcs_path
        )

    except Exception as e:
        print("GCS ERROR:", str(e))

        raise HTTPException(
            status_code=503,
            detail={"error": "PIPELINE_UNAVAILABLE"}
        )

    # =========================================================
    # INSERT DB RECORD
    # =========================================================

    try:
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

    except Exception as e:
        print("DB ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail={"error": "DATABASE_INSERT_FAILED"}
        )

    # =========================================================
    # ASYNC PIPELINE
    # =========================================================

    background_tasks.add_task(
        run_pipeline,
        analysis_id,
        video_url
    )

    # =========================================================
    # FAST RESPONSE
    # =========================================================

    return {
        "analysis_id": analysis_id
    }