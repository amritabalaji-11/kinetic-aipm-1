import os
import asyncio
import sqlite3
from io import BytesIO
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
from utils.gcs import client as gcs_client, BUCKET_NAME
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

# Local staging dir — same dir the old GCS-download path used, so
# the pipeline's existing cleanup (shutil.rmtree on "incoming/") still works.
LOCAL_VIDEO_DIR = "mediapipe_code/videos/incoming"


# =========================================================
# GCS BACKGROUND UPLOAD
# =========================================================

async def _gcs_upload_background(
    analysis_id: str,
    file_bytes: bytes,
    content_type: str,
    gcs_path: str,
):
    """
    Upload the video to GCS after the pipeline has already started.
    Runs entirely from in-memory bytes so there is no race with the
    pipeline's local-file cleanup.
    Updates video_url in the DB once the upload succeeds.
    Failures are logged but never fatal — the analysis results are unaffected.
    """
    try:
        bucket = gcs_client.bucket(BUCKET_NAME)
        blob   = bucket.blob(gcs_path)

        # GCS SDK is synchronous — run in a thread so we don't block the loop.
        await asyncio.to_thread(
            blob.upload_from_file,
            BytesIO(file_bytes),
            content_type=content_type,
            timeout=300,
        )

        gcs_url = f"gs://{BUCKET_NAME}/{gcs_path}"

        await db.execute(
            "UPDATE form_analyses SET video_url = :url WHERE analysis_id = :aid",
            {"url": gcs_url, "aid": analysis_id},
        )

        print(f"[GCS] Background upload complete → {gcs_url}")

    except Exception as e:
        print(f"[GCS] Background upload failed (non-fatal): {e}")


# =========================================================
# UPLOAD ROUTE
# =========================================================

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    exercise: str = Form(None),
    exercise_name: str = Form(None),
    weight: float = Form(None),
    weight_value: float = Form(None),
    weight_unit: str = Form("lbs"),
    user_id: str = Form(...),
    session_id: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
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
    # READ BYTES ONCE — used for both local save and GCS upload
    # =========================================================

    file_bytes = await file.read()

    # =========================================================
    # ANALYSIS ID + WEIGHT NORMALISATION
    # =========================================================

    analysis_id          = str(uuid4())
    weight_kg_normalised = weight_value

    if weight_unit.lower() == "lb":
        weight_kg_normalised = round(weight_value * 0.453592, 2)

    # =========================================================
    # SAVE LOCALLY — pipeline starts from local disk, no GCS wait
    # =========================================================

    local_dir  = os.path.join(LOCAL_VIDEO_DIR, analysis_id)
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, file.filename)

    with open(local_path, "wb") as f:
        f.write(file_bytes)

    print(f"[UPLOAD] Saved locally → {local_path}")

    # GCS path for archival (upload happens in background)
    gcs_path = f"videos/{user_id}/{analysis_id}/{file.filename}"

    # =========================================================
    # INSERT DB RECORD
    # local_path is the initial video_url; background task
    # updates it to gs:// once the GCS upload finishes.
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
                "analysis_id":  analysis_id,
                "session_id":   session_id,
                "user_id":      user_id,
                "exercise_name": exercise_name,
                "weight_value": weight_value,
                "weight_unit":  weight_unit,
                "weight_kg":    weight_kg_normalised,
                "video_url":    local_path,
                "filename":     file.filename,
                "size_mb":      round(file_size / (1024 * 1024), 2),
                "created_at":   datetime.utcnow().isoformat()
            }
        )

    except sqlite3.IntegrityError as e:
        if "session_id" in str(e):
            raise HTTPException(
                status_code=409,
                detail={"error": "SESSION_ALREADY_EXISTS"}
            )
        raise HTTPException(
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
            detail={"error": str(e)}
        )

    # =========================================================
    # BACKGROUND TASKS
    # FastAPI runs these sequentially after the response is sent.
    # Pipeline runs first (user gets results via SSE), then GCS
    # archives the video from in-memory bytes.
    # =========================================================

    print(f"[UPLOAD] Starting background pipeline for analysis_id={analysis_id}")

    background_tasks.add_task(run_pipeline, analysis_id, local_path)
    background_tasks.add_task(
        _gcs_upload_background,
        analysis_id,
        file_bytes,
        file.content_type,
        gcs_path,
    )

    print(f"[UPLOAD] Background tasks registered for analysis_id={analysis_id}")

    # =========================================================
    # FAST RESPONSE
    # =========================================================

    return {
        "analysis_id": analysis_id
    }