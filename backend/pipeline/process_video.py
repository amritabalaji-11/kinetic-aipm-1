# backend/pipeline/process_video.py
#
# Main video analysis pipeline — runs in background after upload.
#
# Event sequence:
#   upload_received → mediapipe_started → mediapipe_complete → biomechanics_complete
#   → haiku_started → analysis_ready  (Tab 1 unlocks)
#   → haiku_call_2_complete OR haiku_call_2_no_history  (Tab 2 unlocks / locks)

import asyncio
import os
import json
import shutil
from concurrent.futures import ThreadPoolExecutor

from services.haiku_call_2_progression import run_haiku_call_2
from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager
from mediapipe_code.llm_run_code import run_llm_analysis
from mediapipe_code.llm_run_code import run_llm_comparison




# =========================================================
# HAIKU CALL 2 — SYSTEM PROMPT
# Longitudinal coaching: current session vs last 5 sessions.
# Output must be valid JSON matching the progression schema.
# =========================================================

HAIKU_CALL_2_SYSTEM = """You are a squat coaching AI performing longitudinal analysis.

Given a user's current session and their previous session history for the same exercise,
return a JSON coaching comparison. Return ONLY valid JSON — no markdown fences, no explanation.

Output this exact schema:
{
  "has_comparison": true,
  "empty_state_message": null,
  "current": {
    "date_label": "May 22",
    "weight_value": 40.0,
    "weight_unit": "kg",
    "overall_form_score": 72,
    "posture_score": 73,
    "stability_score": 75,
    "movement_quality_score": 68,
    "tempo_score": 55,
    "reps": [{"rep_number": 1, "form_score": 81}]
  },
  "previous": { "<same shape as current — most recent previous session, or null>" },
  "comparison_coaching": {
    "summary_paragraph": "<1-2 sentences on today vs last session>",
    "weight_decision": "<hold | good_to_progress | drop_weight>",
    "parameters": {
      "posture":          {"score": 73, "observation_action": "<1 sentence>"},
      "stability":        {"score": 75, "observation_action": "<1 sentence>"},
      "movement_quality": {"score": 68, "observation_action": "<1 sentence>"},
      "tempo":            {"score": 55, "observation_action": "<1 sentence>"}
    }
  },
  "progression_timeline": {
    "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
    "sessions": [{"date_label": "May 22", "weight_kg": 40.0, "overall_score": 72}]
  }
}

Rules:
- has_comparison is false only when previous_sessions is empty; set empty_state_message to
  "Complete a second session to unlock your comparison." in that case.
- previous is the most recent previous session (index 0 of previous_sessions), or null.
- comparison_coaching is null when has_comparison is false.
- weight_decision: "hold" if score < 75 or trending down; "good_to_progress" if score >= 80
  and stable/improving; "drop_weight" if score dropped significantly (>= 8 points).
- All scores are integers 0–100. date_label format: "Mon DD" e.g. "May 22".
- progression_timeline.sessions lists all sessions newest-first (include current as index 0).
"""
from services.haiku_call_1_integration import HaikuCall1


# =========================================================
# MODULE-LEVEL SINGLETONS
# =========================================================

# Cached system prompt — loaded once at startup, reused for every request
_haiku_call_1 = HaikuCall1(exercise="goblet_squat")

# MediaPipe framework
framework = LandmarkQualityFramework(
    model_path="mediapipe_code/model/pose_landmarker_heavy.task"
)

# Thread pool for CPU-heavy work (MediaPipe, sync Haiku client)
# so the async event loop stays responsive for other requests
_executor = ThreadPoolExecutor(max_workers=2)

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")


# =========================================================
# GCS DOWNLOAD
# =========================================================

def _download_from_gcs(gcs_path: str, session_id: str) -> str:
    """Download a video from GCS into a local temp folder. Returns local path."""
    from google.cloud import storage
    from google.oauth2 import service_account

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    credentials_path = os.path.join(
        base_dir, "credentials", "kinetic-backend-495415-8cc8d53e4cd0.json"
    )
    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    storage_client = storage.Client(credentials=credentials, project=credentials.project_id)

    path = gcs_path.replace("gs://", "")
    bucket_name, blob_path = path.split("/", 1)

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    # Each session gets its own subfolder so parallel uploads don't clash
    temp_dir = os.path.join(".\\backend\\mediapipe_code\\videos\\incoming", session_id)
    os.makedirs(temp_dir, exist_ok=True)

    filename = os.path.basename(blob_path)
    local_path = os.path.join(temp_dir, filename)
    blob.download_to_filename(local_path)

    print(f"[GCS] Downloaded → {local_path}")
    return local_path


