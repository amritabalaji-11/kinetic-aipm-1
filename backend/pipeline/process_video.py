import asyncio
import os
import json
import shutil
from concurrent.futures import ThreadPoolExecutor

from google.cloud import storage

from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager


# =========================================================
# CONFIG
# =========================================================

framework = LandmarkQualityFramework(
    model_path="mediapipe_code/model/pose_landmarker_heavy.task"
)

_executor = ThreadPoolExecutor(max_workers=2)

storage_client = storage.Client()
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")


# =========================================================
# GCS DOWNLOAD → LOCAL TEMP STORAGE
# =========================================================

def _download_from_gcs(gcs_path: str, session_id: str) -> str:
    """
    Downloads a GCS video into a session-specific temp folder.
    """

    # Remove gs:// prefix
    path = gcs_path.replace("gs://", "")

    bucket_name, blob_path = path.split("/", 1)

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    temp_dir = os.path.join(
        "./mediapipe_code/videos/incoming",
        session_id
    )
    os.makedirs(temp_dir, exist_ok=True)

    filename = os.path.basename(blob_path)
    local_path = os.path.join(temp_dir, filename)

    blob.download_to_filename(local_path)

    print(f"[GCS] Downloaded → {local_path}")

    return local_path
# =========================================================
# OPTIONAL WRAPPERS (kept for future use)
# =========================================================

def _run_quality_gate(video_path: str) -> dict:
    return framework.get_quality_result(video_path)


def _run_biomechanics(video_path: str, exercise: str, weight_kg: float) -> dict:
    return framework.get_biomechanics_output(
        video_path=video_path,
        exercise=exercise,
        weight_kg=weight_kg,
    )


# =========================================================
# MAIN PIPELINE
# =========================================================

async def run_mediapipe_analysis(session_id: str, file_location: str):
    """
    Full async pipeline:
    - SSE progress
    - GCS download (if needed)
    - MediaPipe execution in thread
    - DB storage
    """

    loop = asyncio.get_event_loop()
    local_path = None

    try:
        # -------------------------------------------------
        # STEP 0 — upload acknowledged
        # -------------------------------------------------
        await sse_manager.send_event(session_id, "upload_received", 10)

        # -------------------------------------------------
        # STEP 1 — resolve file location
        # -------------------------------------------------
        if file_location.startswith("gs://"):
            local_path = _download_from_gcs(file_location, session_id)
        else:
            local_path = file_location

        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Video not found: {local_path}")

        # -------------------------------------------------
        # STEP 2 — MediaPipe start
        # -------------------------------------------------
        await sse_manager.send_event(session_id, "mediapipe_started", 20)

        mp_result = await loop.run_in_executor(
            _executor,
            framework.process_video_once,
            local_path,
            "Goblet Squat",
            20.0,
            session_id
        )

        # -------------------------------------------------
        # STEP 3 — validation
        # -------------------------------------------------
        if not mp_result:
            await sse_manager.send_event(
                session_id,
                "mediapipe_failed",
                20,
                status="error"
            )
            await _store_failed(session_id, "empty_result", mp_result)
            return

        rep_count = mp_result["session"]["rep_count"]

        # -------------------------------------------------
        # STEP 4 — success event
        # -------------------------------------------------
        await sse_manager.send_event(
            session_id,
            "mediapipe_complete",
            50,
            status="success"
        )

        # -------------------------------------------------
        # STEP 5 — store DB
        # -------------------------------------------------
        await _store_biomechanics(session_id, mp_result)

        # -------------------------------------------------
        # STEP 6 — cleanup temp files
        # -------------------------------------------------
        if local_path and "incoming" in local_path:
            shutil.rmtree(
                os.path.dirname(local_path),
                ignore_errors=True
            )

        # -------------------------------------------------
        # STEP 7 — continue pipeline (placeholders)
        # -------------------------------------------------
        await sse_manager.send_event(session_id, "nemotron_started", 60)
        await asyncio.sleep(2)
        await sse_manager.send_event(session_id, "nemotron_complete", 80)

        await sse_manager.send_event(session_id, "rag_started", 85)
        await asyncio.sleep(2)
        await sse_manager.send_event(session_id, "rag_complete", 95)

        await sse_manager.send_event(session_id, "claude_started", 96)
        await asyncio.sleep(1)
        await sse_manager.send_event(session_id, "claude_complete", 100)

        await sse_manager.send_event(
            session_id,
            "analysis_complete",
            100,
            status="complete"
        )

        print(f"[pipeline] Completed session={session_id}, reps={rep_count}")

        return mp_result

    except FileNotFoundError as e:
        print(f"[pipeline] {e}")
        await sse_manager.send_event(session_id, "error", 0, status="error")

    except Exception as e:
        print(f"[pipeline] Unexpected error: {e}")
        await sse_manager.send_event(session_id, "error", 0, status="error")


# =========================================================
# DB HELPERS
# =========================================================

async def _store_biomechanics(session_id: str, data: dict):
    from db.database import db

    await db.execute(
        """
        UPDATE form_analyses
        SET status = 'complete',
            biomechanics_json = :bio,
            rep_count = :reps
        WHERE session_id = :sid
        """,
        values={
            "sid": session_id,
            "bio": json.dumps(data),
            "reps": data["session"]["rep_count"],
        },
    )


async def _store_failed(session_id: str, reason: str, detail=None):
    from db.database import db

    await db.execute(
        """
        UPDATE form_analyses
        SET status = 'failed',
            error_code = :err
        WHERE session_id = :sid
        """,
        values={
            "sid": session_id,
            "err": json.dumps({"reason": reason, "detail": detail}),
        },
    )