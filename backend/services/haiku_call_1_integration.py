import json
import logging
import os
import re
import time
from typing import Any, Optional
from anthropic import Anthropic
from services.prompt_builder import load_md_files

logger = logging.getLogger(__name__)

# User-facing prompt constants from local coaching_prompt.py
MOVEMENT_CONTEXT = """
## Movement Context

GOBLET SQUAT
- Weight held at chest height
- Torso upright
- Slight forward lean acceptable
- Hip crease at or below knee = sufficient depth
- Excessive lean suggests a mobility or bracing issue
"""

ANGLE_CONVENTION = """
## Angle Convention
MediaPipe interior angles: knee_angle/hip_angle DECREASE as flexion increases.
  Lower knee_angle = deeper squat. Lower hip_angle = more hip flexion.
All other angles (back_angle, valgus, foot_angle) compare directly.
When comparing visual to JSON for knee/hip: convert (MediaPipe = 180° − flexion), ±10° tolerance.
"""

ANALYSIS_RULES = """
## Analysis Rules
- Walk-in/walk-out: if first or last rep duration ≥ 3× median, include in rep_count
  but exclude entirely from all analysis.
- Valgus: ignore valgus_flag boolean. Use knee_valgus_distance per rep.
  Flag knee_valgus only if ≥ 50% of valid reps have distance < 0.22.
- For every issue: state how many valid reps show it (X of Y), which rep numbers,
  trend direction and magnitude, and actual measured values.
- Bilateral check: compare foot_turnout_left vs foot_turnout_right — flag if gap > 10°.
- Causal chain: if multiple issues co-exist, identify root cause and chain them.
"""

ANALYSIS_SCHEMA = """
## Output schema:

{
  "reasoning": "<string. Fill this FIRST. 1-2 sentences, under 200 characters. Identify key root cause and scoring rationale.>",
  "overall_score": <integer 0-100>,
  "annotated_frame_url": "<string or null>",
  "worse_rep": <integer or null>,
  "critical_problem": "<hip_angle|knee_angle|back_angle_value|knee_valgus_distance|null>",
  "coaching": {
    "summary_paragraph": "<max 200 chars. MAXIMUM 1-2 sentences. Second person. Keep it very punchy and direct. NO angles.>",
    "feedback": "<string. One plain-language in-set cue for the very next set. NO angle numbers.>",
    "next_session_focus": ["<string: specific drill/warmup/mobility for next training day>", "<string>"],
    "parameters": {
      "posture": {
        "score": <integer 0-100>,
        "affirmation": "<string or null. Plain language. NO angles.>",
        "observation": "<string or null. Describe what the body is doing wrong and why it matters. NO angles.>",
        "correction": "<string or null. Concrete actionable cue. NO angles.>"
      },
      "stability": {
        "score": <integer 0-100>,
        "affirmation": "<string or null>",
        "observation": "<string or null>",
        "correction": "<string or null>"
      },
      "movement_quality": {
        "score": <integer 0-100>,
        "affirmation": "<string or null>",
        "observation": "<string or null>",
        "correction": "<string or null>"
      },
      "range_of_motion": {
        "score": <integer 0-100>,
        "affirmation": "<string or null>",
        "observation": "<string or null>",
        "correction": "<string or null>"
      }
    }
  },
  "reps": [
    {
      "rep_number": <integer>,
      "form_score": <integer 0-100>
    }
  ],
  "issues": [
    {
      "id": "<string>",
      "title": "<string: e.g. Knee Valgus, Forward Trunk Lean, Depth Fault>",
      "severity": "<string: High|Medium|Low>",
      "detail": "<string: brief, plain-language description of when and where the fault occurred without any raw degrees/angles/metrics (e.g., 'Knees caved slightly inward during the ascent of rep 2')>"
    }
  ],
  "issue_tags": ["<string: vocabulary: insufficient_depth, knee_valgus, excessive_forward_lean>"],
  "faults_detected": {
    "insufficient_depth": <boolean>,
    "knee_valgus": <boolean>,
    "excessive_forward_lean": <boolean>
  },
  "fault_confidence": {
    "insufficient_depth": <float 0.0-1.0>,
    "knee_valgus": <float 0.0-1.0>,
    "excessive_forward_lean": <float 0.0-1.0>
  },
  "causal_chains": [
    {
      "root_cause": "<string: root cause, e.g. ankle_restriction, glute_weakness, load_deficit, hip_tightness, upper_back_stiffness>",
      "symptoms": ["<string: symptoms caved from root cause, e.g. knee_valgus, insufficient_depth, excessive_forward_lean>"]
    }
  ],
  "fault_detail": {
    "insufficient_depth": {
      "present": <boolean>,
      "reps_affected": "<string: e.g. '0 of 8'>",
      "which_reps": [<integer: rep numbers affected>],
      "severity": "<string: e.g. 'knee_angle_min 88° — within range' or deviation details>",
      "trend": "<string: stable | improving | worsening (+X/rep) or similar progression metric>",
      "source": "<string: json | visual | both>"
    },
    "knee_valgus": {
      "present": <boolean>,
      "reps_affected": "<string: e.g. '6 of 8'>",
      "which_reps": [<integer: rep numbers affected>],
      "severity": "<string: actual measured valgus values, e.g. 'knee_valgus_distance 0.18–0.22'>",
      "valgus_phase": "<string or null: EARLY | MID | LATE — phase in the rep it occurs>",
      "trend": "<string: stable | improving | worsening (+X/rep)>",
      "source": "<string: json | visual | both>"
    },
    "excessive_forward_lean": {
      "present": <boolean>,
      "reps_affected": "<string: e.g. '0 of 8'>",
      "which_reps": [<integer: rep numbers affected>],
      "severity": "<string: brief explanation with max back angle, e.g. 'back_angle_max 38° — within acceptable range'>",
      "breakdown_timing": "<string or null: when in descent lean begins — null if not present>",
      "trend": "<string: stable | improving | worsening (+X/rep)>",
      "source": "<string: json | visual | both>"
    }
  },
  "trends": {
    "depth": "<string: stable|improving|worsening>",
    "posture": "<string: stable|improving|worsening>",
    "stability": "<string: stable|improving|worsening>"
  },
  "rep_trend": {
    "observation": "<string: plain-language observation of form trend over the set>",
    "recommendation": "<string: actionable recommendation based on the trend>"
  }
}
"""

