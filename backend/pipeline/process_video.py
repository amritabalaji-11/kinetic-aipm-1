import asyncio
import json
import os
import tempfile

from mediapipe_code.landmark_framework import LandmarkQualityFramework
from services.mediapipe_to_frontend import map_pipeline_output
from utils.gcs import BUCKET_NAME, client as storage_client
from utils.sse_manager import sse_manager

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(
    BACKEND_ROOT,
    "mediapipe_code",
    "model",
    "pose_landmarker_full.task",
)


async def run_analysis(
    analysis_id: str,
    video_url: str,
    *,
    session_id: str,
    user_id: str,
    exercise_id: str,
    weight_value: float,
    weight_unit: str,
    weight_kg_normalised: float,
) -> dict:
    """
    Download video from GCS, run MediaPipe pose pipeline, map output for the frontend,
    persist JSON under uploads/, emit SSE, and return the frontend payload (never raises).
    """

    local_video_path = None

    async def _persist(frontend: dict) -> None:
        uploads_dir = os.path.join(BACKEND_ROOT, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        result_path = os.path.join(uploads_dir, f"{analysis_id}.json")
        with open(result_path, "w", encoding="utf-8") as fh:
            json.dump(frontend, fh, ensure_ascii=False, indent=2)

    try:
        await sse_manager.send_event(
            analysis_id,
            "download_started",
            10,
            "processing",
        )

        local_video_path = await resolve_video_input(video_url)

        await sse_manager.send_event(
            analysis_id,
            "mediapipe_started",
            30,
            "processing",
        )

        exercise_label = exercise_id.replace("-", " ")

        def _run_mediapipe():
            framework = LandmarkQualityFramework(MODEL_PATH)
            return framework.process_video_once(
                local_video_path,
                exercise_label,
                float(weight_kg_normalised),
                save_video=False,
            )

        raw_result = await asyncio.to_thread(_run_mediapipe)

        await sse_manager.send_event(
            analysis_id,
            "mediapipe_completed",
            85,
            "processing",
        )

        frontend = map_pipeline_output(
            analysis_id=analysis_id,
            session_id=session_id,
            user_id=user_id,
            exercise_id=exercise_id,
            weight_value=weight_value,
            weight_unit=weight_unit,
            raw=raw_result if isinstance(raw_result, dict) else {},
        )

        await _persist(frontend)

        sse_status = "complete" if frontend.get("status") == "complete" else "failed"
        await sse_manager.send_event(
            analysis_id,
            "analysis_complete",
            100,
            status=sse_status,
            result=frontend,
        )

        return frontend

    except Exception as e:
        print("PIPELINE FAILURE:")
        print(str(e))

        err_frontend = map_pipeline_output(
            analysis_id=analysis_id,
            session_id=session_id,
            user_id=user_id,
            exercise_id=exercise_id,
            weight_value=weight_value,
            weight_unit=weight_unit,
            raw={
                "event": "error",
                "error_stage": "pipeline_exception",
                "error_code": "pipeline_exception",
                "message": "Processing failed on the server.",
                "detail": str(e),
            },
        )

        await _persist(err_frontend)

        await sse_manager.send_event(
            analysis_id,
            "analysis_complete",
            100,
            status="failed",
            result=err_frontend,
        )

        return err_frontend

    finally:
        if not local_video_path:
            return
        try:
            norm = os.path.normpath(local_video_path)
            if os.path.isfile(norm):
                os.remove(norm)
            parent = os.path.dirname(norm)
            if os.path.isdir(parent):
                try:
                    if not os.listdir(parent):
                        os.rmdir(parent)
                except OSError:
                    pass
        except OSError:
            pass


async def resolve_video_input(video_url: str) -> str:
    """Return a readable filesystem path for the pipeline (local file or GCS download)."""
    if (video_url or "").startswith("gs://"):
        return await download_video_from_gcs(video_url)
    path = os.path.normpath(video_url)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Video file not found: {path}")
    return path


async def download_video_from_gcs(gcs_url: str) -> str:
    """Download a GCS object to a temp file; return local path."""

    prefix = f"gs://{BUCKET_NAME}/"
    if not gcs_url.startswith(prefix):
        raise ValueError(f"Unexpected video URL (expected {prefix}): {gcs_url}")

    blob_path = gcs_url.replace(prefix, "", 1)

    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(blob_path)

    temp_dir = tempfile.mkdtemp(prefix="video_dl_")
    filename = os.path.basename(blob_path) or "upload.mp4"
    local_path = os.path.join(temp_dir, filename)

    await asyncio.to_thread(blob.download_to_filename, local_path)

    print(f"DOWNLOADED VIDEO → {local_path}")

    return local_path
