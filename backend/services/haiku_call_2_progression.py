from anthropic import AsyncAnthropic
from db.database import db
from utils.sse_manager import sse_manager

import json
import os
import traceback
import asyncio
import random
import re

# =========================================================
# ANTHROPIC CLIENT
# =========================================================

client = AsyncAnthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

# -------------------------------------------------
# GLOBAL RATE LIMIT CONTROL
# -------------------------------------------------
HAIKU_CALL_2_SEMAPHORE = asyncio.Semaphore(1)  # increase to 2 later if stable


def safe_json_load(raw: str):
    """Robust JSON parser for Claude output."""
    raw = raw.strip()
    raw = re.sub(r"^```json", "", raw)
    raw = re.sub(r"^```", "", raw)
    raw = re.sub(r"```$", "", raw)
    raw = raw.strip()
    return json.loads(raw)


async def call_haiku_with_retry(payload, retries=3):
    """Prevents transient 429 failures from killing pipeline."""
    for attempt in range(retries):
        try:
            return await client.messages.create(**payload)
        except Exception as e:
            wait = (2 ** attempt) + random.uniform(0, 0.5)
            print(f"[Haiku Call 2] retry {attempt+1} in {wait:.2f}s due to {e}")
            await asyncio.sleep(wait)
    raise RuntimeError("Haiku Call 2 failed after retries")


# =========================================================
# GLOBAL RATE LIMIT CONTROL
# =========================================================
# Prevents multiple Haiku Call 2 jobs from hammering TPM
# Increase later if Anthropic quota allows it
# =========================================================

HAIKU_CALL_2_SEMAPHORE = asyncio.Semaphore(1)


# =========================================================
# JSON PARSER
# =========================================================

def safe_json_load(raw: str):
    """
    Robust JSON parser for Claude output.
    Removes markdown fences if Claude adds them.
    """

    raw = raw.strip()

    raw = re.sub(r"^```json", "", raw)
    raw = re.sub(r"^```", "", raw)
    raw = re.sub(r"```$", "", raw)

    raw = raw.strip()

    return json.loads(raw)


# =========================================================
# RETRY WRAPPER
# =========================================================

async def call_haiku_with_retry(payload, retries=3):
    """
    Prevents transient 429 failures from killing pipeline.
    """

    for attempt in range(retries):
        try:
            return await client.messages.create(**payload)

        except Exception as e:
            wait = (2 ** attempt) + random.uniform(0, 0.5)

            print(
                f"[Haiku Call 2] retry {attempt+1} "
                f"in {wait:.2f}s due to {e}"
            )

            await asyncio.sleep(wait)

    raise RuntimeError("Haiku Call 2 failed after retries")


# =========================================================
# MAIN JOB
# =========================================================

