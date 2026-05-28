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
    
    # Reconcile user_id. Fallback to Demo User UUID if it doesn't exist in live database.
    try:
        user_uuid = uuid.UUID(str(user_id).strip())
    except:
        user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
        
    user_id_str = str(user_uuid)
    
    try:
        async with db.connection() as conn:
            row = await conn.fetchrow(
                "SELECT user_id FROM public.user_profiles WHERE user_id = $1", 
                user_uuid
            )
            if not row:
                print(f"[upload] WARNING: user_id '{user_id_str}' not found in user_profiles. Falling back to Demo User.")
                user_id_str = "00000000-0000-0000-0000-000000000000"
                user_uuid = uuid.UUID(user_id_str)
    except Exception as check_err:
        print(f"[upload] Database check error: {str(check_err)}. Defaulting to Demo User.")
        user_id_str = "00000000-0000-0000-0000-000000000000"
        user_uuid = uuid.UUID(user_id_str)

    # Insert session into form_analyses
    try:
        async with db.connection() as conn:
            await conn.execute(
                """
                INSERT INTO public.form_analyses (
                    session_id, user_id, exercise_name, weight_value, weight_unit, weight_kg, video_url, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                uuid.UUID(session_id_val), user_uuid, exercise_val, weight_val, weight_unit_val, weight_kg, file_location, "queued"
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
            # Query session data joined with results
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
                    r.haiku_call_2_status, r.haiku_call_2_output,
                    r.range_of_motion_score, r.issue_tags, r.faults_detected,
                    r.fault_confidence, r.causal_chains, r.fault_detail, r.trends
                FROM public.form_analyses a
                LEFT JOIN public.form_analysis_results r ON a.analysis_id = r.analysis_id
                WHERE a.session_id = $1
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
            data["haiku_call_2_output"] = safe_json_load(data.get("haiku_call_2_output"))
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
                FROM public.form_analyses a
                LEFT JOIN public.form_analysis_results r ON a.analysis_id = r.analysis_id
                WHERE a.user_id = $1 AND a.status = 'completed'
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
    if "error" in data:
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
    issues_json = data.get("issues_json") or {}
    if isinstance(issues_json, str):
        try:
            issues_json = json.loads(issues_json)
        except:
            issues_json = {}
    
    issues_list = issues_json.get("issues", [])
    biomechanics["issues"] = issues_list
    
    # Return payload to match LoadingPage contract
    return {
        "analysis_id": data.get("analysis_id") or analysis_id,
        "exercise_id": data.get("exercise_name") or "goblet-squat",
        "weight_value": data.get("weight_value"),
        "weight_unit": data.get("weight_unit"),
        "status": data.get("status"),
        "biomechanics_json": json.dumps(biomechanics)
    }