# =========================================================
# MAIN PIPELINE
# =========================================================

async def run_mediapipe_analysis(analysis_id: str, file_location: str):
    from db.database import db

    loop = asyncio.get_event_loop()
    local_path = None

    # Fetch all context fields needed for SSE payloads and Haiku Call 1
    record = await db.fetch_one(
        """
        SELECT session_id, user_id, exercise_name, video_url, filename, size_mb, created_at
        FROM form_analyses
        WHERE analysis_id = :aid
        """,
        {"aid": analysis_id}
    )

    session_id = record["session_id"] if record else None
    user_id    = record["user_id"]    if record else None
    video_url  = record["video_url"]  if record else file_location
    filename   = record["filename"]   if record else None
    size_mb    = record["size_mb"]    if record else None
    created_at = record["created_at"] if record else None

    ctx = {"session_id": session_id, "user_id": user_id}

    try:
        # -------------------------------------------------
        # STEP 0 — upload_received
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "upload_received", 10, extra={
            **ctx,
            "filename":   filename,
            "size_mb":    size_mb,
            "created_at": created_at,
        })

        # -------------------------------------------------
        # STEP 1 — get video onto local disk
        # -------------------------------------------------
        if file_location.startswith("gs://"):
            local_path = _download_from_gcs(file_location, analysis_id)
        else:
            local_path = file_location

        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Video not found: {local_path}")

        # -------------------------------------------------
        # STEP 2 — mediapipe_started
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "mediapipe_started", 20, extra={
            **ctx,
            "video_url": video_url,
        })

        # run_in_executor moves the CPU-heavy MediaPipe work into a thread
        # so the async event loop stays responsive for other requests
        final_json, quality_result, collage_b64, bottom_frames = await loop.run_in_executor(
            _executor,
            framework.process_video_once,
            local_path,
            "Goblet Squat",
            20.0,
            analysis_id,
        )

        # Quality gate failure
        if final_json is None:
            error_code    = quality_result.get("error_code", "BIOMECHANICS_COMPUTE_ERROR")
            error_stage   = quality_result.get("error_stage", "quality_gate")
            retryable_str = "true" if quality_result.get("retryable", False) else "false"

            await _store_failed(analysis_id, error_code, quality_result)
            await sse_manager.send_error_event(
                analysis_id=analysis_id,
                error_code=error_code,
                error_stage=error_stage,
                retryable=retryable_str,
                message=quality_result.get("message", "Something went wrong with your video."),
                landmark_medians=quality_result.get("landmark_medians"),
                session_id=session_id,
                user_id=user_id,
            )
            return

        mp_result = {**final_json, **quality_result}
        if collage_b64 is not None:
            mp_result["collage_b64"] = collage_b64

        # -------------------------------------------------
        # STEP 3 — check for error event from MediaPipe
        # -------------------------------------------------
        if mp_result.get("event") == "error":
            error_code    = mp_result.get("error_code",  "SYSTEM_ERROR")
            error_stage   = mp_result.get("error_stage", "quality_gate")
            message       = mp_result.get("message",     "Something went wrong with your video.")
            retryable_str = "true" if mp_result.get("retryable", False) is True else "false"

            await _store_failed(analysis_id, error_code, mp_result)
            await sse_manager.send_error_event(
                analysis_id=analysis_id,
                error_code=error_code,
                error_stage=error_stage,
                retryable=retryable_str,
                message=message,
                landmark_medians=mp_result.get("landmark_medians"),
                session_id=session_id,
                user_id=user_id,
            )
            return

        # -------------------------------------------------
        # STEP 4 — mediapipe_complete
        # -------------------------------------------------
        rep_count        = mp_result["session"]["rep_count"]
        fps              = mp_result.get("fps", 30)
        keypoints        = mp_result.get("keypoints_detected", 0)
        frames_processed = mp_result.get("frames_processed", 0)

        await sse_manager.send_event(analysis_id, "mediapipe_complete", 40, extra={
            **ctx,
            "rep_count":          rep_count,
            "fps":                fps,
            "keypoints_detected": keypoints,
            "frames_processed":   frames_processed,
        })

        # -------------------------------------------------
        # STEP 5 — store biomechanics → biomechanics_complete
        # -------------------------------------------------
        await _store_biomechanics(analysis_id, mp_result)

        await sse_manager.send_event(analysis_id, "biomechanics_complete", 55, extra={
            **ctx,
            "rep_count":       rep_count,
            "joints_computed": mp_result.get("joints_computed", 0),
            "avg_confidence":  mp_result.get("avg_confidence", 0.0),
        })

        # -------------------------------------------------
        # STEP 6 — clean up temp video file
        # -------------------------------------------------
        if local_path and "incoming" in local_path:
            shutil.rmtree(os.path.dirname(local_path), ignore_errors=True)

        # -------------------------------------------------
        # STEP 7 — haiku_started → Haiku Call 1 → analysis_ready
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "haiku_started", 65, extra=ctx)

        # Build session metadata for Haiku Call 1
        session_data = {
            "exercise":     record["exercise_name"] if record else "goblet_squat",
            "camera_angle": "side_right",
            "set_number":   1,
            "rep_count":    rep_count,
            "load_kg":      mp_result.get("weight_kg_normalised", 0.0),
            "pain_level":   0,
            "user_id":      user_id,
        }

        # Slim biomechanics payload — session summary + per-rep data only
        # (excludes raw frame-by-frame data to stay within TPM limits)
        biomechanics_slim = {
            "session": mp_result.get("session", {}),
            "reps":    mp_result.get("reps", []),
        }

        # Run Haiku Call 1 in thread pool (uses sync Anthropic client)
        coaching_output = await loop.run_in_executor(
            _executor,
            lambda: _haiku_call_1.analyze_form(
                session_data=session_data,
                biomechanics_json=biomechanics_slim,
                frame_images=None,
                max_tokens=4096,
            )
        )

        # Write to form_analysis_results — required for Haiku Call 2 to find this session
        await _store_analysis_results(analysis_id, user_id, session_id, record, mp_result, coaching_output)

        overall_score = coaching_output.get("overall_form_score", 0)
        

        await sse_manager.send_event(analysis_id, "analysis_ready", 80, extra={
            **ctx,
            "overall_score": overall_score,
        })

        # -------------------------------------------------
        # STEP 8 — Haiku Call 2 fires async after analysis_ready
        # Does NOT block Tab 1 from unlocking
        # Emits haiku_call_2_complete or haiku_call_2_no_history
        # -------------------------------------------------

       # asyncio.create_task(fire_progression_ready()) #progression_ready runs async and does NOT block analysis_ready
        print("[PIPELINE] checking eligibility for haiku call 2")
        previous_session_exists = await db.fetch_one(
            """
            SELECT 1
            FROM form_analysis_results far
            JOIN form_analyses fa ON fa.analysis_id = far.analysis_id
            WHERE far.user_id = :user_id
            AND far.exercise_id = :exercise_id
            AND far.analysis_id != :analysis_id
            LIMIT 1
            """,
            values={
                "user_id": user_id,
                "exercise_id": mp_result.get("exercise_name", "goblet_squat"),
                "analysis_id": analysis_id
            }
        )

        if previous_session_exists:
            print("[PIPELINE] scheduling haiku call 2")
            asyncio.create_task(run_haiku_call_2(analysis_id))
            print("[PIPELINE] scheduled haiku call 2")
        else:
            print("[PIPELINE] skipping haiku call 2 (no history)")
            await sse_manager.send_event(
                analysis_id,
                "haiku_call_2_no_history",
                100,
                "complete"
            )
        print(f"[pipeline] Completed analysis_id={analysis_id}, reps={rep_count}")
        return mp_result

    except FileNotFoundError as e:
        print(f"[pipeline] File not found: {e}")
        await _store_failed(analysis_id, "SYSTEM_ERROR", str(e))
        await sse_manager.send_error_event(
            analysis_id=analysis_id,
            error_code="SYSTEM_ERROR",
            error_stage="pipeline",
            retryable="true",
            message="Something went wrong on our end. Your video is saved — try again in a moment.",
            session_id=session_id,
            user_id=user_id,
        )

    except Exception as e:
        print(f"[pipeline] Unexpected error: {e}")
        await _store_failed(analysis_id, "BIOMECHANICS_COMPUTE_ERROR", str(e))
        await sse_manager.send_error_event(
            analysis_id=analysis_id,
            error_code="BIOMECHANICS_COMPUTE_ERROR",
            error_stage="biomechanics",
            retryable="true",
            message="Something went wrong reading your movement data. Try re-uploading.",
            session_id=session_id,
            user_id=user_id,
        )


