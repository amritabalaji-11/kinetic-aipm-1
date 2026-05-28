import json
import uuid
import os
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Form
from services.analysis_pipeline import run_analysis
from utils.database import db

router = APIRouter()

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    exercise: str = Form(None),
    exercise_id: str = Form(None),
    weight: float = Form(None),
    weight_value: float = Form(None),
    weight_unit: str = Form("lbs"),
    user_id: str = Form("00000000-0000-0000-0000-000000000000"),
    session_id: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Map new frontend parameter names gracefully
    exercise_val = exercise_id if exercise_id else (exercise if exercise else "goblet-squat")
    weight_val = weight_value if weight_value is not None else (weight if weight is not None else 0.0)
    session_id_val = session_id if session_id else str(uuid.uuid4())
    
    # Save the uploaded file to disk
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, f"{session_id_val}_{file.filename}")
    with open(file_location, "wb") as f:
        f.write(await file.read())
        
    weight_unit_val = str(weight_unit).lower().strip()
    # Handle lbs normalization mapping singular or plural
    if weight_unit_val in ("kg", "kgs"):
        weight_unit_val = "kg"
        weight_kg = weight_val
    else:
        weight_unit_val = "lbs"
        weight_kg = weight_val * 0.45359237
    
    # Reconcile user_id. Automatically register new profiles to enable local history/timeline.
    try:
        user_uuid = uuid.UUID(str(user_id).strip())
    except:
        user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
        
    user_id_str = str(user_uuid)
    
    try:
        async with db.connection() as conn:
            row = await conn.fetchrow(
                "SELECT user_id FROM user_profiles WHERE user_id = ?",
                user_id_str
            )
            if not row:
                print(f"[upload] Registering new user profile in database for user_id: {user_id_str}")
                await conn.execute(
                    """
                    INSERT INTO user_profiles (profile_id, user_id, display_name, experience_level)
                    VALUES (?, ?, ?, ?)
                    """,
                    user_id_str, user_id_str, "Local Athlete", "Intermediate"
                )
    except Exception as check_err:
        print(f"[upload] Database check/registration error: {str(check_err)}. Defaulting to Demo User.")
        user_id_str = "00000000-0000-0000-0000-000000000000"
        user_uuid = uuid.UUID(user_id_str)

    # Insert session into form_analyses
    try:
        async with db.connection() as conn:
            await conn.execute(
                """
                INSERT INTO form_analyses (
                    session_id, user_id, exercise_name, weight_value, weight_unit, weight_kg, video_url, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                str(session_id_val), str(user_uuid), exercise_val, weight_val, weight_unit_val, weight_kg, file_location, "queued"
            )
    except Exception as e:
        print(f"Database error during upload insert: {str(e)}")
    
    # Start background processing of the file
    background_tasks.add_task(run_analysis, session_id_val, file_location)
    
    return {
        "status": "file uploaded successfully",
        "session_id": session_id_val,
        "analysis_id": session_id_val,
        "message": "Processing started in the background. Use the session_id to track progress via SSE."
    }


@router.get("/results/{session_id}")
async def get_results(session_id: str):
    try:
        async with db.connection() as conn:
            # Query session data joined with results and progression tables
            row = await conn.fetchrow(
                """
                SELECT 
                    a.session_id, a.user_id, a.weight_value, a.weight_unit, a.video_url, 
                    a.status, a.quality_gate_status, a.video_score, a.created_at,
                    a.exercise_name,
                    r.analysis_id, r.overall_score, r.posture_score, r.stability_score, 
                    r.movement_quality_score, r.tempo_score, r.coaching_output, 
                    r.rep_scores, r.rep_count, r.issues_json, r.chain_of_thought, 
                    r.progression_recommendation, r.worst_frame_index, r.annotated_frame_urls,
                    r.range_of_motion_score, r.issue_tags, r.faults_detected,
                    r.fault_confidence, r.causal_chains, r.fault_detail, r.trends,
                    p.progress_direction, p.weight_recommendation, p.progression_verdict,
                    p.focus_this_week, p.posture_trend, p.stability_trend,
                    p.range_of_motion_trend, p.movement_quality_trend, p.coaching_reasoning,
                    p.available, p.error AS progression_error
                FROM form_analyses a
                LEFT JOIN form_analysis_results r ON a.analysis_id = r.analysis_id
                LEFT JOIN progression_results p ON a.analysis_id = p.analysis_id
                WHERE a.session_id = ?
                """,
                session_id
            )
            
            if not row:
                return {"error": "Session not found"}
                
            data = dict(row)
            
            # Helper to safely parse json
            def safe_json_load(val):
                if not val:
                    return None
                if isinstance(val, (dict, list)):
                    return val
                try:
                    return json.loads(val)
                except:
                    return val
 
            # Parse JSONB fields
            data["coaching_output"] = safe_json_load(data.get("coaching_output"))
            data["rep_scores"] = safe_json_load(data.get("rep_scores"))
            data["issues_json"] = safe_json_load(data.get("issues_json"))
            
            # Dynamically reconstruct progression_results from progression table columns
            if data.get("available") is not None or data.get("progression_verdict") is not None:
                prog_dict = {
                    "analysis_id": data.get("analysis_id"),
                    "user_id": data.get("user_id"),
                    "session_id": data.get("session_id"),
                    "exercise_id": data.get("exercise_name") or "goblet-squat",
                    "progress_direction": data.get("progress_direction"),
                    "weight_recommendation": data.get("weight_recommendation"),
                    "progression_verdict": data.get("progression_verdict"),
                    "focus_this_week": data.get("focus_this_week"),
                    "posture_trend": data.get("posture_trend"),
                    "stability_trend": data.get("stability_trend"),
                    "range_of_motion_trend": data.get("range_of_motion_trend"),
                    "movement_quality_trend": data.get("movement_quality_trend"),
                    "coaching_reasoning": data.get("coaching_reasoning")
                }
                data["progression_results"] = prog_dict
                data["haiku_call_2_outputs"] = prog_dict
                data["haiku_call_2_output"] = prog_dict
            else:
                data["progression_results"] = None
                data["haiku_call_2_outputs"] = None
                data["haiku_call_2_output"] = None
                
            # Parse S2 status flags dynamically for payload delivery
            data["available"] = data.get("available", 0)
            data["error"] = data.get("progression_error")
            
            data["faults_detected"] = safe_json_load(data.get("faults_detected"))
            data["fault_confidence"] = safe_json_load(data.get("fault_confidence"))
            data["causal_chains"] = safe_json_load(data.get("causal_chains"))
            data["fault_detail"] = safe_json_load(data.get("fault_detail"))
            data["trends"] = safe_json_load(data.get("trends"))
            
            # Format annotated frame url
            if data.get("annotated_frame_urls"):
                data["annotated_frame_url"] = data["annotated_frame_urls"][0]
            else:
                data["annotated_frame_url"] = None
                
            return data
    except Exception as e:
        return {"error": f"Failed to fetch results: {str(e)}"}

@router.get("/history/{user_id}")
async def get_history(user_id: str):
    try:
        async with db.connection() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    a.session_id, a.user_id, a.weight_value, a.weight_unit, a.video_url, 
                    a.status, a.quality_gate_status, a.video_score, a.created_at,
                    r.analysis_id, r.overall_score, r.rep_count
                FROM form_analyses a
                LEFT JOIN form_analysis_results r ON a.analysis_id = r.analysis_id
                WHERE a.user_id = ? AND a.status = 'completed'
                ORDER BY a.created_at DESC
                """,
                user_id
            )
            return [dict(row) for row in rows]
    except Exception as e:
        return {"error": f"Failed to fetch history: {str(e)}"}


