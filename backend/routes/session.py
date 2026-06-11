import json
from fastapi import APIRouter, HTTPException
from db.database import db

router = APIRouter()


@router.get("/results/{session_id}")
async def get_results(session_id: str):
    try:
        async with db.connection() as conn:
            # Query session data joined with results and progression tables
            rows = await db.fetch_all(

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