# =========================================================
# DB HELPERS
# =========================================================

async def _store_biomechanics(analysis_id: str, data: dict):
    """Store full biomechanics JSON and mark analysis complete."""
    from db.database import db

    # 1. Store full ML output + pipeline status
    await db.execute(
        """
        UPDATE form_analyses
        SET status = 'complete',
            biomechanics_json = :bio
        WHERE analysis_id = :aid
        """,
        values={
            "aid": analysis_id,
            "bio": json.dumps(data),
        },
    )

    # 2. Store derived metrics separately
    await db.execute(
        """
        UPDATE form_analysis_results
        SET rep_count = :reps
        WHERE analysis_id = :aid
        """,
        values={
            "aid": analysis_id,
            "reps": data["session"]["rep_count"],
        },
    )


async def _store_failed(analysis_id: str, reason: str, detail=None):
    """Mark analysis as failed with error reason."""
    from db.database import db

    await db.execute(
        """
        UPDATE form_analyses
        SET status = 'failed',
            error_code = :err
        WHERE analysis_id = :aid
        """,
        values={
            "aid": analysis_id,
            "err": json.dumps({"reason": reason, "detail": str(detail) if detail else None}),
        },
    )


async def _store_analysis_results(
    analysis_id: str,
    user_id: str,
    session_id: str,
    record: dict,
    mp_result: dict,
    coaching_output: dict,
):
    """
    Write Haiku Call 1 output to form_analysis_results.
    This row is the prerequisite for Haiku Call 2 — it must exist before
    run_haiku_call_2 is called.

    Parameter scores are extracted from coaching_output['parameter_scores'].
    Key names must match what haiku_call_1_system.txt produces — verify against
    a real response if scores are storing as None.
    """
    from db.database import db

    session        = mp_result.get("session", {})
    param_scores   = coaching_output.get("parameter_scores", {})

    await db.execute(
        """
        INSERT OR REPLACE INTO form_analysis_results (
            analysis_id,
            session_id,
            user_id,
            exercise_id,
            weight_kg_normalised,
            overall_form_score,
            posture_score,
            stability_score,
            movement_quality_score,
            tempo_score,
            rep_count,
            rep_scores,
            coaching_output
        ) VALUES (
            :analysis_id,
            :session_id,
            :user_id,
            :exercise_id,
            :weight_kg_normalised,
            :overall_form_score,
            :posture_score,
            :stability_score,
            :movement_quality_score,
            :range_of_motion_score,
            :rep_count,
            :rep_scores,
            :coaching_output
        )
        """,
        values={
            "analysis_id":            analysis_id,
            "session_id":             session_id or "00000000-0000-0000-0000-000000000000",
            "user_id":                user_id,
            # "exercise_id":            record["exercise_id"] if record else "goblet_squat",
            "exercise_id":            mp_result.get("exercise_name", "goblet_squat"),
            "weight_kg_normalised":   mp_result.get("weight_kg_normalised", 0.0),
            "overall_form_score":     coaching_output.get("overall_form_score"),
            "posture_score":          param_scores.get("posture"),
            "stability_score":        param_scores.get("stability"),
            "movement_quality_score": param_scores.get("movement_quality"),
            #"tempo_score":            param_scores.get("ROM"),
            "range_of_motion_score": param_scores.get("range_of_motion"),
            "rep_count":              session.get("rep_count"),
            "rep_scores":             json.dumps(coaching_output.get("rep_scores", [])),
            "coaching_output":        json.dumps(coaching_output),
        },
    )
    print(f"[Haiku Call 1] Stored form_analysis_results for {analysis_id}")
