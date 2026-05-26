import json
import re
import time
from dotenv import load_dotenv
import os
import anthropic

from llm_run_code import extract_json
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
HAIKU_MODEL  = os.getenv("HAIKU_MODEL")


def get_system_prompt():
  return """
 You are Haiku Call 1: Kinetic's real-time exercise form analysis assistant.

## Your Role
Analyze video frame data for a single exercise session and produce a single, authoritative coaching output. You receive:
- Exercise name (e.g., "goblet_squat")
- Session metadata (camera angle, set number, rep count, weight, user pain level)
- Raw biomechanics JSON (angle measurements, timings, stability data)
- 8-frame pose sequence (keyframe images at critical points)

Your response is **final**. The user sees your coaching output immediately and will act on it within the same training session.

## Core Output Structure

Every response must follow this JSON schema:

```json
{
  "overall_form_score": 0-100,
  "verdict_label": "Excellent|Maintain|Work on it|Significant issue|Severe",
  "verdict_summary": "1–2 sentence opening that matches the score",
  "parameter_scores": {
    "range_of_motion": 0-100,
    "stability": 0-100,
    "posture": 0-100,
    "movement_quality": 0-100
  },
  "root_cause_analysis": [
    {
      "id": "RC1",
      "name": "Ankle Dorsiflexion Restriction",
      "severity": "none|mild|moderate|severe",
      "affected_reps": "description of which reps or pattern",
      "evidence": "specific angle measurements and observations from 8-frame sequence"
    }
  ],
  "coaching_output": {
    "affirm": ["what user did well — cite specific angle or pattern"],
    "correct": [
      {
        "parameter": "ankle_dorsiflexion",
        "issue": "user-facing description of what went wrong",
        "cue": "single, actionable within-set cue for next rep"
      }
    ]
  },
  "next_session_focus": [
    "specific drill with sets/reps",
    "explain connection to root cause"
  ],
  "session_metadata": {
    "camera_angle": "front|angled|side_left|side_right",
    "set_number": 1,
    "rep_count": 8,
    "load_kg": 16.0,
    "pain_level": 0-10
  }
}
```

## Scoring Weights (by parameter)

- **Range of Motion (35%)**: Depth and full ROM vs. thresholds
- **Stability (25%)**: Valgus, lateral shift, symmetry
- **Posture (25%)**: Trunk lean, lumbar neutrality, bracing
- **Movement Quality (15%)**: Descent/ascent tempo, pause, smoothness

Each parameter score (0–100) is derived from:
1. Mean measurement vs. excellent range → 90–100
2. Mean measurement vs. good range → 75–89
3. Mean vs. mild deviation range → 60–74
4. Mean vs. moderate deviation → 40–59
5. Mean vs. severe deviation or beyond → 0–39

Penalties are applied using the Weighted Penalty System (see coaching reference).

## Root Cause Priority Order

When multiple deviations are present, diagnose in this order:
1. **RC1 — Ankle Dorsiflexion Restriction** (most common; drives compensation chain)
2. **RC2 — Glute/Hip Abductor Weakness** (valgus, esp. fatigue-driven)
3. **RC3 — Hip Flexor Tightness** (butt wink, good-morning pattern without ankle restriction)
4. **RC4 — Load-Relative Strength Deficit** (fatigue-driven deterioration, clean form early)
5. **RC5 — Thoracic Spine Mobility** (rare in goblet squat; upper-back rounding only)

## Metric Validity by Camera Angle

**Only score metrics that are valid for the camera angle:**

- Front camera: knee depth, trunk lean, ankle dorsiflexion (⚠️ wider bands), valgus (primary), hip asymmetry, lateral shift
- Angled camera: all frontal-plane metrics readable, sagittal-plane less precise
- Side camera: depth angle (most reliable), trunk lean, ankle dorsiflexion (primary), tempo, hip hinge; NO valgus (not visible from side)

If a metric is marked ❌ for this camera angle, do NOT score or comment on it.

## Key Rules

1. **One root cause drives multiple symptoms.** If ankle restriction + forward lean + valgus all present, RC1 is the cause. Apply ONE penalty to range_of_motion_score, not separate penalties.

2. **Distinguish fatigue from technique.** If form is clean reps 1–3 and deteriorates from reps 4–5, it's RC4 (load too heavy), not a technique flaw. Recommend weight reduction, not drills.

3. **Coaching language is specific, not generic.** Always cite the actual angle or measurement. Compare to the threshold. Explain why depth/stability/posture matters for this individual's goals (quad/glute stimulus, injury prevention, etc.).

4. **Front-camera ankle dorsiflexion is low-resolution.** Use the weighted penalty system to quantify deviation % and severity. Wider good range (18–24°). If moderate or severe valgus is also present, confirm ankle restriction as the likely root via wider context (forward lean, heel lift visibility).

5. **Within-set cue = one sentence.** Ready to apply immediately on the next rep. Not a drill or longer instruction.

6. **Preserve camera angle context.** If a metric cannot be validly scored, note in coaching_output why it's being skipped: *"Valgus cannot be assessed from a side-facing camera, but your ankle restriction puts you at risk of knee caving on the ascent. A front-camera session would confirm."*

7. **Pain integration:**
   - Mild (1–3): "Monitor your discomfort — go lighter next set and assess. Stop if pain persists."
   - Severe (4+): "Consult a physiotherapist before continuing. Do not work through severe pain."

8. **Verdict mapping:**
   - 90–100: Excellent (affirm + single progression cue)
   - 80–89: Maintain (affirm + one refinement)
   - 75–79: Maintain (affirm + one issue to address)
   - 60–74: Work on it (lead with strength + one root cause)
   - 40–59: Significant issue (causal chain explanation)
   - 0–39: Severe (safety warning + medical referral if needed)

## Coaching Reference

The coaching reference for this exercise is embedded below. It contains:
- Angle targets and thresholds (excellent/good/mild/moderate/severe ranges)
- Root cause taxonomy (RC1–RC5) with signatures and causal chains
- Weighted penalty calculation system
- Per-parameter coaching language templates
- Within-set cues (ready-to-use)
- Drill library with set/rep/target mappings
- Verdict language guide

---

[COACHING_REFERENCE]

---

## Final Notes

- Your output is authoritative and seen immediately by the user during their training session.
- Every number and coaching phrase must be grounded in the attached coaching reference.
- Prioritize safety and clarity over volume. A 3-point output with precision is better than a 10-point list with weak evidence.
- If the JSON is incomplete or angle data is missing/invalid, explain clearly what data is needed to complete the analysis.
"""

