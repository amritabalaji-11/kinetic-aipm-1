import uuid
import os
from fastapi import APIRouter, File, UploadFile, BackgroundTasks
from services.analysis_pipeline import run_analysis

router = APIRouter()

@router.post("/upload")
async def upload_video(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    # Generate a unique ID for the analysis
    analysis_id = str(uuid.uuid4())
    
    # Save the uploaded file to disk (or you can use in-memory storage)
    upload_dir = "uploads"

    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, f"{analysis_id}_{file.filename}")
    with open(file_location, "wb") as f:
        f.write(await file.read())
    
    # Start background processing of the file
    background_tasks.add_task(run_analysis, file_location, analysis_id)
    
    return {"status": "file uploaded successfully", "analysis_id": analysis_id, "message": "Processing started in the background. Use the analysis_id to track progress via SSE."}