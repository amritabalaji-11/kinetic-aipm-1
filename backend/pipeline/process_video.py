# backend/pipeline/process_video.py
#
# This is the main video analysis pipeline.
# It runs in the background after a user uploads a video.
#
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

import anthropic

from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager


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

async def run_mediapipe_analysis(analysis_id: str, file_location: str):
    """
    Full async pipeline — Haiku edition.

    Event sequence:
      upload_received → mediapipe_started → mediapipe_complete → biomechanics_complete
      → haiku_started → analysis_ready (Tab 1 unlocks)
      → frame_ready (async, ~2-3s after analysis_ready)
      → progression_ready (async, after Haiku Call 2) — closes stream
    """
    from db.database import db

    loop = asyncio.get_event_loop()
    local_path = None

    # Fetch context fields needed for SSE payloads
    record = await db.fetch_one(
        "SELECT session_id, user_id, video_url, created_at FROM form_analyses WHERE analysis_id = :aid",
        {"aid": analysis_id}
    )
    session_id = record["session_id"] if record else None
    user_id    = record["user_id"]    if record else None
    video_url  = record["video_url"]  if record else file_location
    created_at = record["created_at"] if record else None

    ctx = {"session_id": session_id, "user_id": user_id}

    try:
        # -------------------------------------------------
        # STEP 0 — upload_received
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "upload_received", 10, extra={
            **ctx,
            "created_at": created_at,
        })

        # -------------------------------------------------
        # STEP 1 — get the video onto local disk
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

        mp_result = await loop.run_in_executor(
            _executor,
            framework.process_video_once,
            local_path,
            "Goblet Squat",
            20.0,
            analysis_id,
        )

        # -------------------------------------------------
        # STEP 3 — check what came back
        # -------------------------------------------------
        if not mp_result:
            await _store_failed(analysis_id, "BIOMECHANICS_COMPUTE_ERROR", None)
            await sse_manager.send_error_event(
                analysis_id=analysis_id,
                error_code="BIOMECHANICS_COMPUTE_ERROR",
                error_stage="biomechanics",
                retryable="true",
                message="Something went wrong reading your movement data. Try re-uploading.",
                session_id=session_id,
                user_id=user_id,
            )
            return

        if mp_result.get("event") == "error":
            error_code  = mp_result.get("error_code",  "SYSTEM_ERROR")
            error_stage = mp_result.get("error_stage", "quality_gate")
            message     = mp_result.get("message",     "Something went wrong with your video.")
            retryable_raw = mp_result.get("retryable", False)
            retryable_str = "true" if retryable_raw is True else "false"

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
        # STEP 5 — store biomechanics, then biomechanics_complete (silent)
        # -------------------------------------------------
        await _store_biomechanics(analysis_id, mp_result)

        await sse_manager.send_event(analysis_id, "biomechanics_complete", 55, extra={
            **ctx,
            "rep_count":      rep_count,
            "joints_computed": mp_result.get("joints_computed", 0),
            "avg_confidence":  mp_result.get("avg_confidence", 0.0),
        })

        # -------------------------------------------------
        # STEP 6 — clean up temp file
        # -------------------------------------------------
        if local_path and "incoming" in local_path:
            shutil.rmtree(os.path.dirname(local_path), ignore_errors=True)

        # -------------------------------------------------
        # STEP 7 — haiku_started → Haiku Call 1 → analysis_ready
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "haiku_started", 65, extra=ctx)

        # TODO: replace sleep with real Haiku Call 1 and DB write
        await asyncio.sleep(2)

        overall_score = mp_result.get("session", {}).get("overall_form_score", 0)

        await sse_manager.send_event(analysis_id, "analysis_ready", 80, extra={
            **ctx,
            "overall_score": overall_score,
        })

        # -------------------------------------------------
        # STEP 8 — frame_ready and progression_ready fire concurrently
        # frame_ready:      OpenCV Part 2 (~2-3s after analysis_ready)
        # progression_ready: Haiku Call 2 (async, does not block analysis_ready)
        # -------------------------------------------------
        async def fire_frame_ready():
            # TODO: replace sleep with real OpenCV Part 2; annotated_frame_url from DB
            await asyncio.sleep(2)
            annotated_frame_url = mp_result.get("annotated_frame_url", "")
            await sse_manager.send_event(analysis_id, "frame_ready", 90, extra={
                **ctx,
                "annotated_frame_url": annotated_frame_url,
            })

        async def fire_progression_ready():
            # Step 9 — Haiku Call 2: longitudinal coaching (Tab 2)
            # Runs async after analysis_ready. Does not block Tab 1.
            from db.database import db as _db

            try:
                # ── Fetch current session ────────────────────────────────
                current_row = await _db.fetch_one(
                    "SELECT * FROM form_analyses WHERE analysis_id = :aid",
                    {"aid": analysis_id}
                )
                current_bio = json.loads(current_row["biomechanics_json"] or "{}")
                current_summary = current_bio.get("summary", {})
                current_reps = current_bio.get("reps", [])

                def _fmt_date(iso):
                    # "2026-05-22T..." → "May 22"
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(iso[:10])
                        return dt.strftime("%b %-d")
                    except Exception:
                        return iso[:10]

                def _row_to_session(row):
                    bio = json.loads(row["biomechanics_json"] or "{}")
                    s = bio.get("summary", {})
                    reps = bio.get("reps", [])
                    return {
                        "date_label":            _fmt_date(row["created_at"]),
                        "weight_value":          row["weight_value"],
                        "weight_unit":           row["weight_unit"],
                        "overall_form_score":    s.get("overall_form_score", 0),
                        "posture_score":         s.get("posture_score", 0),
                        "stability_score":       s.get("stability_score", 0),
                        "movement_quality_score": s.get("movement_quality_score", 0),
                        "tempo_score":           s.get("tempo_score", 0),
                        "reps": [
                            {"rep_number": r.get("rep_number", i + 1), "form_score": r.get("form_score", 0)}
                            for i, r in enumerate(reps)
                        ],
                    }

                current_session_data = _row_to_session(current_row)

                # ── Fetch last 5 sessions (same user + exercise) ─────────
                prev_rows = await _db.fetch_all(
                    """
                    SELECT * FROM form_analyses
                    WHERE user_id    = :uid
                      AND exercise_id = :eid
                      AND analysis_id != :aid
                      AND status      = 'complete'
                      AND biomechanics_json IS NOT NULL
                    ORDER BY created_at DESC
                    LIMIT 5
                    """,
                    {"uid": user_id, "eid": current_row["exercise_id"], "aid": analysis_id}
                )
                previous_sessions_data = [_row_to_session(r) for r in prev_rows]

                # ── Call Haiku ───────────────────────────────────────────
                haiku = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
                response = await haiku.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=1500,
                    system=HAIKU_CALL_2_SYSTEM,
                    messages=[{
                        "role": "user",
                        "content": json.dumps({
                            "current_session":    current_session_data,
                            "previous_sessions":  previous_sessions_data,
                        })
                    }]
                )

                progression_output = json.loads(response.content[0].text)
                print(f"[pipeline] Haiku Call 2 complete for analysis_id={analysis_id}")

                # ── Store to DB ──────────────────────────────────────────
                await _db.execute(
                    """
                    UPDATE form_analyses
                    SET progression_output = :prog,
                        status = 'complete'
                    WHERE analysis_id = :aid
                    """,
                    {"prog": json.dumps(progression_output), "aid": analysis_id}
                )

            except Exception as e:
                # Haiku Call 2 failure must not block the SSE stream —
                # fire progression_ready without data so Tab 2 shows empty state.
                print(f"[pipeline] Haiku Call 2 failed: {e}")

            await sse_manager.send_event(
                analysis_id, "progression_ready", 100,
                status="completed",
                extra=ctx,
            )

        await asyncio.gather(fire_frame_ready(), fire_progression_ready())

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
    """Saves successful biomechanics results to the database."""
    from db.database import db

    await db.execute(
        """
        UPDATE form_analyses
        SET status = 'complete',
            biomechanics_json = :bio,
            rep_count = :reps
        WHERE analysis_id = :aid
        """,
        values={
            "aid": analysis_id,
            "bio": json.dumps(data),
            "reps": data["session"]["rep_count"],
        },
    )


async def _store_failed(analysis_id: str, reason: str, detail=None):
    """Marks the analysis as failed in the database with the error reason."""
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
