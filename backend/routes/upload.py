import re
from uuid import uuid4
from datetime import datetime

from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from fastapi import (
    Request,
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks
)

from db.database import db, INTEGRITY_ERRORS
from utils.security import limit_guest, require_same_user
from utils.gcs import upload_file_to_gcs, create_resumable_upload_url, uploaded_size, GS_PREFIX
from utils.security import get_current_user_id
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
    file: UploadFile = File(...),
    exercise: str = Form(None),
    exercise_name: str = Form(None),
    weight: float = Form(None),
    weight_value: float = Form(None),
    weight_unit: str = Form("lbs"),
    #user_id: str = Form("00000000-0000-0000-0000-000000000000"),
    user_id: str = Form(...),
    session_id: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: str = Depends(limit_guest("video uploads", 3)),  # demo accounts: 3 a day (each one costs money)
  #  background_tasks: BackgroundTasks,
  #  file: UploadFile = File(...),
  #  exercise_name: str = Form(...),
  #  weight_value: float = Form(...),
  #  weight_unit: str = Form(...),
  #  user_id: str = Form(...),
  #  session_id: str = Form(...)
):

    # you can only upload for your own account
    require_same_user(user_id, current_user)

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
    session_id = session_id or analysis_id  # the session id is the table's key, so it can never be empty

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
        
    except INTEGRITY_ERRORS as e:
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

# =========================================================
# DIRECT-TO-STORAGE UPLOAD (for big phone videos)
# =========================================================
# 1. POST /upload/start    -> an analysis id and an address to send the file to
# 2. the browser sends the file to that address, in pieces
# 3. POST /upload/complete -> checks the file arrived, then starts the analysis

class StartUploadIn(BaseModel):
    user_id: str
    filename: str
    content_type: str
    size_bytes: int
    exercise_name: str | None = None
    weight_value: float = 0
    weight_unit: str = "kg"
    session_id: str | None = None


class CompleteUploadIn(BaseModel):
    analysis_id: str


def _safe_filename(name: str) -> str:
    """Keep the file name readable but harmless inside a storage path."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name.split("/")[-1].split("\\")[-1]).strip("._")
    return (cleaned or "video.mp4")[-80:]


@router.post("/upload/start")
async def start_upload(
    body: StartUploadIn,
    request: Request,
    current_user: str = Depends(limit_guest("video uploads", 3)),  # same daily limit for demo accounts as /upload
):
    require_same_user(body.user_id, current_user)

    if body.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail={"error": "UNSUPPORTED_MEDIA_TYPE"})
    if body.size_bytes <= 0 or body.size_bytes > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail={"error": "FILE_TOO_LARGE"})

    analysis_id = str(uuid4())
    session_id = body.session_id or analysis_id
    weight_kg = body.weight_value
    if body.weight_unit.lower() == "lb":
        weight_kg = round(body.weight_value * 0.453592, 2)

    gcs_path = f"videos/{current_user}/{analysis_id}/{_safe_filename(body.filename)}"
    try:
        upload_url = await run_in_threadpool(
            create_resumable_upload_url, gcs_path, body.content_type, body.size_bytes, request.headers.get("origin"),
        )
    except Exception as e:
        print("GCS ERROR (start upload):", str(e))
        raise HTTPException(status_code=503, detail={"error": "PIPELINE_UNAVAILABLE"})

    try:
        await db.execute(
            """
            INSERT INTO form_analyses (
                analysis_id, session_id, user_id, exercise_name, weight_value, weight_unit, weight_kg,
                video_url, filename, size_mb, status, created_at
            ) VALUES (
                :analysis_id, :session_id, :user_id, :exercise_name, :weight_value, :weight_unit, :weight_kg,
                :video_url, :filename, :size_mb, 'awaiting_upload', :created_at
            )
            """,
            {
                "analysis_id": analysis_id,
                "session_id": session_id,
                "user_id": current_user,
                "exercise_name": body.exercise_name,
                "weight_value": body.weight_value,
                "weight_unit": body.weight_unit,
                "weight_kg": weight_kg,
                "video_url": f"{GS_PREFIX}{gcs_path}",
                "filename": body.filename,
                "size_mb": round(body.size_bytes / (1024 * 1024), 2),
                "created_at": datetime.utcnow().isoformat(),
            },
        )
    except INTEGRITY_ERRORS:
        raise HTTPException(status_code=409, detail={"error": "SESSION_ALREADY_EXISTS"})

    return {"analysis_id": analysis_id, "upload_url": upload_url}


@router.post("/upload/complete")
async def complete_upload(
    body: CompleteUploadIn,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user_id),
):
    row = await db.fetch_one(
        "SELECT user_id, status, video_url FROM form_analyses WHERE analysis_id = :aid",
        {"aid": body.analysis_id},
    )
    # someone else's upload looks exactly like one that does not exist
    if not row or row["user_id"] != current_user:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND"})

    # the app may repeat this call after a dropped connection; the analysis only starts once
    if row["status"] != "awaiting_upload":
        return {"analysis_id": body.analysis_id}

    size = await run_in_threadpool(uploaded_size, row["video_url"])
    if not size:
        raise HTTPException(status_code=409, detail={"error": "UPLOAD_INCOMPLETE"})

    await db.execute(
        "UPDATE form_analyses SET status = 'uploaded' WHERE analysis_id = :aid AND status = 'awaiting_upload'",
        {"aid": body.analysis_id},
    )
    background_tasks.add_task(run_pipeline, body.analysis_id, row["video_url"])
    return {"analysis_id": body.analysis_id}
