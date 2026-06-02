# backend/pipeline/process_video.py
#
# Main video analysis pipeline — runs in background after upload.
#
# Aligned with reference backend/pipeline/process_video.py.
# Adapted for NEW-MAIN's DB schema (overall_form_score, exercise_id,
# weight_kg_normalised, annotated_frame_url).
#
# Event sequence:
#   upload_received → mediapipe_started → mediapipe_complete → biomechanics_complete
#   → haiku_started → analysis_ready  (Tab 1 unlocks)
#   → haiku_call_2_complete OR haiku_call_2_no_history  (Tab 2 unlocks / locks)

import asyncio
import os
import sys
import json
import datetime
import shutil
import logging
from concurrent.futures import ThreadPoolExecutor

from db.database import db
from utils.sse_manager import sse_manager
from mediapipe_code.landmark_framework import LandmarkQualityFramework
from services.haiku_call_1_integration import HaikuCall1
from services.haiku_call_2_progression import run_haiku_call_2

logger = logging.getLogger(__name__)

# Thread pool for CPU-heavy work (MediaPipe, sync Haiku client)
_executor = ThreadPoolExecutor(max_workers=2)

# Singleton framework — loaded once at startup
framework = LandmarkQualityFramework(
    model_path="mediapipe_code/model/pose_landmarker_heavy.task"
)

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")


# =========================================================
# HELPERS
# =========================================================

