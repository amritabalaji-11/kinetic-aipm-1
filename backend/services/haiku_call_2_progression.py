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

        # -------------------------------------------------
        # Small delay so Haiku Call 1 clears TPM window
        # -------------------------------------------------
        await asyncio.sleep(10)

        print(f"[Haiku Call 2] START analysis_id={analysis_id}")

        try:

            # =====================================================
            # JOB STATUS → RUNNING
            # =====================================================

            await db.execute(
                """
                UPDATE form_analysis_results
                SET
                    job_status = :job_status,
                    started_at = CURRENT_TIMESTAMP
                WHERE analysis_id = :analysis_id
                """,
                values={
                    "job_status": "running",
                    "analysis_id": analysis_id
                }
            )

            print("[Haiku Call 2] job_status=running")

            # =====================================================
            # CURRENT SESSION
            # =====================================================

            current = await db.fetch_one(
                """
                SELECT
                    far.analysis_id,
                    far.session_id,
                    far.user_id,
                    far.exercise_id,

                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.tempo_score,
                    far.movement_quality_score,

                    far.rep_scores,
                    far.coaching_output,

                    fa.weight_kg_normalised,
                    fa.created_at

                FROM form_analysis_results far

                JOIN form_analyses fa
                    ON far.analysis_id = fa.analysis_id

                WHERE far.analysis_id = :analysis_id
                """,
                values={"analysis_id": analysis_id}
            )

            if not current:

                print("[Haiku Call 2] No current session found")

                await db.execute(
                    """
                    UPDATE form_analysis_results
                    SET
                        job_status = :job_status,
                        haiku_call_2_error = :error,
                        completed_at = CURRENT_TIMESTAMP
                    WHERE analysis_id = :analysis_id
                    """,
                    values={
                        "job_status": "failed",
                        "error": "Current session not found",
                        "analysis_id": analysis_id
                    }
                )

                return

            print("[Haiku Call 2] Current session loaded")

            # =====================================================
            # PREVIOUS SESSION
            # =====================================================

            previous = await db.fetch_one(
                """
                SELECT
                    far.analysis_id,

                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.tempo_score,
                    far.movement_quality_score,

                    far.rep_scores,
                    far.coaching_output,

                    fa.weight_kg_normalised,
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
                    "exercise_id": current["exercise_id"],
                    "analysis_id": analysis_id
                }
            )

            print("[Haiku Call 2] Previous session query complete")

            # =====================================================
            # NO HISTORY
            # =====================================================

            if not previous:

                print("[Haiku Call 2] No previous session")

                # ---------------------------------------------
                # progression_results
                # ---------------------------------------------

                await db.execute(
                    """
                    INSERT INTO progression_results (
                        analysis_id,
                        user_id,
                        session_id,
                        exercise_id,

                        available,
                        error_code,

                        computed_at
                    )
                    VALUES (
                        :analysis_id,
                        :user_id,
                        :session_id,
                        :exercise_id,

                        :available,
                        :error_code,

                        CURRENT_TIMESTAMP
                    )
                    """,
                    values={
                        "analysis_id": current["analysis_id"],
                        "user_id": current["user_id"],
                        "session_id": current["session_id"],
                        "exercise_id": current["exercise_id"],

                        "available": False,
                        "error_code": "NO_PREVIOUS_SESSION"
                    }
                )

                # ---------------------------------------------
                # form_analysis_results
                # ---------------------------------------------

                no_history_payload = {
                    "available": False,
                    "message": (
                        "Complete a second session "
                        "to unlock progression insights."
                    )
                }

                await db.execute(
                    """
                    UPDATE form_analysis_results
                    SET
                        job_status = :job_status,
                        completed_at = CURRENT_TIMESTAMP,
                        haiku_call_2_output = :output
                    WHERE analysis_id = :analysis_id
                    """,
                    values={
                        "job_status": "complete",
                        "output": json.dumps(no_history_payload),
                        "analysis_id": analysis_id
                    }
                )

                # ---------------------------------------------
                # SSE
                # ---------------------------------------------

                await sse_manager.send_event(
                    analysis_id,
                    "haiku_call_2_no_history",
                    90,
                    "in_progress",
                    no_history_payload
                )

                print("[Haiku Call 2] no_history SSE emitted")

                return

            # =====================================================
            # EXTRACT PREVIOUS FOCUS
            # =====================================================

            previous_coaching = {}

            if previous["coaching_output"]:

                if isinstance(previous["coaching_output"], str):
                    previous_coaching = json.loads(
                        previous["coaching_output"]
                    )

                else:
                    previous_coaching = previous["coaching_output"]

            previous_focus = previous_coaching.get(
                "next_session_focus",
                []
            )

            # =====================================================
            # PROMPT
            # =====================================================

            prompt = f"""
You are a strength progression coach.

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

- hold:
  overall score < 75,
  OR score dropped vs previous session

- increase:
  overall score >= 80
  AND score stable or improving

- decrease:
  overall score dropped significantly
  (8+ points vs previous)

- target_weight_kg:
  +2kg for increase,
  -2kg for decrease,
  same for hold


Return ONLY valid JSON matching this schema:

{{
  "progression_verdict": "2-3 sentence comparison",

  "progress_direction": "up | down | stable",

  "weight_recommendation": {{
    "action": "hold | increase | decrease",
    "target_weight_kg": 0,
    "reason": "1 sentence explanation"
  }},

  "focus_this_week":
    "Single actionable recommendation",

  "posture_trend":
    "1 sentence posture trend",

  "stability_trend":
    "1 sentence stability trend",

  "range_of_motion_trend":
    "1 sentence ROM trend",

  "movement_quality_trend":
    "1 sentence movement quality trend"
}}
"""

            print("[Haiku Call 2] Calling Haiku")

            # =====================================================
            # HAIKU CALL
            # =====================================================

            response = await call_haiku_with_retry({
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 800,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })

            result = safe_json_load(
                response.content[0].text
            )

            print("[Haiku Call 2] Response received")

            # =====================================================
            # VALIDATION
            # =====================================================

            if (
                result["weight_recommendation"]["action"]
                not in ["hold", "increase", "decrease"]
            ):
                raise ValueError(
                    f"Invalid weight action: "
                    f"{result['weight_recommendation']['action']}"
                )

            if (
                result["progress_direction"]
                not in ["up", "down", "stable"]
            ):
                raise ValueError(
                    f"Invalid progress_direction: "
                    f"{result['progress_direction']}"
                )

            print("[Haiku Call 2] Validation passed")

            # =====================================================
            # SAVE progression_results
            # =====================================================

            await db.execute(
                """
                INSERT INTO progression_results (

                    analysis_id,
                    user_id,
                    session_id,
                    exercise_id,

                    available,

                    progress_direction,
                    progression_verdict,

                    coaching_reasoning,

                    focus_this_week,

                    posture_trend,
                    stability_trend,
                    range_of_motion_trend,
                    movement_quality_trend,

                    weight_recommendation,

                    computed_at

                )
                VALUES (

                    :analysis_id,
                    :user_id,
                    :session_id,
                    :exercise_id,

                    :available,

                    :progress_direction,
                    :progression_verdict,

                    :coaching_reasoning,

                    :focus_this_week,

                    :posture_trend,
                    :stability_trend,
                    :range_of_motion_trend,
                    :movement_quality_trend,

                    :weight_recommendation,

                    CURRENT_TIMESTAMP
                )
                """,
                values={

                    "analysis_id": current["analysis_id"],
                    "user_id": current["user_id"],
                    "session_id": current["session_id"],
                    "exercise_id": current["exercise_id"],

                    "available": True,

                    "progress_direction":
                        result["progress_direction"],

                    "progression_verdict":
                        result["progression_verdict"],

                    "coaching_reasoning":
                        result["weight_recommendation"]["reason"],

                    "focus_this_week":
                        result["focus_this_week"],

                    "posture_trend":
                        result["posture_trend"],

                    "stability_trend":
                        result["stability_trend"],

                    "range_of_motion_trend":
                        result["range_of_motion_trend"],

                    "movement_quality_trend":
                        result["movement_quality_trend"],

                    "weight_recommendation":
                        json.dumps(
                            result["weight_recommendation"]
                        )
                }
            )

            print("[Haiku Call 2] progression_results saved")

            # =====================================================
            # UPDATE form_analysis_results
            # =====================================================

            await db.execute(
                """
                UPDATE form_analysis_results
                SET
                    job_status = :job_status,

                    completed_at = CURRENT_TIMESTAMP,

                    haiku_call_2_output = :output,

                    haiku_call_2_error = NULL

                WHERE analysis_id = :analysis_id
                """,
                values={
                    "job_status": "complete",
                    "output": json.dumps(result),
                    "analysis_id": analysis_id
                }
            )

            print("[Haiku Call 2] form_analysis_results updated")

            # =====================================================
            # SSE COMPLETE
            # =====================================================

            await sse_manager.send_event(
                analysis_id,
                "haiku_call_2_complete",
                90,
                "in_progress",
                {
                    "progression_output": result
                }
            )

            print("[Haiku Call 2] SUCCESS")

        except Exception as e:

            print(f"[Haiku Call 2] FAILED: {e}")

            traceback.print_exc()

            # =====================================================
            # JOB STATUS → FAILED
            # =====================================================

            try:

                await db.execute(
                    """
                    UPDATE form_analysis_results
                    SET
                        job_status = :job_status,

                        completed_at = CURRENT_TIMESTAMP,

                        haiku_call_2_error = :error

                    WHERE analysis_id = :analysis_id
                    """,
                    values={
                        "job_status": "failed",
                        "error": str(e),
                        "analysis_id": analysis_id
                    }
                )

            except Exception as inner_error:

                print(
                    "[Haiku Call 2] "
                    f"Failed updating DB status: {inner_error}"
                )

            # =====================================================
            # SSE FAILED
            # =====================================================

            try:

                await sse_manager.send_event(
                    analysis_id,
                    "haiku_call_2_failed",
                    90,
                    "partial_failure",
                    {
                        "error": str(e)
                    }
                )

            except Exception as sse_error:

                print(
                    "[Haiku Call 2] "
                    f"Failed sending SSE: {sse_error}"
                )