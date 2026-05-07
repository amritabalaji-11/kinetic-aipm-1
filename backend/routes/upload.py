import uuid
from fastapi import APIRouter, File, UploadFile, BackgroundTasks
from utils.gcs import upload_file_to_gcs
from utils.config import GCS_BUCKET_NAME
from services.analysis_pipeline import run_analysis

router = APIRouter()

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    analysis_id = str(uuid.uuid4())

    file_bytes = await file.read()

    gcs_path = upload_file_to_gcs(
        file_bytes=file_bytes,
        filename=file.filename,
        bucket_name=GCS_BUCKET_NAME
    )

    background_tasks.add_task(run_analysis, analysis_id, gcs_path)

    return {
        "status": "uploaded",
        "analysis_id": analysis_id,
        "file_path": gcs_path
    }