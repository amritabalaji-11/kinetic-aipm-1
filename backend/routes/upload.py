from uuid import uuid4
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks
)

from db.database import db
from services.pipeline_stream import run_pipeline
import os
import json

import aiofiles

router = APIRouter()

# Backend root (parent of `routes/`)
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _uploads_dir() -> str:
    """Always under backend/ — do not use os.getcwd() (breaks when uvicorn cwd ≠ backend)."""
    return os.path.join(_BACKEND_ROOT, "uploads")

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
    # SAVE VIDEO LOCALLY (fast HTTP response — pipeline reads this path)
    # =========================================================
    # Awaiting a full GCS upload before returning keeps the browser on "Uploading…"
    # for the entire file transfer. Staging to disk returns analysis_id quickly so
    # the client can open SSE while MediaPipe runs in the background task.

    raw_name = (file.filename or "video").strip()
    safe_name = Path(raw_name).name if raw_name else "video.mp4"
    if safe_name in (".", "..", ""):
        safe_name = "video.mp4"
    ext = Path(safe_name).suffix.lower()
    if ext not in (".mp4", ".mov", ".webm", ".avi"):
        ext = ".mp4"

    incoming_dir = os.path.join(
        _BACKEND_ROOT,
        "uploads",
        "incoming",
        analysis_id,
    )
    os.makedirs(incoming_dir, exist_ok=True)

    local_video_path = os.path.join(incoming_dir, f"input{ext}")

    try:
        # Larger chunks + async disk writes: sync open().write() blocks the event loop and can
        # throttle TCP receive (upload looks "stuck" on big files).
        chunk_size = 4 * 1024 * 1024
        written = 0
        last_log_at = 0
        async with aiofiles.open(local_video_path, "wb") as out:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                await out.write(chunk)
                written += len(chunk)
                if written - last_log_at >= 10 * 1024 * 1024:
                    last_log_at = written
                    print(
                        f"[UPLOAD] analysis_id={analysis_id} "
                        f"saved {written / (1024 * 1024):.1f} MB to disk (still receiving from client)…"
                    )

        print(
            f"[UPLOAD] analysis_id={analysis_id} "
            f"local save complete, {written / (1024 * 1024):.1f} MB"
        )

        video_url = os.path.abspath(local_video_path)

    except Exception as e:
        print("LOCAL SAVE ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail={"error": "VIDEO_SAVE_FAILED", "message": str(e)},
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


@router.get("/result")
async def get_result(analysis_id: str):
    result_path = os.path.join(_uploads_dir(), f"{analysis_id}.json")
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail={"error": "RESULT_NOT_FOUND"})

    try:
        with open(result_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})