@router.get("/analysis/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    # Fetch flat dictionary using standard results getter
    data = await get_results(analysis_id)
    # Only bail on a real error string — data["error"] is always present (set to None for no-error)
    if data.get("error") and not data.get("overall_score"):
        return data
        
    coaching_output = data.get("coaching_output") or {}
    rep_scores = data.get("rep_scores") or []
    
    # Convert flat list or structured scores into exact frontend contract
    reps_list = []
    for idx, r in enumerate(rep_scores):
        if isinstance(r, dict):
            reps_list.append({
                "rep_number": r.get("rep_number") or (idx + 1),
                "form_score": r.get("form_score") or r.get("score") or 0
            })
        else:
            reps_list.append({
                "rep_number": idx + 1,
                "form_score": r
            })
            
    # Build nested biomechanics object
    biomechanics = {
        "summary": {
            "overall_form_score": int(data.get("overall_score") or 70),
            "posture_score": int(data.get("posture_score") or 70),
            "stability_score": int(data.get("stability_score") or 70),
            "movement_quality_score": int(data.get("movement_quality_score") or 70),
            "tempo_score": int(data.get("tempo_score") or 70)
        },
        "coaching": coaching_output,
        "reps": reps_list,
        "issues": []
    }
    
    # Parse and append any raw issue tags if present
    issues_json = data.get("issues_json") or []
    if isinstance(issues_json, str):
        try:
            issues_json = json.loads(issues_json)
        except:
            issues_json = []
    
    # issues_json may be a flat list OR {"issues": [...]}
    if isinstance(issues_json, dict):
        issues_list = issues_json.get("issues", [])
    elif isinstance(issues_json, list):
        issues_list = issues_json
    else:
        issues_list = []
    biomechanics["issues"] = issues_list
    
    # Return payload to match LoadingPage contract
    return {
        "analysis_id": data.get("analysis_id") or analysis_id,
        "session_id": data.get("session_id") or analysis_id,
        "exercise_id": data.get("exercise_name") or "goblet-squat",
        "exercise_name": data.get("exercise_name"),
        "weight_value": data.get("weight_value"),
        "weight_unit": data.get("weight_unit"),
        "status": data.get("status"),
        "video_url": data.get("video_url"),
        "annotated_frame_url": data.get("annotated_frame_url"),
        "biomechanics_json": json.dumps(biomechanics),
        # Pass progression data directly so ResultsPage can read it
        "progression_results": data.get("progression_results"),
        "haiku_call_2_output": data.get("haiku_call_2_output"),
        # v3.0 diagnostic fields
        "issue_tags": data.get("issue_tags"),
        "faults_detected": data.get("faults_detected"),
        "fault_confidence": data.get("fault_confidence"),
        "causal_chains": data.get("causal_chains"),
        "fault_detail": data.get("fault_detail"),
        "trends": data.get("trends"),
    }