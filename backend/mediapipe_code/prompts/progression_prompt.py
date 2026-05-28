import json

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

def build_comparison_prompt(current_json: dict, previous_json: dict) -> str:
    return f"""
      {COMPARISON_COACHING_PROMPT}

      CURRENT SESSION:
      {json.dumps(current_json, indent=2, ensure_ascii=False)}

      PREVIOUS SESSION:
      {json.dumps(previous_json, indent=2, ensure_ascii=False)}
      """
