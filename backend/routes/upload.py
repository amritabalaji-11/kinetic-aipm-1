from uuid import uuid4
from datetime import datetime
import sqlite3

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
    exercise_name: str = Form(...),
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
                exercise_name,
                weight_value,
                weight_unit,
                weight_kg,
                video_url,
                filename,
                size_mb,
                status,
                created_at
            )
            VALUES (
                :analysis_id,
                :session_id,
                :user_id,
                :exercise_name,
                :weight_value,
                :weight_unit,
                :weight_kg,
                :video_url,
                :filename,
                :size_mb,
                'uploaded',
                :created_at
            )
            """,
            {
                "analysis_id": analysis_id,
                "session_id": session_id,
                "user_id": user_id,
                "exercise_name": exercise_name,
                "weight_value": weight_value,
                "weight_unit": weight_unit,
                "weight_kg": weight_kg_normalised,
                "video_url": video_url,
                "filename": file.filename,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
    except sqlite3.IntegrityError as e:
        if "session_id" in str(e):
            raise HTTPException(
                status_code=409,
                detail={"error": "SESSION_ALREADY_EXISTS"}
                )
        raise  HTTPException(
        status_code=500,
        detail={"error": "DATABASE_INTEGRITY_ERROR"}
    )

    except Exception as e:

        import traceback

        print("====================================")
        print("DATABASE ERROR")
        print(str(e))
        traceback.print_exc()
        print("====================================")

        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e)
            }
        )

    # =========================================================
    # ASYNC PIPELINE
    # =========================================================

    print(f"[UPLOAD] Starting background pipeline for analysis_id={analysis_id}")

    background_tasks.add_task(
        run_pipeline,
        analysis_id,
        video_url
    )

    print(f"[UPLOAD] Background task added for analysis_id={analysis_id}")

    # =========================================================
    # FAST RESPONSE
    # =========================================================

    return {
        "analysis_id": analysis_id
    }