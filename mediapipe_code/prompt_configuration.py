import json


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

COACHING_SYSTEM = """
You are an experienced strength and conditioning coach writing feedback for a fitness app.

Audience:
- Recreational lifter with approximately 6 months to 2 years of gym experience
- Avoid technical jargon unless immediately explained in simple language
- Use clear, practical coaching language

Coaching style:
- Action-oriented
- Supportive but direct
- Translate movement problems into concrete actions
- Prefer phrasing like:
  "Do X", "Focus on Y", "Try Z next session"

Output rules:
- Respond ONLY with valid JSON
- No markdown
- No prose outside the JSON
"""

ANALYSIS_SCHEMA = """
Output schema:

{
  "overall_score": <integer 0-100>,
  "progression_recommendation": "<hold|progress|drop|null>",
  "annotated_frame_url": "<string or null>",
  "worse_rep": <integer or null>,
  "critical_problem": "<hip_angle|knee_angle|back_angle_value|knee_valgus_distance|null>",
  "coaching": {
    "summary_paragraph": "<max 400 chars. 2-4 sentences. Second person. Start with the most important finding. Mention the strongest pattern in the session and any worsening trend. Explain causal chains clearly when present.>",
    "parameters": {
      "posture": {
        "score": <integer 0-100>,
        "affirmation": "<string or null>",
        "observation": "<string or null>",
        "correction": "<string or null>"
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
      "tempo": {
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
  ]
}

Rules:

- overall_score is an integer from 0 to 100.
- overall_score should reflect the whole session.
- Start from 100 and deduct based on faults:
  - significant fault: -20 to -25
  - moderate fault: -10 to -15
  - minor fault: -5
- If there are no faults, score based on technique quality, consistency, and tempo.

- progression_recommendation:
  - "progress" only if technique is stable and no major faults remain.
  - "hold" if the athlete is usable as-is but still has issues to clean up.
  - "drop" if form breaks down significantly or faults are likely to worsen with load.
  - return null if the input does not support a recommendation.

- quality_gate_status:
  - return "GOOD" or "ACCEPTABLE" only if supported by the input.
  - otherwise return null.
  - if ACCEPTABLE, it should be treated as a soft warning only.

- annotated_frame_url:
  - return the URL of the worst representative frame if available.
  - otherwise return null.

- worse_rep:
  - Return the rep number of the worst rep by score.
  - Use the "reps" list to extract the rep number.
  - Return null if there is no critical_problem.

- critical_problem:
  - Select the single main issue that best explains the largest quality degradation across the full session.
  - Allowed values: "hip_angle", "knee_angle", "back_angle_value", "knee_valgus_distance", or null.
  - If reps are not reaching parallel or sufficient depth and camera_view is "front" or "angles", prioritize "hip_angle".
  - If reps are not reaching parallel or sufficient depth and camera_view is "side_right" or "side_left", prioritize "knee_angle" for depth evaluation.
  - Prefer the issue that appears most consistently and has the strongest impact on scoring or movement quality.
  - Return null if there is not enough evidence to identify a dominant problem.

- coaching.summary_paragraph:
  - maximum 400 characters.
  - 2-4 sentences.
  - second person.
  - lead with the most important finding.
  - mention rep numbers and measured values when possible.
  - mention worsening trends when present.
  - if there is a causal chain, state it clearly.

- coaching.parameters:
  - Each category must always be present: posture, stability, movement_quality, tempo.
  - Each parameter score is specific to that dimension only.
  - If a parameter is good, put a short positive affirmation in "affirmation" and keep "observation" null.
  - If a parameter has a fault, put the specific issue in "observation" and a concrete cue or drill in "correction".
  - Keep corrections short, actionable, and specific.
  - Prefer the single most important issue per category.
  - If a category is not relevant, still include it with a score and null fields.
  - "correction" should be null only when there is nothing meaningful to correct.  

- reps:
  - Return one object per rep in the session.
  - rep_number must match the provided rep sequence.
  - form_score must be an integer from 0 to 100.
  - scores should generally reflect the quality trend across the session.
  - later reps may score lower if form worsens.

- Do not invent measurements.
- If the source data does not include a metric, do not mention it as a fact.
- Keep the response JSON parsable.
- Do not wrap the response in code fences.
"""


COMPARISON_COACHING_PROMPT = """
Your job is to compare the current session against the previous session and produce this exact shape:

{
  "comparison_coaching": {
    "summary_paragraph": "<1-2 sentences. Mention overall improvement or decline, the score delta, the weight change if relevant, and the strongest pattern across posture, stability, movement quality, and tempo. Be specific and concise.>",
    "parameters": {
      "posture": {
        "observation_action": "<one short sentence comparing current vs previous posture, then give one actionable cue>"
      },
      "stability": {
        "observation_action": "<one short sentence comparing current vs previous stability, then give one actionable cue>"
      },
      "movement_quality": {
        "observation_action": "<one short sentence comparing current vs previous movement quality, then give one actionable cue>"
      },
      "tempo": {
        "observation_action": "<one short sentence comparing current vs previous tempo, then give one actionable cue>"
      }
    }
  }
}

Rules:
- Compare current against previous, not against an absolute ideal only.
- Use overall_score and parameter scores to infer changes.
- Mention the score difference explicitly when possible, for example: "Your form improved 7 points since your last session."
- Mention the weight change when relevant, for example: "at 20kg vs 15kg."
- If one parameter clearly improved, say so.
- If one parameter worsened, say so.
- If a metric is not available, infer cautiously from the provided scores and rep_scores.
- Keep each observation_action short, specific, and actionable.
- Use second person ("your", "you").
- Keep the summary paragraph natural and coach-like.
- Return only the JSON object.
"""

COMPARISON_SYSTEM = """
You are an elite biomechanics and strength-training coach specialized in comparing workout sessions.

Compare a CURRENT session against a PREVIOUS session using only the provided data.

Rules:
- Return ONLY valid JSON.
- Do not use markdown.
- Do not invent metrics or faults.
- Use second-person language ("you", "your").
- Be concise, practical, and coach-like.
- Focus on meaningful changes in:
  - posture
  - stability
  - movement quality
  - tempo
- Mention improvements and regressions clearly.
- Mention score and weight changes when relevant.
- Prioritize fatigue trends and technique consistency across reps.
- Give short, actionable coaching cues.
- Avoid generic praise or filler text.
"""


def build_analysis_prompt(mediapipe_json: dict, visual_context: str) -> str:
    return f"""{visual_context}
      {ANGLE_CONVENTION}
      {MOVEMENT_CONTEXT}
      ## Biomechanics JSON
      {json.dumps(mediapipe_json, indent=2)}
      {ANALYSIS_RULES}
      {ANALYSIS_SCHEMA}"""


def build_comparison_prompt(current_json: dict, previous_json: dict) -> str:
    return f"""
      {COMPARISON_COACHING_PROMPT}

      CURRENT SESSION:
      {json.dumps(current_json, indent=2, ensure_ascii=False)}

      PREVIOUS SESSION:
      {json.dumps(previous_json, indent=2, ensure_ascii=False)}
      """