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

COACHING_SCHEMA = """
## Output — Coaching Response
{
  "total_score": <0-100 — overall form score. Start from 100 and deduct based on faults found:
                  significant fault = -20 to -25, moderate = -10 to -15, minor = -5.
                  If no faults, score should reflect technique quality (consistency, tempo etc).>,

  "verdict": "<2-4 sentences. Second person. Overall assessment of their form this session.
               Lead with the most important finding. If a causal chain exists, name it.>",

  "positive_observations": [
    {
      "observation": "<specific — name the rep numbers, how many reps, actual metric value>",
      "category": "<Posture | Stability | Movement Quality | Range of Motion>"
    }
  ],
  // maximum 3 items, most impactful first

  "critical_observations": [
    {
      "observation": "<specific — rep numbers, how many reps, measured value, worsening trend if any>",
      "category": "<Posture | Stability | Movement Quality | Range of Motion>",
      "type": "<root_cause | symptom>",
      "caused_by": "<name of root cause if this is a symptom, else null>"
    }
  ],
  // maximum 3 items, ordered by severity — most severe first
  // if causal chain exists: root_cause item must come before its symptoms

  "recommendation": "<If causal chain: state it clearly (e.g. fix ankle mobility first — it is causing the lean and the depth deficit). Then state 1-2 specific things to do in the NEXT workout: named drill, reps, sets.>",

  "rep_trend": {
    "observation": "<2-3 sentences on how form evolved from rep 1 to the last rep. Reference specific parameters that changed — did lean worsen, did depth improve, did tempo slow? Be specific.>",
    "recommendation": "<1 sentence on the single most important thing to focus on next session based on this trend.>"
  }
}
"""


def build_single_llm_prompt(mediapipe_json: dict, visual_context: str) -> str:
    return f"""{visual_context}
{ANGLE_CONVENTION}
{MOVEMENT_CONTEXT}
## Biomechanics JSON
{json.dumps(mediapipe_json, indent=2)}
{ANALYSIS_RULES}

# Athlete Profile

- Recreational lifter
- Approximately 6 months to 2 years of training experience
- Understands basic gym terminology
- May NOT understand biomechanical jargon
- Prefer simple explanations over technical terminology

# Your Tasks

You must perform TWO tasks:

1. Analyse squat biomechanics
2. Generate concise coaching feedback

Base ALL conclusions strictly on:
- biomechanics JSON
- visible movement evidence
- trend data
- rep-by-rep consistency

Do NOT invent faults, asymmetries, or improvements.

# Analysis Requirements

Determine:
- rep count
- valid reps
- movement quality trends
- bilateral asymmetries
- causal chains
- root causes vs symptoms
- whether faults worsen, improve, or remain stable

Fault detection must be conservative:
- only mark faults true if evidence is strong
- confidence should reflect certainty

# Coaching Requirements

Write feedback like an experienced gym coach.

Style:
- concise
- practical
- direct
- easy to understand

Avoid unexplained technical jargon.

BAD:
- "limited ankle dorsiflexion causes dynamic valgus"

GOOD:
- "your knees collapse inward as you descend"

Translate issues into actions:
- what to change
- what to focus on
- what to practice next session

Prefer coaching language like:
- "Keep your chest taller"
- "Push your knees out earlier"
- "Slow the lowering phase"
- "Pause briefly at the bottom"
- "Brace before descending"

# Writing Constraints

- verdict: max 80 words
- recommendation: max 120 words
- rep_trend.observation: max 60 words
- observations should be concise and information-dense
- avoid repeating the same coaching point multiple times

# Scoring Rules

total_score starts at 100.

Deduct:
- 20-25 for major faults
- 10-15 for moderate faults
- 5 for minor faults

Consistency, control, and stable technique can improve the score.

# Critical Observations Rules

- maximum 3
- order by severity
- root cause first
- symptoms after root cause

# Positive Observations Rules

Only include genuinely supported positives.
Do not invent praise.

# Output Requirements

Return ONLY valid JSON.

At the TOP of the JSON include:

"faults_detected": {{
  "insufficient_depth": <bool>,
  "knee_valgus": <bool>,
  "excessive_forward_lean": <bool>
}}

"confidence": {{
  "insufficient_depth": <0.0-1.0>,
  "knee_valgus": <0.0-1.0>,
  "excessive_forward_lean": <0.0-1.0>
}}

"evidence_source":
"<json|visual|both>"

Then include the coaching schema below.

{COACHING_SCHEMA}
"""