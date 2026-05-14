import os
import asyncio
import tempfile

from google.cloud import storage

from mediapipe_code.landmark_framework import process_video_once
from utils.sse_manager import sse_manager

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

storage_client = storage.Client()


async def run_analysis(
    analysis_id: str,
    video_url: str
):
    """
    Full real pipeline:
    1. Download video from GCS
    2. Run MediaPipe
    3. Emit SSE events
    """

    try:

        # =====================================================
        # SSE → download started
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "download_started",
            10,
            "processing"
        )

        # =====================================================
        # DOWNLOAD VIDEO FROM GCS
        # =====================================================

        local_video_path = await download_video_from_gcs(
            analysis_id,
            video_url
        )

        # =====================================================
        # SSE → mediapipe started
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "mediapipe_started",
            30,
            "processing"
        )

        # =====================================================
        # RUN MEDIAPIPE PIPELINE
        # =====================================================

        result = await asyncio.to_thread(
            process_video_once,
            local_video_path
        )

        # =====================================================
        # SSE → mediapipe completed
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "mediapipe_completed",
            80,
            "processing"
        )

        # =====================================================
        # OPTIONAL RESULT SAVE
        # =====================================================

        print("PIPELINE RESULT:")
        print(result)

        # =====================================================
        # CLEANUP TEMP FILE
        # =====================================================

        if os.path.exists(local_video_path):
            os.remove(local_video_path)

        # =====================================================
        # SSE → completed
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "pipeline_completed",
            100,
            "completed"
        )

        return result

    except Exception as e:

        print("PIPELINE FAILURE:")
        print(str(e))

        await sse_manager.send_event(
            analysis_id,
            "pipeline_failed",
            100,
            "failed"
        )

        raise e


async def download_video_from_gcs(
    analysis_id: str,
    gcs_url: str
) -> str:
    """
    Downloads a GCS file locally for MediaPipe processing.
    """

    # =========================================================
    # REMOVE gs://bucket-name/
    # =========================================================

    prefix = f"gs://{BUCKET_NAME}/"

    blob_path = gcs_url.replace(
        prefix,
        ""
    )

    # =========================================================
    # GET GCS OBJECT
    # =========================================================

    bucket = storage_client.bucket(BUCKET_NAME)

    blob = bucket.blob(blob_path)

    # =========================================================
    # CREATE TEMP DIRECTORY
    # =========================================================

    temp_dir = tempfile.mkdtemp(
        prefix=f"{analysis_id}_"
    )

    filename = os.path.basename(blob_path)

    local_path = os.path.join(
        temp_dir,
        filename
    )

    # =========================================================
    # DOWNLOAD FILE
    # =========================================================

    await asyncio.to_thread(
        blob.download_to_filename,
        local_path
    )

    print(f"DOWNLOADED VIDEO → {local_path}")

    return local_path