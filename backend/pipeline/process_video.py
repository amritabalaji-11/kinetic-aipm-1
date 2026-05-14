# process_video.py
import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager

framework = LandmarkQualityFramework(
    model_path="mediapipe_code/model/pose_landmarker_heavy.task"
)

# MediaPipe is CPU-bound and synchronous — needs its own thread pool
_executor = ThreadPoolExecutor(max_workers=2)


def _run_quality_gate(video_path: str) -> dict:
    """Blocking — runs in thread. Returns quality result dict."""
    return framework.get_quality_result(video_path)


def _run_biomechanics(video_path: str, exercise: str, weight_kg: float) -> dict:
    """Blocking — runs in thread. Returns full biomechanics JSON."""
    return framework.get_biomechanics_output(
        video_path=video_path,
        exercise=exercise,
        weight_kg=weight_kg,
    )


def _resolve_local_path(gcs_path: str) -> str:
    """
    Converts a GCS URI to a local path for the ML layer.
    e.g. gs://kinetic_bucket/uploads/abc.mp4 → ./downloads/abc.mp4
    
    Swap this out when you have a real GCS download step.
    """
    filename = gcs_path.split("/")[-1]
    local_dir = "./mediapipe_code/videos/incoming"
    os.makedirs(local_dir, exist_ok=True)
    return os.path.join(local_dir, filename)


async def run_analysis(analysis_id: str, file_location: str):
    """
    Real async pipeline with SSE progress events.
    file_location: GCS URI (gs://...) or local path during dev.
    """
    loop = asyncio.get_event_loop()

    try:
        # ------ Step 0: Upload acknowledged ------
        await sse_manager.send_event(analysis_id, "upload_received", 10)

        # Resolve local path (replace with actual GCS download when ready)
        local_path = (
            file_location
            if not file_location.startswith("gs://")
            else _resolve_local_path(file_location)
        )

        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Video not found at: {local_path}")

        # ------ MediaPipe quality gate (blocking → thread) ------
        await sse_manager.send_event(analysis_id, "mediapipe_started", 20)

        quality_result = await loop.run_in_executor(
            _executor,
            _run_quality_gate,
            local_path,
        )

        # Quality gate failed → abort early
        if quality_result.get("event") not in ["mediapipe_complete", "success"]:
            await sse_manager.send_event(
                analysis_id,
                "mediapipe_failed",
                20,
                status="error",
            )
            await _store_failed(analysis_id, reason="quality_gate_failed", detail=quality_result)
            return

        rep_count = (
             quality_result.get("session", {}).get("rep_count")
             or quality_result.get("rep_count", 0)
            )

        await sse_manager.send_event(
            analysis_id,
            "mediapipe_complete",
            50,
            # extra fields picked up by send_event if you extend its signature,
            # or store in DB here instead (see note below)
        )

        # ------ Biomechanics full pass (blocking → thread) ------
        biomechanics_json = await loop.run_in_executor(
            _executor,
            _run_biomechanics,
            local_path,
            "Goblet Squat",
            20.0,
        )

        # Persist to DB right after ML is done
        await _store_biomechanics(analysis_id, biomechanics_json)

        # ------ Nemotron ------
        await sse_manager.send_event(analysis_id, "nemotron_started", 60)
        # TODO: call your Nemotron service here
        await asyncio.sleep(3)  # placeholder
        await sse_manager.send_event(analysis_id, "nemotron_complete", 80)

        # ------ RAG ------
        await sse_manager.send_event(analysis_id, "rag_started", 85)
        # TODO: call your RAG service here
        await asyncio.sleep(4)  # placeholder
        await sse_manager.send_event(analysis_id, "rag_complete", 95)

        # ------ Claude ------
        await sse_manager.send_event(analysis_id, "claude_started", 96)
        # TODO: call Claude API here
        await asyncio.sleep(2)  # placeholder
        await sse_manager.send_event(analysis_id, "claude_complete", 100)

        # ------ Done ------
        await sse_manager.send_event(
            analysis_id,
            "analysis_complete",
            100,
            status="complete",
        )
        print(f"[pipeline] Analysis {analysis_id} completed. Reps: {rep_count}")

    except FileNotFoundError as e:
        print(f"[pipeline] {e}")
        await sse_manager.send_event(analysis_id, "error", 0, status="error")

    except Exception as e:
        print(f"[pipeline] Unexpected failure for {analysis_id}: {e}")
        await sse_manager.send_event(analysis_id, "error", 0, status="error")


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _store_biomechanics(analysis_id: str, data: dict):
    """
    Persist the full biomechanics JSON to your DB layer.
    Wire this to your actual db object from db/database.py.
    """
    from db.database import db
    import json

    await db.execute(
        """
        UPDATE form_sessions
        SET    status           = 'complete',
               biomechanics_json = :bio,
               rep_count        = :reps
        WHERE  session_id = :sid
        """,
        values={
            "sid": analysis_id,
            "bio": json.dumps(data),
            "reps": data.get("session", {}).get("rep_count", 0),
        },
    )


async def _store_failed(analysis_id: str, reason: str, detail: dict = None):
    from db.database import db
    import json

    await db.execute(
        """
        UPDATE form_sessions
        SET status = 'failed',
            error_detail = :err
        WHERE session_id = :sid
        """,
        values={
            "sid": analysis_id,
            "err": json.dumps({"reason": reason, "detail": detail}),
        },
    )


#async def process_video(gcs_path: str, analysis_id: str) -> dict:

 #   await asyncio.sleep(2)

  #  return {
   #     "status": "success",
    #    "overlay_video_url": f"gs://overlay/{analysis_id}.mp4",
     #   "biomechanics_json": {
      #      "rep_count": 8,
       #     "overall_score": 72
        #}
    #}