def build_analysis_prompt(mediapipe_json: dict, visual_context: str) -> str:
    consolidated = mediapipe_json.get("consolidated", {})
    mq = consolidated.get("movement_quality", {})
    posture = consolidated.get("posture", {})
    stability = consolidated.get("stability_data", {})
    session = mediapipe_json.get("session", {})

    fault_flags = ""
    try:
        fault_flags = f"""
 [FAULT FLAGS (biomechanics script — treat as starting point)]
insufficient_depth:     {"insufficient" in str(mq.get("depth_distribution", ""))}  |  knee_angle_min: {mq.get("knee_angle_min_mean", "N/A")}
excessive_forward_lean: {"WARNING" in str(posture.get("status_distribution", ""))}  |  torso_lean_max: {posture.get("back_angle_max_mean", "N/A")}
ankle_dorsiflexion:     {mq.get("ankle_dorsiflexion_mean", "N/A")}  (target >= 20)
knee_valgus (session):  {stability.get("valgus_phase_distribution", "N/A")}  |  mean_distance: {stability.get("knee_valgus_mean", "N/A")}  |  reps: {stability.get("valgus_flag_reps", "N/A")}
"""
    except Exception:
        fault_flags = "\n [FAULT FLAGS] Could not extract fault flags from consolidated data.\n"

    return f"""{visual_context}
      {ANGLE_CONVENTION}
      {MOVEMENT_CONTEXT}

 [CURRENT SESSION]
Exercise:    {session.get("exercise", "Goblet Squat")}
Rep count:   {session.get("rep_count", "N/A")}
Camera view: {session.get("camera_view", "N/A")}

 [BIOMECHANICS DATA]
{json.dumps(mediapipe_json, indent=2)}
      {fault_flags}
      {ANALYSIS_RULES}

 [TASK]
Fill the `reasoning` field before scoring.
Return ONLY the JSON — no preamble, no text outside the JSON.
Remember: NO raw angle numbers in any user-facing field. Only in `reasoning`.
      {ANALYSIS_SCHEMA}"""

class HaikuCall1:
    """
    Haiku Call 1: Real-time exercise form analysis via Claude Haiku.
    Loads exercise-specific coaching reference from disk (Markdown)
    and calls Haiku with session biomechanics data + composite image.
    """
    def __init__(self, exercise: str = "goblet_squat", api_key: Optional[str] = None):
        self.client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
        self.exercise = exercise
        self.model = os.getenv("HAIKU_MODEL", "claude-haiku-4-5-20251001")

        # Load and cache system prompt from markdown file
        logger.info(f"Loading system prompt for exercise: {exercise}")
        self.system_prompt = load_md_files(exercise)
        logger.info(f"System prompt cached ({len(self.system_prompt)} bytes)")

    def analyze_form(
        self,
        biomechanics_json: dict[str, Any],
        collage_b64: str,
        max_tokens: int = 4096,
        debug: bool = False
    ) -> dict[str, Any]:
        """
        Analyze form using the cached system prompt and composite image.
        """
        logger.info(f"Analyzing form for goblet squat using Claude Haiku...")
        
        user_prompt = build_analysis_prompt(biomechanics_json, "Attached: composite grid of frames from original squat video.")
        schema_reminder = (
            "\n\nCRITICAL: Return ONLY a valid JSON object matching the schema above. "
            "No markdown fences, no extra text outside the JSON. "
            "Fill `reasoning` first, then scores, then coaching. "
            "All user-facing text must use plain body-position language — NO raw angle numbers."
        )

        start_time = time.time()
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=self.system_prompt,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": collage_b64}},
                {"type": "text", "text": user_prompt + schema_reminder},
            ]}],
        )

        if response.stop_reason == "max_tokens":
            raise ValueError("Haiku Call 1 truncated — increase max_tokens")

        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"Haiku Call 1 completed in {duration_ms:.1f}ms")

        response_text = response.content[0].text.strip()
        
        # Clean response string of code fences
        cleaned = re.sub(r"```json", "", response_text)
        cleaned = cleaned.replace("```", "").strip()
        
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No valid JSON found in model response: {response_text}")

        json_str = cleaned[start:end+1]
        coaching_output = json.loads(json_str)
        
        return coaching_output
