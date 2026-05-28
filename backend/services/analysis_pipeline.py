import asyncio
import os
import sys
import uuid
import json
import datetime

HAIKU_MODEL_ENV = os.getenv("HAIKU_MODEL", "claude-3-5-haiku-20241022")

from utils.sse_manager import SSEManager
from utils.database import db

# Ensure mediapipe_code is in search path with high priority
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../mediapipe_code")))

from landmark_framework import LandmarkQualityFramework, MEDIAPIPE_MODEL
from mp_utils.visualization.draw_methods import extract_worst_frame
from llm_run_code import run_llm_analysis, run_llm_comparison

def safe_int(val, default=70):
    try:
        if val is None:
            return default
        return int(float(str(val).strip()))
    except:
        return default

async def run_analysis(session_id: str, file_location: str):
    try:
        # ------ Step 0: Initialization ------
        print(f"Starting pipeline analysis for session {session_id} using {file_location}")
        
        async with db.connection() as conn:
            await conn.execute(
                "UPDATE form_analyses SET status = 'processing' WHERE session_id = ?",
                session_id
            )
            
            # Fetch weight and user info for comparison later
            session_row = await conn.fetchrow(
                "SELECT user_id, weight_value, weight_unit, weight_kg FROM form_analyses WHERE session_id = ?",
                session_id
            )
        
        user_id = str(session_row["user_id"]) if session_row and session_row["user_id"] else "00000000-0000-0000-0000-000000000000"
        weight = float(session_row["weight_value"]) if session_row and session_row["weight_value"] else 0.0
        weight_unit = session_row["weight_unit"] if session_row and session_row["weight_unit"] else "lbs"
        weight_kg = float(session_row["weight_kg"]) if session_row and session_row["weight_kg"] else weight * 0.45359237

        await asyncio.sleep(0.5)
        await SSEManager().send_event(session_id, "upload_received", 10)
        
        # ------ Step 1: MediaPipe Landmark Framework ------
        await SSEManager().send_event(session_id, "mediapipe_started", 30)
        
        framework = LandmarkQualityFramework(model_path=MEDIAPIPE_MODEL)
        
        loop = asyncio.get_running_loop()
        # Run CPU-bound video processing in executor to prevent blocking
        final_json, quality_result, collage_b64, rep_frames_list = await loop.run_in_executor(
            None, framework.process_video_once, file_location, "goblet squat", weight_kg
        )

        # ------ Step 2: Quality Gate Validation ------
        if final_json is None or quality_result.get("event") != "mediapipe_complete":
            # Quality Gate Failed!
            error_code = quality_result.get("error_code", "quality_gate_failed")
            error_message = quality_result.get("message", "We couldn't analyze this video clearly.")
            detail_msg = quality_result.get("detail", "Please review the filming guidelines and try again.")
            
            print(f"Analysis {session_id} failed quality gate: {error_code}")
            
            async with db.connection() as conn:
                await conn.execute(
                    """
                    UPDATE form_analyses 
                    SET status = 'error', quality_gate_status = ? 
                    WHERE session_id = ?
                    """,
                    error_code, session_id
                )
            
            await SSEManager().send_event(
                session_id, 
                "error", 
                0, 
                status="error",
                error_code=error_code
            )
            return

        # Quality Gate Passed!
        q_status = quality_result.get("quality_gate_status", "GOOD")
        v_score = float(quality_result.get("video_score", 1.0))
        
        # Save raw MediaPipe angles and biomechanics metrics locally for user inspection
        mediapipe_raw_path = os.path.join(os.path.dirname(file_location), f"{session_id}_mediapipe_raw.json")
        try:
            with open(mediapipe_raw_path, "w") as f:
                json.dump(final_json, f, indent=2)
            print(f"Saved raw MediaPipe results locally to: {mediapipe_raw_path}")
        except Exception as save_err:
            print(f"Could not save raw MediaPipe results locally: {str(save_err)}")

        async with db.connection() as conn:
            await conn.execute(
                """
                UPDATE form_analyses 
                SET quality_gate_status = ?, video_score = ? 
                WHERE session_id = ?
                """,
                q_status, v_score, session_id
            )

        # ------ Step 3: Claude AI Analysis (Call 1) ------
        await SSEManager().send_event(session_id, "biomechanics_complete", 60)
        await SSEManager().send_event(session_id, "haiku_started", 65)
        
        llm_response = await loop.run_in_executor(
            None, run_llm_analysis, final_json, collage_b64
        )

        # ------ Step 4: Save Results & Finalize Session ------
        await SSEManager().send_event(session_id, "haiku_complete", 85)
        
        # Check if the response follows the new v3.0 dual-output structure
        if isinstance(llm_response, dict) and "db_output" in llm_response:
            db_output = llm_response.get("db_output", {})
            frontend_output = llm_response.get("frontend_output", {})
        else:
            db_output = llm_response if isinstance(llm_response, dict) else {}
            frontend_output = db_output

        analysis_id = str(uuid.uuid4())
        
        # Extract and cast scores safely
        overall_score = safe_int(db_output.get("overall_form_score") or db_output.get("overall_score"), 70)
        rom_score = safe_int(db_output.get("range_of_motion_score"), 70)
        posture_score = safe_int(db_output.get("posture_score"), 70)
        stability_score = safe_int(db_output.get("stability_score"), 70)
        movement_quality_score = safe_int(db_output.get("movement_quality_score"), 70)
        
        # Fallback to coaching block and standard parameters
        coaching_out = db_output.get("coaching_output") or db_output.get("coaching", {})
        parameters = coaching_out.get("parameters", {})
        
        # Ensure backward compatibility and double-key safety mappings inside parameters
        if "tempo" in parameters and "range_of_motion" not in parameters:
            parameters["range_of_motion"] = parameters["tempo"]
        elif "range_of_motion" in parameters and "tempo" not in parameters:
            parameters["tempo"] = parameters["range_of_motion"]
            
        # Ensure feedback key name mapping for posture / stability / ROM
        for param_key in ["posture", "stability", "movement_quality", "range_of_motion", "tempo"]:
            if param_key in parameters:
                p_block = parameters[param_key]
                if isinstance(p_block, dict):
                    if "correction" in p_block and "feedback" not in p_block:
                        p_block["feedback"] = p_block["correction"]
                    elif "feedback" in p_block and "correction" not in p_block:
                        p_block["correction"] = p_block["feedback"]
                    # Ensure score is an integer
                    if "score" in p_block:
                        p_block["score"] = safe_int(p_block["score"], 70)
        
        if not db_output.get("posture_score") and "posture" in parameters:
            posture_score = safe_int(parameters.get("posture", {}).get("score"), 70)
        if not db_output.get("stability_score") and "stability" in parameters:
            stability_score = safe_int(parameters.get("stability", {}).get("score"), 70)
        if not db_output.get("movement_quality_score") and "movement_quality" in parameters:
            movement_quality_score = safe_int(parameters.get("movement_quality", {}).get("score"), 70)
            
        tempo_score = safe_int(db_output.get("tempo_score") or parameters.get("tempo", {}).get("score") or parameters.get("range_of_motion", {}).get("score"), 70)
        progression_rec = db_output.get("progression_recommendation") or db_output.get("progression_recommendation", "hold")
        
        reps = db_output.get("rep_scores") or db_output.get("reps", [])
        # Ensure reps scores are integers
        if isinstance(reps, list):
            for r in reps:
                if isinstance(r, dict) and "form_score" in r:
                    r["form_score"] = safe_int(r["form_score"], 70)
                    
        rep_count = safe_int(db_output.get("rep_count") or len(reps), len(reps))
        
        worst_frame_idx = 0
        worse_rep_num = db_output.get("worst_rep_index") or db_output.get("worse_rep", 1)
        if worse_rep_num is not None:
            worst_frame_idx = max(0, safe_int(worse_rep_num, 1) - 1)

        # Advanced v3.0 diagnostic fields
        issue_tags = db_output.get("issue_tags", [])
        faults_detected = db_output.get("faults_detected", {})
        fault_confidence = db_output.get("fault_confidence", {})
        causal_chains = db_output.get("causal_chains", [])
        fault_detail = db_output.get("fault_detail", {})
        trends = db_output.get("trends", {})
        reasoning = db_output.get("reasoning", "")
        
        # Get camera view for camera_angle column
        camera_angle = final_json.get("session", {}).get("camera_view", "side")

        # Write results to database
        issues_only = db_output.get("issues", [])
        async with db.connection() as conn:
            await conn.execute(
                """
                INSERT INTO form_analysis_results (
                    analysis_id, session_id, user_id, overall_score, range_of_motion_score, 
                    posture_score, stability_score, movement_quality_score, tempo_score,
                    coaching_output, rep_scores, rep_count,
                    issues_json, raw_llm_response, chain_of_thought,
                    progression_recommendation, worst_frame_index, model_version, created_at,
                    issue_tags, faults_detected, fault_confidence, causal_chains, fault_detail, trends,
                    camera_angle
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                str(analysis_id), str(session_id), str(user_id), overall_score, rom_score,
                posture_score, stability_score, movement_quality_score, tempo_score,
                json.dumps(coaching_out), json.dumps(reps), rep_count,
                json.dumps(issues_only), json.dumps(db_output),
                reasoning, progression_rec, worst_frame_idx,
                HAIKU_MODEL_ENV, datetime.datetime.now(datetime.UTC).isoformat(),
                json.dumps(issue_tags), json.dumps(faults_detected), json.dumps(fault_confidence),
                json.dumps(causal_chains), json.dumps(fault_detail), json.dumps(trends),
                camera_angle
            )
            
            # Update session complete status and link analysis
            await conn.execute(
                """
                UPDATE form_analyses 
                SET status = 'completed', analysis_id = ? 
                WHERE session_id = ?
                """,
                str(analysis_id), str(session_id)
            )
            
            # Initialize a pending progression_results record for the 4-table comparative run (S2)
            await conn.execute(
                """
                INSERT INTO progression_results (
                    analysis_id, session_id, user_id, exercise_id, available
                ) VALUES (?, ?, ?, ?, 0)
                """,
                str(analysis_id), str(session_id), str(user_id), "goblet-squat"
            )

        # ------ Step 5: OpenCV Worst Frame Annotation ------
        worst_frame_url = None
        try:
            await SSEManager().send_event(session_id, "frame_ready", 90)
            local_results_dir = "./mediapipe_code/results"
            os.makedirs(local_results_dir, exist_ok=True)
            local_analysis_path = os.path.join(local_results_dir, f"worst_rep_{session_id}.json")
            
            # extract_worst_frame reads a JSON file with worse_rep
            with open(local_analysis_path, "w") as f:
                json.dump({"worse_rep": worse_rep_num or 1}, f)
            
            # Run worst frame generation
            await loop.run_in_executor(
                None, extract_worst_frame, file_location, local_analysis_path, rep_frames_list, f"worst_rep_{session_id}"
            )
            
            # Path to store
            worst_frame_url = f"/worst_frames/worst_rep_{session_id}.jpg"
            
            # Update database
            async with db.connection() as conn:
                await conn.execute(
                    "UPDATE form_analysis_results SET annotated_frame_urls = ? WHERE analysis_id = ?",
                    json.dumps([worst_frame_url]), str(analysis_id)
                )
            
            # Clean up temp analysis path
            if os.path.exists(local_analysis_path):
                os.remove(local_analysis_path)
                
        except Exception as cv_err:
            print(f"OpenCV Worst Frame generation failed: {str(cv_err)}")

        # ------ Step 6: Progression Comparison (Call 2) ------
        await SSEManager().send_event(session_id, "progression_ready", 95)
        
        async with db.connection() as conn:
            # Find the last 5 previously completed analyses for this user (ordered DESC, then sorted ASC by created_at)
            prev_rows = await conn.fetch(
                """
                SELECT * FROM (
                    SELECT r.analysis_id, r.overall_score, r.rep_scores, r.coaching_output,
                           r.range_of_motion_score, r.posture_score, r.stability_score,
                           r.movement_quality_score, r.tempo_score,
                           r.annotated_frame_urls, r.created_at,
                           a.weight_value, a.weight_unit, a.exercise_name
                    FROM form_analysis_results r
                    JOIN form_analyses a ON a.session_id = r.session_id
                    WHERE r.user_id = ? AND r.session_id != ?
                    ORDER BY r.created_at DESC
                    LIMIT 5
                ) sub
                ORDER BY created_at ASC
                """,
                user_id, session_id
            )
            
        if prev_rows:
            try:
                # Helper to safely parse dates from SQLite strings or PG datetimes
                def parse_date(date_val):
                    if not date_val:
                        return str(datetime.date.today())
                    if isinstance(date_val, (datetime.datetime, datetime.date)):
                        return str(date_val.date())
                    return str(date_val)[:10]

                # Compile comparison models
                current_session_info = {
                    "analysis_id": analysis_id,
                    "created_at": str(datetime.date.today()),
                    "exercise": "Goblet Squat",
                    "weight_value": weight,
                    "weight_unit": weight_unit,
                    "overall_score": overall_score,
                    "annotated_frame_url": worst_frame_url,
                    "reps": reps,
                    "coaching": coaching_out
                }
                
                history_list = []
                for row in prev_rows:
                    history_list.append({
                        "analysis_id": str(row["analysis_id"]),
                        "created_at": parse_date(row["created_at"]),
                        "exercise": row["exercise_name"] or "Goblet Squat",
                        "weight_value": float(row["weight_value"]) if row["weight_value"] else 0.0,
                        "weight_unit": row["weight_unit"] or "lbs",
                        "overall_score": float(row["overall_score"]),
                        "annotated_frame_url": row["annotated_frame_urls"][0] if row["annotated_frame_urls"] else None,
                        "reps": json.loads(row["rep_scores"]) if row["rep_scores"] else [],
                        "coaching": json.loads(row["coaching_output"]) if row["coaching_output"] else {}
                    })
                
                # Execute comparison comparison call (passes the full historical sequence)
                comparison_response = await loop.run_in_executor(
                    None, run_llm_comparison, current_session_info, history_list
                )
                
                # Save to database
                async with db.connection() as conn:
                    await conn.execute(
                        """
                        UPDATE progression_results 
                        SET progress_direction = ?, weight_recommendation = ?, progression_verdict = ?,
                            focus_this_week = ?, posture_trend = ?, stability_trend = ?,
                            range_of_motion_trend = ?, movement_quality_trend = ?, coaching_reasoning = ?,
                            available = 1, error = NULL, created_at = ?
                        WHERE analysis_id = ?
                        """,
                        comparison_response.get("progress_direction"),
                        comparison_response.get("weight_recommendation"),
                        comparison_response.get("progression_verdict"),
                        comparison_response.get("focus_this_week"),
                        comparison_response.get("posture_trend"),
                        comparison_response.get("stability_trend"),
                        comparison_response.get("range_of_motion_trend"),
                        comparison_response.get("movement_quality_trend"),
                        comparison_response.get("coaching_reasoning"),
                        datetime.datetime.now(datetime.UTC).isoformat(),
                        str(analysis_id)
                    )
            except Exception as comp_err:
                print(f"Progression comparison failed: {str(comp_err)}")
                async with db.connection() as conn:
                    await conn.execute(
                        "UPDATE progression_results SET available = 0, error = ? WHERE analysis_id = ?",
                        str(comp_err), str(analysis_id)
                    )
        else:
            # First workout session
            first_progression_placeholder = {
                "analysis_id": analysis_id,
                "user_id": user_id,
                "session_id": session_id,
                "exercise_id": "goblet-squat",
                "progress_direction": "maintain",
                "weight_recommendation": f"Maintain at {weight}kg" if weight_unit == "kg" else f"Maintain at {weight}lbs",
                "progression_verdict": "First session complete. Complete another set to unlock progression cues.",
                "focus_this_week": "Establish baseline squat depth and posture stability.",
                "posture_trend": "Establishing baseline posture.",
                "stability_trend": "Establishing baseline stability.",
                "range_of_motion_trend": "Establishing baseline range of motion.",
                "movement_quality_trend": "Establishing baseline movement quality.",
                "coaching_reasoning": "First session. No historical data is available to determine comparative trends."
            }
            async with db.connection() as conn:
                await conn.execute(
                    """
                    UPDATE progression_results 
                    SET progress_direction = ?, weight_recommendation = ?, progression_verdict = ?,
                        focus_this_week = ?, posture_trend = ?, stability_trend = ?,
                        range_of_motion_trend = ?, movement_quality_trend = ?, coaching_reasoning = ?,
                        available = 1, error = NULL
                    WHERE analysis_id = ?
                    """,
                    first_progression_placeholder["progress_direction"],
                    first_progression_placeholder["weight_recommendation"],
                    first_progression_placeholder["progression_verdict"],
                    first_progression_placeholder["focus_this_week"],
                    first_progression_placeholder["posture_trend"],
                    first_progression_placeholder["stability_trend"],
                    first_progression_placeholder["range_of_motion_trend"],
                    first_progression_placeholder["movement_quality_trend"],
                    first_progression_placeholder["coaching_reasoning"],
                    str(analysis_id)
                )

        # ------ Step 7: Re-encode Annotated Video with H.264 & Original Audio ------
        try:
            temp_annotated_path = file_location + ".annotated_temp.mp4"
            if os.path.exists(temp_annotated_path):
                await SSEManager().send_event(session_id, "Rendering and compressing annotated video overlay...", 98)
                print(f"Re-encoding annotated video for session {session_id}...")
                
                # We will output to a temp file and then overwrite the original file_location
                output_reencoded_path = file_location + ".annotated.mp4"
                
                # ffmpeg command: take temp_annotated_path and file_location (original), map video from 0 and audio from 1 (optional)
                # compress with x264, use yuv420p for maximum device compatibility!
                import subprocess
                cmd = [
                    "ffmpeg", "-y",
                    "-i", temp_annotated_path,
                    "-i", file_location,
                    "-map", "0:v",
                    "-map", "1:a?",
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-shortest",
                    output_reencoded_path
                ]
                
                # Run the command in executor to prevent blocking the event loop
                def run_ffmpeg():
                    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
                await loop.run_in_executor(None, run_ffmpeg)
                
                # Overwrite original video with the annotated H.264 version
                if os.path.exists(output_reencoded_path):
                    os.replace(output_reencoded_path, file_location)
                    print(f"Successfully annotated and overwrote original video: {file_location}")
                
                # Clean up the raw temp file if it still exists
                if os.path.exists(temp_annotated_path):
                    try:
                        os.remove(temp_annotated_path)
                    except:
                        pass
        except Exception as video_err:
            print(f"Failed to re-encode annotated video: {str(video_err)}")

        await SSEManager().send_event(session_id, "analysis_ready", 100, status="complete")
        print(f"Analysis {session_id} completed successfully.")
        
    except Exception as e:
        print(f"Analysis {session_id} failed with critical exception: {str(e)}")
        import traceback
        traceback.print_exc()
        
        try:
            async with db.connection() as conn:
                await conn.execute(
                    "UPDATE form_analyses SET status = 'error' WHERE session_id = ?",
                    session_id
                )
        except:
            pass
            
        await SSEManager().send_event(session_id, "error", 0, status="error", error_code="SYSTEM_ERROR")