def safe_int(val, default=70):
    try:
        if val is None:
            return default
        return int(float(str(val).strip()))
    except Exception:
        return default


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

    temp_dir = os.path.join("./backend/mediapipe_code/videos/incoming", session_id)
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
    loop = asyncio.get_event_loop()
    local_path = None

    # Fetch all context fields
    record = await db.fetch_one(
        """
        SELECT session_id, user_id, exercise_name, video_url, filename, size_mb, created_at,
               weight_value, weight_unit, weight_kg
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
    weight_value = float(record["weight_value"]) if record and record["weight_value"] else 0.0
    weight_unit  = record["weight_unit"] or "lbs" if record else "lbs"
    weight_kg    = float(record["weight_kg"]) if record and record["weight_kg"] else weight_value * 0.45359237

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
            local_path = await loop.run_in_executor(
                None, _download_from_gcs, file_location, analysis_id
            )
        else:
            local_path = file_location

        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Video not found: {local_path}")

        # Optional: downscale to 540p for performance
        try:
            scaled_path = local_path + ".scaled.mp4"
            use_h264_vt = (sys.platform == "darwin")
            scale_cmd = [
                "ffmpeg", "-y",
                "-i", local_path,
                "-vf", "scale=-2:'min(540,ih)'",
                "-c:v", "h264_videotoolbox" if use_h264_vt else "libx264",
                "-b:v", "2M",
                "-pix_fmt", "yuv420p",
                "-c:a", "copy",
                scaled_path
            ]
            def run_scale():
                import subprocess
                subprocess.run(scale_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            await loop.run_in_executor(None, run_scale)
            if os.path.exists(scaled_path) and os.path.getsize(scaled_path) > 0:
                os.replace(scaled_path, local_path)
        except Exception as scale_err:
            logger.warning(f"[pipeline] Downscale failed, using original: {scale_err}")

        # -------------------------------------------------
        # STEP 2 — mediapipe_started
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "mediapipe_started", 20, extra={
            **ctx,
            "video_url": video_url,
        })

        # run_in_executor moves the CPU-heavy MediaPipe work into a thread
        final_json, quality_result, collage_b64, bottom_frames = await loop.run_in_executor(
            _executor,
            framework.process_video_once,
            local_path,
            "Goblet Squat",
            weight_kg,
            analysis_id,
        )

        # Quality gate failure
        if final_json is None or quality_result.get("event") != "mediapipe_complete":
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

        q_status = quality_result.get("quality_gate_status", "GOOD")
        v_score  = float(quality_result.get("video_score", 1.0))

        await db.execute(
            "UPDATE form_analyses SET quality_gate_status = :q, video_score = :v, status = 'processing' WHERE analysis_id = :aid",
            {"q": q_status, "v": v_score, "aid": analysis_id}
        )

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

        # Save biomechanics JSON to DB
        await db.execute(
            "UPDATE form_analyses SET biomechanics_json = :bio WHERE analysis_id = :aid",
            {"aid": analysis_id, "bio": json.dumps(mp_result)}
        )

        # -------------------------------------------------
        # STEP 5 — biomechanics_complete
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "biomechanics_complete", 55, extra={
            **ctx,
            "rep_count":       rep_count,
            "joints_computed": mp_result.get("joints_computed", 0),
            "avg_confidence":  mp_result.get("avg_confidence", 0.0),
        })

        # Clean up GCS temp download
        if local_path and "incoming" in local_path:
            shutil.rmtree(os.path.dirname(local_path), ignore_errors=True)

        # -------------------------------------------------
        # STEP 7 — haiku_started → Haiku Call 1 → analysis_ready
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "haiku_started", 65, extra=ctx)

        # Instantiate Haiku Call 1 — loads coaching_system.md from prompts/
        haiku_service = HaikuCall1(exercise="goblet_squat")

        # Execute API call in executor (sync client, blocks otherwise)
        llm_response = await loop.run_in_executor(
            None, haiku_service.analyze_form, mp_result, collage_b64
        )

        # -------------------------------------------------
        # Extract and normalise scores from llm_response
        # The schema outputs: overall_score, coaching.parameters.{posture,stability,
        # movement_quality,range_of_motion}.score, reps[].form_score
        # -------------------------------------------------

        # Handle dual-output structure (db_output wrapper) or flat dict
        if isinstance(llm_response, dict) and "db_output" in llm_response:
            db_output = llm_response.get("db_output", {})
        else:
            db_output = llm_response if isinstance(llm_response, dict) else {}

        # overall score — schema key is overall_score
        overall_score = safe_int(
            db_output.get("overall_form_score") or db_output.get("overall_score"),
            70
        )

        # parameter scores — nested under coaching.parameters
        coaching_block = db_output.get("coaching", {})
        parameters     = coaching_block.get("parameters", {})

        # Score extraction with fallback to top-level keys
        posture_score           = safe_int(parameters.get("posture", {}).get("score")          or db_output.get("posture_score"), 70)
        stability_score         = safe_int(parameters.get("stability", {}).get("score")        or db_output.get("stability_score"), 70)
        movement_quality_score  = safe_int(parameters.get("movement_quality", {}).get("score") or db_output.get("movement_quality_score"), 70)
        rom_score               = safe_int(parameters.get("range_of_motion", {}).get("score") or db_output.get("range_of_motion_score"), 70)
        # tempo_score maps to ROM for this schema
        tempo_score             = rom_score

        # Align parameter feedback/correction fields
        for param_key in ["posture", "stability", "movement_quality", "range_of_motion"]:
            if param_key in parameters:
                p = parameters[param_key]
                if isinstance(p, dict):
                    if "correction" in p and "feedback" not in p:
                        p["feedback"] = p["correction"]
                    elif "feedback" in p and "correction" not in p:
                        p["correction"] = p["feedback"]
                    if "score" in p:
                        p["score"] = safe_int(p["score"], 70)

        # Recalculate overall to keep scores consistent
        recalculated = int(round(
            (rom_score * 0.35)
            + (stability_score * 0.25)
            + (posture_score * 0.25)
            + (movement_quality_score * 0.15)
        ))
        if abs(overall_score - recalculated) <= 2:
            overall_score = recalculated

        # Reps
        reps = db_output.get("reps", [])
        if isinstance(reps, list):
            for r in reps:
                if isinstance(r, dict) and "form_score" in r:
                    r["form_score"] = safe_int(r["form_score"], 70)
        rep_scores_list = [r.get("form_score") for r in reps if isinstance(r, dict)]

        rep_count_final = safe_int(len(reps), len(reps))

        # Diagnostic fields
        issue_tags      = db_output.get("issue_tags", [])
        faults_detected = db_output.get("faults_detected", {})
        fault_confidence= db_output.get("fault_confidence", {})
        causal_chains   = db_output.get("causal_chains", [])
        fault_detail    = db_output.get("fault_detail", {})
        trends          = db_output.get("trends", {})
        reasoning       = db_output.get("reasoning", "")
        issues_only     = db_output.get("issues", [])
        camera_angle    = mp_result.get("session", {}).get("camera_view", "side")

        worse_rep       = db_output.get("worse_rep") or db_output.get("worst_rep_index", 1)
        worst_frame_idx = max(0, safe_int(worse_rep, 1) - 1)

        exercise_id          = (record["exercise_name"] if record else None) or "goblet_squat"
        weight_kg_normalised = weight_kg

        # -------------------------------------------------
        # STEP 8 — Write to form_analysis_results (NEW-MAIN schema)
        # -------------------------------------------------
        await db.execute(
            """
            INSERT OR REPLACE INTO form_analysis_results (
                analysis_id,
                session_id,
                user_id,
                exercise_id,
                weight_kg_normalised,
                overall_form_score,
                range_of_motion_score,
                posture_score,
                stability_score,
                movement_quality_score,
                tempo_score,
                rep_count,
                rep_scores,
                coaching_output,
                issues_json,
                raw_llm_response,
                chain_of_thought,
                issue_tags,
                faults_detected,
                fault_confidence,
                causal_chains,
                fault_detail,
                trends,
                camera_angle,
                worst_frame_index,
                model_version,
                created_at
            ) VALUES (
                :analysis_id,
                :session_id,
                :user_id,
                :exercise_id,
                :weight_kg_normalised,
                :overall_form_score,
                :rom_score,
                :posture_score,
                :stability_score,
                :movement_quality_score,
                :tempo_score,
                :rep_count,
                :rep_scores,
                :coaching_output,
                :issues_json,
                :raw_llm_response,
                :reasoning,
                :issue_tags,
                :faults_detected,
                :fault_confidence,
                :causal_chains,
                :fault_detail,
                :trends,
                :camera_angle,
                :worst_frame_idx,
                :model_version,
                :created_at
            )
            """,
            {
                "analysis_id":            analysis_id,
                "session_id":             session_id or "00000000-0000-0000-0000-000000000000",
                "user_id":                user_id,
                "exercise_id":            exercise_id,
                "weight_kg_normalised":   weight_kg_normalised,
                "overall_form_score":     overall_score,
                "rom_score":              rom_score,
                "posture_score":          posture_score,
                "stability_score":        stability_score,
                "movement_quality_score": movement_quality_score,
                "tempo_score":            tempo_score,
                "rep_count":              rep_count_final,
                "rep_scores":             json.dumps(rep_scores_list),
                "coaching_output":        json.dumps(coaching_block),
                "issues_json":            json.dumps(issues_only),
                "raw_llm_response":       json.dumps(db_output),
                "reasoning":              reasoning,
                "issue_tags":             json.dumps(issue_tags),
                "faults_detected":        json.dumps(faults_detected),
                "fault_confidence":       json.dumps(fault_confidence),
                "causal_chains":          json.dumps(causal_chains),
                "fault_detail":           json.dumps(fault_detail),
                "trends":                 json.dumps(trends),
                "camera_angle":           camera_angle,
                "worst_frame_idx":        worst_frame_idx,
                "model_version":          haiku_service.model,
                "created_at":             datetime.datetime.utcnow().isoformat(),
            }
        )

        # Mark session completed
        await db.execute(
            "UPDATE form_analyses SET status = 'completed' WHERE analysis_id = :aid",
            {"aid": analysis_id}
        )

        print(f"[Haiku Call 1] Stored form_analysis_results for {analysis_id}")

        # Final analysis_ready SSE with score
        await sse_manager.send_event(analysis_id, "analysis_ready", 95, extra={
            **ctx,
            "overall_score": overall_score,
        })

        # -------------------------------------------------
        # STEP 9 — Haiku Call 2 (async, does NOT block Tab 1)
        # -------------------------------------------------
        print("[PIPELINE] scheduling haiku call 2")
        asyncio.create_task(run_haiku_call_2(analysis_id))
        print("[PIPELINE] scheduled haiku call 2")

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
            session_id=session_id if "session_id" in locals() else None,
            user_id=user_id if "user_id" in locals() else None,
        )

    except Exception as e:
        print(f"[pipeline] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        await _store_failed(analysis_id, "BIOMECHANICS_COMPUTE_ERROR", str(e))
        await sse_manager.send_error_event(
            analysis_id=analysis_id,
            error_code="BIOMECHANICS_COMPUTE_ERROR",
            error_stage="biomechanics",
            retryable="true",
            message="Something went wrong reading your movement data. Try re-uploading.",
            session_id=session_id if "session_id" in locals() else None,
            user_id=user_id if "user_id" in locals() else None,
        )


# =========================================================
# DB HELPERS
# =========================================================

async def _store_failed(analysis_id: str, reason: str, detail=None):
    """Mark analysis as failed with error reason."""
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