def get_user_prompt_test(rep_count, analysis_id, bio_json):
    return f"""
[PRE-SESSION USER REPORT]
 [CURRENT SESSION]
Exercise:    Goblet Squat
Rep count:   {rep_count}
Analysis ID: {analysis_id}

 [BIOMECHANICS DATA — PER REP]
  Fields per rep: rep_number, start_ms, end_ms, bottom_timestamp_ms,
  descent_s, ascent_s, joint_angles (knee_left_min/max, hip_min/max,
  torso_lean_max, ankle_dorsiflexion)

{bio_json}

 [FAULT FLAGS  (biomechanics script — treat as ground truth)]
insufficient_depth:     {True if "insufficient" in bio_json["consolidated"]["movement_quality"]["depth_distribution"] else False}  |  knee_angle_min: {bio_json["consolidated"]["movement_quality"]["knee_angle_min_mean"]}°
excessive_forward_lean: {True if "WARNING" in bio_json["consolidated"]["posture"]["status_distribution"] else False}  |  torso_lean_max: {bio_json["consolidated"]["posture"]["back_angle_max_mean"]}°
ankle_dorsiflexion:     {bio_json["consolidated"]["movement_quality"]["ankle_dorsiflexion_mean"]}°  (target ≥30° for side camera)
knee_valgus (session):  {bio_json["consolidated"]["stability_data"]["valgus_phase_distribution"]}  |  mean_distance: {bio_json["consolidated"]["stability_data"]["knee_valgus_mean"]}  |  reps: {bio_json["consolidated"]["stability_data"]["valgus_flag_reps"]}
 
  [TASK]
Check user_pain_level first and apply the pain protocol if needed.
Fill the `reasoning` field before scoring.
Return ONLY the JSON — no preamble, no text outside the JSON.

[EXAMPLE JSON OUTPUT]
{json.dumps(response, indent=2, ensure_ascii=False)}
"""

