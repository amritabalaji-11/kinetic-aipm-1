# backend/pipeline/process_video.py
#
# Main video analysis pipeline — runs in background after upload.
#
# Event sequence:
#   upload_received → mediapipe_started → mediapipe_complete → biomechanics_complete
#   → haiku_started → analysis_ready  (Tab 1 unlocks)
#   → haiku_call_2_queued  (emitted before async job fires)
#   → haiku_call_2_complete OR haiku_call_2_no_history  (Tab 2 unlocks / locks)

import asyncio
import functools
import os
import json
import shutil
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from utils.gcs import upload_image_to_gcs
from mediapipe_code.mp_utils.visualization.draw_methods import extract_worst_frame, overlay_frame
from mediapipe_code.mp_utils.visualization.hybrid_overlay import overlay_frame_hybrid
from services.haiku_call_2_progression import run_haiku_call_2
from mediapipe_code.landmark_framework import LandmarkQualityFramework
from utils.sse_manager import sse_manager
from mediapipe_code.llm_run_code import run_llm_analysis
from mediapipe_code.llm_run_code import run_llm_comparison
from services.haiku_call_1_integration import HaikuCall1
import traceback


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
    temp_dir = os.path.join("mediapipe_code", "videos", "incoming", session_id)
    # temp_dir = os.path.join(".\\backend\\mediapipe_code\\videos\\incoming", session_id)
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
    """
    Full async pipeline — Haiku edition.

    Event sequence:
      upload_received → mediapipe_started → mediapipe_complete → biomechanics_complete
      → haiku_started → analysis_ready (Tab 1 unlocks)
      → haiku_call_2_queued → haiku_call_2_complete (async) — closes stream
    """
    from db.database import db

    loop = asyncio.get_event_loop()
    local_path = None

    # Fetch all context fields needed for SSE payloads and Haiku Call 1
    record = await db.fetch_one(
        """
        SELECT session_id, user_id, exercise_name, video_url, filename, size_mb, created_at,
               weight_value, weight_unit
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
    weight_value = record["weight_value"] if record and record["weight_value"] else None
    weight_unit = record["weight_unit"] if record else None

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
        print(file_location)
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
        # The analysis runs in a worker thread, so progress is handed back to the event loop to be sent to the app
        def report_progress(fraction: float):
            asyncio.run_coroutine_threadsafe(
                sse_manager.send_event(
                    analysis_id, "mediapipe_progress", 20 + int(fraction * 20), extra={**ctx, "fraction": round(fraction, 3)},
                ),
                loop,
            )

        final_json, quality_result, collage_b64, rep_frames_list = await loop.run_in_executor(
            _executor,
            functools.partial(
                framework.process_video_once,
                local_path,
                "Goblet Squat",
                20.0,
                analysis_id,
                progress_callback=report_progress,
            ),
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
        # STEP 6 — haiku_started → Haiku Call 1 → analysis_ready
        # -------------------------------------------------
        await sse_manager.send_event(analysis_id, "haiku_started", 65, extra=ctx)

        # Build session metadata for Haiku Call 1
        # Use actual weight from form if available, otherwise fall back to MediaPipe estimate
        actual_weight_kg = None
        if weight_value and weight_unit:
            if weight_unit.lower() in ["lbs", "lb"]:
                actual_weight_kg = round(weight_value * 0.453592, 2)
            else:
                actual_weight_kg = weight_value

        session_data = {
            "exercise":     record["exercise_name"] if record else "goblet_squat",
            "camera_angle": "side_right",
            "set_number":   1,
            "rep_count":    rep_count,
            "load_kg":      actual_weight_kg if actual_weight_kg else mp_result.get("weight_kg_normalised", 0.0),
            "pain_level":   0,
            "user_id":      user_id,
        }

        biomechanics_slim = {
            "session": mp_result.get("session", {}),
            "reps":    mp_result.get("reps", []),
        }

        coaching_output = await loop.run_in_executor(
            _executor,
            lambda: _haiku_call_1.analyze_form(
                session_data=session_data,
                biomechanics_json=biomechanics_slim,
                frame_images=None,
                max_tokens=8192,
            )
        )

        rep_scores = coaching_output.get("rep_scores", [])

        # Write to form_analysis_results — required for Haiku Call 2 to find this session
        await _store_analysis_results(analysis_id, user_id, session_id, record, mp_result, coaching_output)

        overall_score = coaching_output.get("overall_form_score", 0)

        await sse_manager.send_event(analysis_id, "analysis_ready", 80, extra={
            **ctx,
            "overall_score": overall_score,
        })

        # -------------------------------------------------
        # STEP 7 — annotated picture, in the background
        # The results text is already saved, so the picture must not hold anything up. It runs
        # as its own task; it saves the image address when ready and deletes the temp video.
        # -------------------------------------------------
        asyncio.create_task(_make_annotated_image(
            analysis_id, local_path, rep_scores, rep_frames_list, final_json, loop,
        ))

        # -------------------------------------------------
        # STEP 8 — Enqueue Haiku Call 2 (async, does not block analysis_ready)
        #
        # S2-W8-01: stamp queued_at in DB so the haiku-status endpoint returns
        # accurate timing before the job enters running state.
        # S2-W8-04: emit haiku_call_2_queued SSE so the frontend knows the job
        # is enqueued. run_haiku_call_2 handles the no-history case internally
        # and emits haiku_call_2_no_history if there's nothing to compare against.
        # -------------------------------------------------
        queued_at = datetime.now(timezone.utc).isoformat()

        await db.execute(
            """
            UPDATE form_analyses
            SET haiku_call_2_status    = 'queued',
                haiku_call_2_queued_at  = :ts
            WHERE analysis_id = :aid
            """,
            values={"ts": queued_at, "aid": analysis_id},
        )

        await sse_manager.send_event(
            analysis_id, "haiku_call_2_queued", 85,
            extra={
                **ctx,
                "job_id":       analysis_id,
                "timestamp_ms": int(datetime.now(timezone.utc).timestamp() * 1000),
                "output":       None,
                "error":        None,
            },
        )

        asyncio.create_task(run_haiku_call_2(analysis_id))

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
        traceback.print_exc()
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


async def _make_annotated_image(analysis_id, local_path, rep_scores, rep_frames_list, final_json, loop):
    """
    Worst-rep picture with angle overlay -> bucket -> address saved on the results row.
    The picture is a bonus: any failure here is logged and the analysis is unaffected.
    The temp video is deleted here, because this is the last step that needs it.
    """
    from db.database import db
    image_path = None
    try:
        def build():
            frame, frame_data, camera_view, rep_data = extract_worst_frame(local_path, rep_scores, rep_frames_list, final_json)
            # named by analysis id so two uploads at once never overwrite each other's picture
            try:
                return overlay_frame_hybrid(frame, frame_data, camera_view, rep_data, output_filename=analysis_id)
            except Exception as e:  # new design failed: fall back to the original overlay rather than lose the picture
                print(f"[pipeline] hybrid overlay failed ({e}); using the original overlay")
                return overlay_frame(frame, frame_data, camera_view, rep_data, output_filename=analysis_id)

        # OpenCV work goes to the thread pool so the server stays responsive
        _, image_path = await loop.run_in_executor(_executor, build)

        image_info = await upload_image_to_gcs(
            image_path,
            f"kinetic-annotated-frames/{analysis_id}/{analysis_id}.jpg"
        )

        # Save the bucket address (gs://...); the API turns it into a viewing link on the way out
        await db.execute(
            """
            UPDATE form_analysis_results
            SET annotated_frame_url = :url
            WHERE analysis_id = :analysis_id
            """,
            values={"url": image_info["gcs_url"], "analysis_id": analysis_id},
        )
        print(f"[pipeline] Annotated image saved for analysis_id={analysis_id}")

    except Exception as e:
        print("--------------------------------------------------------")
        print("ERROR IN IMAGE GENERATION (analysis continues without the image)")
        print(e)
        print("--------------------------------------------------------")
    finally:
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
        if local_path and "incoming" in local_path:
            shutil.rmtree(os.path.dirname(local_path), ignore_errors=True)


# =========================================================
# DB HELPERS
# =========================================================

async def _store_biomechanics(analysis_id: str, data: dict):
    """Store full biomechanics JSON and mark analysis complete."""
    from db.database import db

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
    This row is the prerequisite for Haiku Call 2.
    """
    from db.database import db

    session      = mp_result.get("session", {})
    param_scores = coaching_output.get("parameter_scores", {})

    # Fetch weight_value and weight_unit from form_analyses
    weight_row = await db.fetch_one(
        "SELECT weight_value, weight_unit FROM form_analyses WHERE analysis_id = :aid",
        values={"aid": analysis_id}
    )
    #weight_value = weight_row.get("weight_value") if weight_row else None
    #weight_unit = weight_row.get("weight_unit") if weight_row else None
    weight_value = weight_row["weight_value"] if weight_row else None
    weight_unit = weight_row["weight_unit"] if weight_row else None

    await db.execute(
        """
        INSERT INTO form_analysis_results (
            analysis_id,
            session_id,
            user_id,
            exercise_id,
            weight_value,
            weight_unit,
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
            :weight_value,
            :weight_unit,
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
        ON CONFLICT (analysis_id) DO UPDATE SET
            session_id = excluded.session_id,
            user_id = excluded.user_id,
            exercise_id = excluded.exercise_id,
            weight_value = excluded.weight_value,
            weight_unit = excluded.weight_unit,
            weight_kg_normalised = excluded.weight_kg_normalised,
            overall_form_score = excluded.overall_form_score,
            posture_score = excluded.posture_score,
            stability_score = excluded.stability_score,
            movement_quality_score = excluded.movement_quality_score,
            tempo_score = excluded.tempo_score,
            rep_count = excluded.rep_count,
            rep_scores = excluded.rep_scores,
            coaching_output = excluded.coaching_output
        """,
        values={
            "analysis_id":            analysis_id,
            "session_id":             session_id or "00000000-0000-0000-0000-000000000000",
            "user_id":                user_id,
            "exercise_id":            mp_result.get("exercise_name", "goblet_squat"),
            "weight_value":           weight_value,
            "weight_unit":            weight_unit,
            "weight_kg_normalised":   mp_result.get("weight_kg", 0.0),
            "overall_form_score":     coaching_output.get("overall_form_score"),
            "posture_score":          param_scores.get("posture", {}).get("score") if isinstance(param_scores.get("posture"), dict) else param_scores.get("posture"),
            "stability_score":        param_scores.get("stability", {}).get("score") if isinstance(param_scores.get("stability"), dict) else param_scores.get("stability"),
            "movement_quality_score": param_scores.get("movement_quality", {}).get("score") if isinstance(param_scores.get("movement_quality"), dict) else param_scores.get("movement_quality"),
            "range_of_motion_score":  param_scores.get("range_of_motion", {}).get("score") if isinstance(param_scores.get("range_of_motion"), dict) else param_scores.get("range_of_motion"),
            "rep_count":              session.get("rep_count"),
            "rep_scores":             json.dumps(coaching_output.get("rep_scores", [])),
            "coaching_output":        json.dumps(coaching_output),
        },
    )
    print(f"[Haiku Call 1] Stored form_analysis_results for {analysis_id}")
