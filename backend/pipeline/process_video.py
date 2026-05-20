# backend/pipeline/process_video.py
#
# This is the main video analysis pipeline.
# It runs in the background after a user uploads a video.
# Flow:
#   1. Acknowledge the upload
#   2. Download the video from GCS (if needed)
#   3. Run MediaPipe — this checks quality gate AND calculates biomechanics
#   4. If the video fails quality gate → send error SSE, stop
#   5. If computation crashes → send error SSE, stop
#   6. If everything is fine → store results, send remaining pipeline events

import asyncio
import os
import json
import shutil
from concurrent.futures import ThreadPoolExecutor

from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager
from mediapipe_code.llm_run_code import run_llm



# =========================================================
# CONFIG
# =========================================================

framework = LandmarkQualityFramework(
    model_path="mediapipe_code/model/pose_landmarker_heavy.task"
)

# We run MediaPipe in a thread pool because it's CPU-heavy.
# Running it directly in async would freeze the whole server.
_executor = ThreadPoolExecutor(max_workers=2)

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")


# =========================================================
# GCS DOWNLOAD
# =========================================================

def _download_from_gcs(gcs_path: str, session_id: str) -> str:
    """
    Downloads a video from Google Cloud Storage into a local temp folder.
    Returns the local file path.
    """
    # Load credentials the same way gcs.py does for uploads —
    # directly from the service account JSON file so it works locally too.
    from google.cloud import storage
    from google.oauth2 import service_account

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    credentials_path = os.path.join(
        base_dir, "credentials", "kinetic-backend-495415-8cc8d53e4cd0.json"
    )
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path
    )
    storage_client = storage.Client(
        credentials=credentials,
        project=credentials.project_id
    )

    # Strip the gs:// prefix so we can split into bucket + blob path
    path = gcs_path.replace("gs://", "")
    bucket_name, blob_path = path.split("/", 1)

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    # Each session gets its own subfolder so parallel uploads don't clash
    temp_dir = os.path.join("./mediapipe_code/videos/incoming", session_id)
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
    Full async pipeline.

    Sends SSE events at each stage so the frontend loading screen updates in real time.
    On failure, sends an error SSE event with the correct error_code and retryable value.
    """
    loop = asyncio.get_event_loop()
    local_path = None

    try:
        # -------------------------------------------------
        # STEP 0 — tell the frontend the upload arrived
        # -------------------------------------------------
        await sse_manager.send_event(session_id, "upload_received", 10)

        # -------------------------------------------------
        # STEP 1 — get the video onto local disk
        # -------------------------------------------------
        if file_location.startswith("gs://"):
            # Video is in Google Cloud Storage — download it first
            local_path = _download_from_gcs(file_location, session_id)
        else:
            # Video is already on local disk (local dev / stub)
            local_path = file_location

        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Video not found: {local_path}")

        # -------------------------------------------------
        # STEP 2 — kick off MediaPipe analysis
        # -------------------------------------------------
        await sse_manager.send_event(session_id, "mediapipe_started", 20)

        # run_in_executor moves the CPU-heavy MediaPipe work into a thread
        # so the async event loop stays responsive for other requests
        mp_result,quality_result, collage_b64 = await loop.run_in_executor(
            _executor,
            framework.process_video_once,
            local_path,
            "Goblet Squat",
            20.0,
          # removed session_id --> see process_video_once()  
        )

        # -------------------------------------------------
        # STEP 3 — check what came back
        # -------------------------------------------------

        # MediaPipe / quality gate failed
        if mp_result is None:

            error_code = quality_result.get(
                "error_code",
                "QUALITY_GATE_FAILED"
            )

            error_stage = quality_result.get(
             "error_stage",
             "quality_gate"
            )

            message = quality_result.get(
            "message",
            "Your movement could not be analyzed."
            )

            retryable_raw = quality_result.get("retryable", False)
            retryable_str = "true" if retryable_raw else "false"

            await _store_failed(
                session_id,
                error_code,
                quality_result
            )

            await sse_manager.send_error_event(
                analysis_id=session_id,
                error_code=error_code,
                error_stage=error_stage,
                retryable=retryable_str,
                message=message,
                landmark_medians=quality_result.get("landmark_medians"),
            )

            return

        # -------------------------------------------------
        # STEP 4 — quality gate passed, send success event
        # -------------------------------------------------
        rep_count = mp_result["session"]["rep_count"]

        await sse_manager.send_event(
            session_id,
            "mediapipe_complete",
            50,
            status="success"
        )

        # -------------------------------------------------
        # STEP 5 — store biomechanics data in DB
        # -------------------------------------------------
        await _store_biomechanics(session_id, mp_result)

        # -------------------------------------------------
        # STEP 6 — clean up the temp video file
        # -------------------------------------------------
        if local_path and "incoming" in local_path:
            shutil.rmtree(
                os.path.dirname(local_path),
                ignore_errors=True
            )

        # -------------------------------------------------
        # STEP 7 — run Claude Haiku coaching analysis
        # -------------------------------------------------
        if collage_b64 is None:
            await _store_failed(session_id, "COLLAGE_BUILD_ERROR", None)
            await sse_manager.send_error_event(
                analysis_id=session_id,
                error_code="COLLAGE_BUILD_ERROR",
                error_stage="coaching",
                retryable="true",
                message="Something went wrong generating your analysis. Try re-uploading.",
            )
            return

        await sse_manager.send_event(session_id, "claude_started", 60)

        try:
            llm_result, latency, _ = await loop.run_in_executor(
                _executor,
                run_llm,
                mp_result,
                collage_b64,
            )
        except Exception as e:
            print(f"[pipeline] Claude Haiku failed: {e}")
            await _store_failed(session_id, "COACHING_ERROR", str(e))
            await sse_manager.send_error_event(
                analysis_id=session_id,
                error_code="COACHING_ERROR",
                error_stage="coaching",
                retryable="true",
                message="Something went wrong generating your coaching feedback. Try re-uploading.",
            )
            return

        await sse_manager.send_event(session_id, "claude_complete", 90)
        await _store_llm_result(session_id, llm_result)

        # -------------------------------------------------
        # STEP 8 — done
        # -------------------------------------------------
        await sse_manager.send_event(
            session_id,
            "analysis_complete",
            100,
            status="complete"
        )

        print(f"[pipeline] Completed session={session_id}, reps={rep_count}, haiku_latency={latency:.0f}ms")
        return {**mp_result, "llm": llm_result}
    except FileNotFoundError as e:
        # The video file didn't exist on disk — infra issue, not the user's fault
        print(f"[pipeline] File not found: {e}")
        await _store_failed(session_id, "SYSTEM_ERROR", str(e))
        await sse_manager.send_error_event(
            analysis_id=session_id,
            error_code="SYSTEM_ERROR",
            error_stage="biomechanics",
            retryable="true",           # same video should work once file issue is fixed
            message="Something went wrong on our end. Your video is saved — try again in a moment.",
        )

    except Exception as e:
        # Catch-all — the computation itself crashed (e.g. corrupt video, unexpected input)
        # This is BIOMECHANICS_COMPUTE_ERROR: retryable "true" because same video might work
        print(f"[pipeline] Unexpected error: {e}")
        await _store_failed(session_id, "BIOMECHANICS_COMPUTE_ERROR", str(e))
        await sse_manager.send_error_event(
            analysis_id=session_id,
            error_code="BIOMECHANICS_COMPUTE_ERROR",
            error_stage="biomechanics",
            retryable="true",           # script crashed — same video may succeed on retry
            message="Something went wrong reading your movement data. Try re-uploading.",
        )


# =========================================================
# DB HELPERS
# =========================================================

async def _store_biomechanics(session_id: str, data: dict):
    """Saves successful biomechanics results to the database."""
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
    """Marks the analysis as failed in the database with the error reason."""
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
            "err": json.dumps({"reason": reason, "detail": str(detail) if detail else None}),
        },
    )

async def _store_llm_result(session_id: str, llm_result: dict):
    """Saves Claude Haiku coaching output to the database."""
    from db.database import db

    await db.execute(
        """
        UPDATE form_analyses
        SET llm_json    = :llm,
            total_score = :score
        WHERE session_id = :sid
        """,
        values={
            "sid":   session_id,
            "llm":   json.dumps(llm_result),
            "score": llm_result.get("total_score"),
        },
    )