async def run_haiku_call_2(analysis_id: str):
    async with HAIKU_CALL_2_SEMAPHORE:

        # Small delay to let TPM window clear after Haiku Call 1
        await asyncio.sleep(10)

        print(f"[Haiku Call 2] START analysis_id={analysis_id}")

        try:
            session_id = None
            user_id = None
            exercise_id = "goblet_squat"

            # -----------------------------------------
            # CURRENT SESSION
            # Fetch all 4 parameter scores + overall + weight
            # -----------------------------------------
            current = await db.fetch_one(
                """
                SELECT
                    far.session_id,
                    far.analysis_id,
                    far.user_id,
                    far.exercise_id,
                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.tempo_score,
                    far.movement_quality_score,
                    far.rep_scores,
                    far.weight_kg_normalised,
                    fa.created_at
                FROM form_analysis_results far
                JOIN form_analyses fa
                    ON far.analysis_id = fa.analysis_id
                WHERE far.analysis_id = :analysis_id
                """,
                values={"analysis_id": analysis_id}
            )

            if not current:
                print("[Haiku Call 2] No current session found — skipping")
                return

            print("[Haiku Call 2] Current session loaded")
            session_id = current["session_id"]
            user_id = current["user_id"]

            # -----------------------------------------
            # PREVIOUS SESSION
            # Same user_id + exercise_id, immediately prior by created_at
            # Fetch coaching_output so we can extract next_session_focus
            # -----------------------------------------
            exercise_id = current["exercise_id"] if current else "goblet_squat"
            previous = await db.fetch_one(
                """
                SELECT
                    far.session_id,
                    far.analysis_id,
                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.tempo_score,
                    far.movement_quality_score,
                    far.rep_scores,
                    far.coaching_output,
                    far.weight_kg_normalised,
                    fa.created_at
                FROM form_analysis_results far
                JOIN form_analyses fa
                    ON far.analysis_id = fa.analysis_id
                WHERE far.user_id = :user_id
                  AND far.exercise_id = :exercise_id
                  AND far.analysis_id != :analysis_id
                ORDER BY fa.created_at DESC
                LIMIT 1
                """,
                values={
                    "user_id": current["user_id"],
                    "exercise_id": exercise_id,
                    "analysis_id": analysis_id
                }
            )

            print("[Haiku Call 2] Previous session loaded")

            # -----------------------------------------
            # NO HISTORY — write available=false, emit SSE, exit cleanly
            # -----------------------------------------
            if not previous:
                await db.execute(
                    """
                    INSERT OR IGNORE INTO progression_results (
                        analysis_id,
                        session_id,
                        user_id,
                        exercise_id,
                        available
                    )
                    VALUES (:analysis_id, :session_id, :user_id, :exercise_id, :available)
                    """,
                    values={
                        "analysis_id": analysis_id,
                        "session_id":  session_id or "00000000-0000-0000-0000-000000000000",
                        "user_id":     user_id,
                        "exercise_id": exercise_id,
                        "available":   False
                    }
                )

                await sse_manager.send_event(
                    analysis_id,
                    "haiku_call_2_no_history",
                    100,
                    "complete"
                )
                await sse_manager.send_event(
                    analysis_id,
                    "progression_ready",
                    100,
                    "complete",
                    {"progression_output": None}
                )
                print("[Haiku Call 2] No previous session — emitted no_history and progression_ready SSE")
                return

            # -----------------------------------------
            # EXTRACT next_session_focus FROM PREVIOUS COACHING OUTPUT
            # Used as "We've Told You" context in the prompt
            # -----------------------------------------
            previous_coaching = {}
            if previous["coaching_output"]:
                if isinstance(previous["coaching_output"], str):
                    previous_coaching = json.loads(previous["coaching_output"])
                else:
                    previous_coaching = previous["coaching_output"]

            previous_focus = previous_coaching["next_session_focus"] if previous_coaching else []
            # -----------------------------------------
            # PROMPT
            # Includes both sessions' 4 parameter scores + overall + weight
            # + previous next_session_focus for "We've Told You" context
            # Weight progression reasoning is inline — no external MD files
            # -----------------------------------------
            prompt = f"""You are a strength progression coach.

Compare these two training sessions and return a JSON coaching comparison.

CURRENT SESSION
Overall Form Score: {current['overall_form_score']}
Posture Score: {current['posture_score']}
Stability Score: {current['stability_score']}
Range of Motion Score: {current['tempo_score']}
Movement Quality Score: {current['movement_quality_score']}
Weight Used (kg): {current['weight_kg_normalised']}
Rep Scores: {current['rep_scores']}


PREVIOUS SESSION
Overall Form Score: {previous['overall_form_score']}
Posture Score: {previous['posture_score']}
Stability Score: {previous['stability_score']}
Range of Motion Score: {previous['tempo_score']}
Movement Quality Score: {previous['movement_quality_score']}
Weight Used (kg): {previous['weight_kg_normalised']}
Rep Scores: {previous['rep_scores']}


WHAT YOU TOLD THEM TO FOCUS ON LAST SESSION
{json.dumps(previous_focus, indent=2)}

WEIGHT PROGRESSION RULES
- hold: overall score < 75, or score dropped vs previous session
- increase: overall score >= 80 AND score is stable or improving
- decrease: overall score dropped significantly (8+ points vs previous)
- target_weight_kg: suggest next logical increment (typically +2kg for increase, -2kg for decrease, same for hold)

Return ONLY valid JSON matching this exact schema:
{{
  "progression_verdict": "2-3 sentence comparison of current vs previous session",
  "progress_direction": "up | down | stable",

  "weight_recommendation": {{
    "action": "hold | increase | decrease",
    "target_weight_kg": 0,
    "reason": "1 sentence explanation"
  }},
  "focus_this_week": "Single actionable recommendation for next training day",
  "posture_trend": "1 sentence describing posture change vs previous session",
  "stability_trend": "1 sentence describing stability change vs previous session",
  "range_of_motion_trend": "1 sentence describing ROM change vs previous session",
  "movement_quality_trend": "1 sentence describing movement quality change vs previous session"
}}"""

            print("[Haiku Call 2] Calling Haiku...")

            # -----------------------------------------
            # HAIKU CALL (RATE SAFE + RETRY)
            # -----------------------------------------
            response = await call_haiku_with_retry({
                "model": os.getenv("HAIKU_MODEL", "claude-3-5-haiku-20241022"),
                "max_tokens": 800,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })

            result = safe_json_load(response.content[0].text)

            print("[Haiku Call 2] Response received")

            # -----------------------------------------
            # VALIDATION
            # -----------------------------------------
            if result["weight_recommendation"]["action"] not in ["hold", "increase", "decrease"]:
                raise ValueError(f"Invalid weight action: {result['weight_recommendation']['action']}")

            if result["progress_direction"] not in ["up", "down", "stable"]:
                raise ValueError(f"Invalid progress_direction: {result['progress_direction']}")

            # -----------------------------------------
            # SAVE RESULT TO progression_results
            # -----------------------------------------
            await db.execute(
                """
                INSERT OR REPLACE INTO progression_results (
                    user_id,
                    session_id,
                    analysis_id,
                    exercise_id,
                    available,
                    progress_direction,
                    progression_verdict,
                    weight_recommendation,
                    focus_this_week,
                    posture_trend,
                    stability_trend,
                    range_of_motion_trend,
                    movement_quality_trend
                )
                VALUES (                    
                    :user_id,
                    :session_id,
                    :analysis_id,
                    :exercise_id,
                    :available,
                    :progress_direction,
                    :progression_verdict,
                    :weight_recommendation,
                    :focus_this_week,
                    :posture_trend,
                    :stability_trend,
                    :range_of_motion_trend,
                    :movement_quality_trend
                )
                """,
                values={
                    "user_id":               user_id,
                    "session_id":            session_id or "00000000-0000-0000-0000-000000000000",
                    "analysis_id":           analysis_id,
                    "exercise_id":           exercise_id,
                    "available":             True,
                    "progress_direction":    result["progress_direction"],
                    "progression_verdict":   result["progression_verdict"],
                    "weight_recommendation": json.dumps(result["weight_recommendation"]),
                    "focus_this_week":       result["focus_this_week"],
                    "posture_trend":         result["posture_trend"],
                    "stability_trend":       result["stability_trend"],
                    "range_of_motion_trend": result["range_of_motion_trend"],
                    "movement_quality_trend":result["movement_quality_trend"]
                }
            )

            print("[Haiku Call 2] Saved to progression_results")

            # -----------------------------------------
            # SSE COMPLETE — emit haiku_call_2_complete with full payload
            # -----------------------------------------
            await sse_manager.send_event(
                analysis_id,
                "progression_ready",
                100,
                "complete",
                {"progression_output": result}
            )

            print("[Haiku Call 2] SUCCESS")

        except Exception as e:
            print(f"[Haiku Call 2] FAILED: {e}")
            traceback.print_exc()

            # Save fallback to progression_results so the database state is consistent
            try:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO progression_results (
                        analysis_id,
                        session_id,
                        user_id,
                        exercise_id,
                        available,
                        error
                    )
                    VALUES (:analysis_id, :session_id, :user_id, :exercise_id, :available, :error)
                    """,
                    values={
                        "analysis_id": analysis_id,
                        "session_id":  session_id or "00000000-0000-0000-0000-000000000000",
                        "user_id":     user_id or "00000000-0000-0000-0000-000000000000",
                        "exercise_id": exercise_id or "goblet_squat",
                        "available":   False,
                        "error":       str(e)
                    }
                )
                print("[Haiku Call 2] Saved fallback error state to database")
            except Exception as db_err:
                print(f"[Haiku Call 2] Failed to save fallback error state to database: {db_err}")

            # Emit progression_ready SSE to prevent frontend hang
            try:
                await sse_manager.send_event(
                    analysis_id,
                    "progression_ready",
                    100,
                    "complete",
                    {"progression_output": None}
                )
                print("[Haiku Call 2] Emitted fallback progression_ready SSE event")
            except Exception as sse_err:
                print(f"[Haiku Call 2] Failed to emit fallback progression_ready SSE event: {sse_err}")
