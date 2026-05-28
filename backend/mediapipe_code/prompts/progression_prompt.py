import json

COMPARISON_SYSTEM = """
You are an elite biomechanics and strength-training coach specialized in analyzing long-term workout progression, form trends, and giving concrete weight loading decisions.

Analyze the CURRENT session against their history of PAST sessions (ordered chronologically from oldest to newest) to make a solid coaching progression verdict and trend analysis.

Rules:
- Return ONLY valid JSON.
- Do not use markdown fences.
- Use second-person language ("you", "your") for client-facing fields (verdict, focus, trends).
- Use professional, objective, data-driven language for coaching_reasoning.
- Follow all character length constraints strictly.
"""

def build_comparison_prompt(current_json: dict, history_list: list) -> str:
    history_str = json.dumps(history_list, indent=2, ensure_ascii=False)
    
    # Extract identifiers to instruct echoing
    analysis_id = current_json.get("analysis_id", "")
    user_id = current_json.get("user_id", "")
    session_id = current_json.get("session_id", "")
    exercise_id = current_json.get("exercise", "goblet-squat")
    
    return f"""
Your job is to compare the current session against the historical sessions and produce this exact JSON shape. Echo the identifiers exactly:

{{
  "analysis_id": "{analysis_id}",
  "user_id": "{user_id}",
  "session_id": "{session_id}",
  "exercise_id": "{exercise_id}",
  "progress_direction": "increase | maintain | decrease",
  "weight_recommendation": "Maintain at Xkg | Increase to Xkg | Drop to Xkg",
  "progression_verdict": "<max 120 chars — coach voice, specific, one measurable target, using second person>",
  "focus_this_week": "<max 120 chars — direct physical cue for next session, using second person>",
  "posture_trend": "<max 80 chars — 3-session observation only, using second person>",
  "stability_trend": "<max 80 chars — 3-session observation only, using second person>",
  "range_of_motion_trend": "<max 80 chars — 3-session observation only, using second person>",
  "movement_quality_trend": "<max 80 chars — 3-session observation only, using second person>",
  "coaching_reasoning": "<coaching reasoning: data observed + physical principle applied + progression rule used — no limit>"
}}

Rules:
- progression_verdict: maximum 120 characters, highly specific, measurable target.
- focus_this_week: maximum 120 characters, high-impact physical cue.
- posture_trend, stability_trend, range_of_motion_trend, movement_quality_trend: maximum 80 characters each, direct observation over the history.
- progress_direction: must be one of "increase", "maintain", or "decrease".
- weight_recommendation: must be formatted exactly as "Increase to Xkg", "Maintain at Xkg", or "Drop to Xkg" where X is the recommended target weight.
- Return ONLY the raw JSON object.

CURRENT SESSION:
{json.dumps(current_json, indent=2, ensure_ascii=False)}

HISTORICAL SESSIONS (CHRONOLOGICAL ORDER - OLDEST TO NEWEST):
{history_str}
"""