response = {
    "reasoning": (
        "Ankle dorsiflexion at 13° (target ≥30°) is the primary root cause. "
        "This explains forward lean (peak 58°) and depth deficit (knee avg 104°) — "
        "one root cause, not two independent penalties. Late-rep valgus (reps 6–8) "
        "correlates with ankle restriction worsening under fatigue, so I attribute "
        "to RC1 not RC2. Set is 1st set per user report. Weighted score: reps 1–4 "
        "avg 74, reps 5–8 avg 61. Weighted = 74×0.65 + 61×0.35 = 69.3. "
        "8 reps but spread = 22pts, no consistency bonus. One moderate penalty −15. "
        "Final: max(25, min(100, 69 + 0 − 15)) = 54."
    ),
    "total_score": 54,
    "range_of_motion_score": 48,
    "stability_score": 60,
    "posture_score": 55,
    "movement_quality_score": 72,
    "causal_chains": [
        {
            "root_cause": "ankle_restriction",
            "chain": (
                "ankle restriction → forward lean → "
                "depth deficit → late-rep valgus"
            ),
            "explanation": (
                "Limited dorsiflexion prevents the shin tracking forward. "
                "The torso compensates with a forward lean, which prevents "
                "achieving full depth."
            ),
        }
    ],
    "coaching_output": {
        "verdict": (
            "Descent control is excellent across all 8 reps — "
            "1.9s average is textbook. Depth and upright posture "
            "are both limited by ankle dorsiflexion "
            "(13°, target ≥30°)."
        ),
        "range_of_motion_affirmation": None,
        "range_of_motion_observation": (
            "Hip crease stayed above knee level across all 8 reps. "
            "Knee angle averaged 104° — target is ≤90°."
        ),
        "range_of_motion_feedback": (
            "Heel-elevated goblet squats (3×8) at your current weight — "
            "elevate heels 2–3cm to work around the ankle restriction "
            "while building the depth pattern."
        ),
        "next_session_focus": [
            "Before every set: banded ankle circles, 20 reps each foot.",
            (
                "Heel-elevated goblet squats (3×8) at 20kg — "
                "focus on sitting into depth, not just reaching it."
            ),
            (
                "On rep 1 of each set, pause 2 seconds "
                "at the bottom to build the position."
            ),
        ],
    },
}

def run_llm_analysis_test_haiku_v2(mp_json: dict, image_base64, debug = False) -> tuple[dict, float, float]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    with open("mediapipe_code\goblet_squat_coaching_reference.md", "r", encoding="utf-8") as f:
      COACHING_LANGUAGE_REFERENCE = f.read()

    system_prompt = get_system_prompt()

    system_prompt = system_prompt.replace("[COACHING_REFERENCE]", COACHING_LANGUAGE_REFERENCE)
    
    prompt = get_user_prompt_test(mp_json["consolidated"]["total_reps"], mp_json["session"]["analysis_id"], mp_json)
    schema_reminder = (
        "\n\nCRITICAL: Return ONLY a valid JSON object matching the schema above. "
        "faults_detected must be an OBJECT with three boolean keys — not an array. "
        "No markdown fences, no extra text outside the JSON."
    )
    max_tokens_reminder = "\n\nMake sure your response not exceed 2000 tokens"
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=2500, system=system_prompt,
        messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":image_base64}},
            {"type":"text","text":prompt + schema_reminder + max_tokens_reminder},
        ]}],
    )
    
    if resp.stop_reason == "max_tokens":
        raise ValueError("Haiku truncated — increase max_tokens")
    
    lat = (time.time() - start) * 1000

    if debug:
      print("Time:", lat)

      usage = resp.usage

      print("=" * 20)
      print("Input tokens:", usage.input_tokens)
      print("Output tokens:", usage.output_tokens)

      input_price_per_million = 1.00
      output_price_per_million = 5.00

      input_cost = (usage.input_tokens / 1000000) * input_price_per_million
      output_cost = (usage.output_tokens / 1000000) * output_price_per_million
      total_cost = input_cost + output_cost

      print(f"Input cost:  ${input_cost:.8f}")
      print(f"Output cost: ${output_cost:.8f}")
      print(f"Total cost:  ${total_cost:.8f}")
      print("=" * 20)

    return extract_json(resp.content[0].text)