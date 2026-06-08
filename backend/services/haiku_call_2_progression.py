from datetime import datetime, timezone

from anthropic import (
    AsyncAnthropic,
    APITimeoutError,
    APIStatusError,
    RateLimitError,
    BadRequestError
    )
from db.database import db
from utils.sse_manager import sse_manager
from services.errors import map_exception_to_error_code
from utils.logging import log_job_failure

import time
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

# Prevents multiple Haiku Call 2 jobs from hammering TPM.
HAIKU_CALL_2_SEMAPHORE = asyncio.Semaphore(1)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def safe_json_load(raw: str):
    """Robust JSON parser — strips markdown fences if Claude adds them."""
    raw = raw.strip()
    raw = re.sub(r"^```json", "", raw)
    raw = re.sub(r"^```", "", raw)
    raw = re.sub(r"```$", "", raw)
    return json.loads(raw.strip())


async def call_haiku_with_retry(payload):
    """
    Initial attempt + 3 retries
    Backoff: 1s → 3s → 9s
    Per API timeout: 45s
    """

    backoff_times = [1, 3, 9]
    max_attempts = 4

    for attempt in range(max_attempts):

        try:

            return await asyncio.wait_for(
                client.messages.create(**payload),
                timeout=45
            )

        except Exception as exc:

            error_code, retryable = (
                map_exception_to_error_code(exc)
            )

            if not retryable:

                print(
                    f"[Haiku Call 2] "
                    f"Non-retryable error: "
                    f"{error_code} - {exc}"
                )

                raise

            if attempt == max_attempts - 1:

                print(
                    f"[Haiku Call 2] "
                    f"Max retries reached. "
                    f"Last error: {error_code}"
                )

                raise

            wait = backoff_times[attempt]

            print(
                f"[Haiku Call 2] "
                f"Retry {attempt+1}/3 "
                f"in {wait}s "
                f"due to {error_code}"
            )

            await asyncio.sleep(wait)

# =========================================================
# MAIN JOB
# =========================================================

async def _mark_running(analysis_id: str) -> None:
    await db.execute(
        """
        UPDATE form_analyses
        SET haiku_call_2_status     = 'running',
            haiku_call_2_started_at  = :ts
        WHERE analysis_id = :aid
        """,
        values={"ts": _now_iso(), "aid": analysis_id},
    )


async def _mark_complete(analysis_id: str) -> None:
    await db.execute(
        """
        UPDATE form_analyses
        SET haiku_call_2_status       = 'complete',
            haiku_call_2_completed_at  = :ts
        WHERE analysis_id = :aid
        """,
        values={"ts": _now_iso(), "aid": analysis_id},
    )


async def _mark_failed(analysis_id: str, error: str) -> None:
    await db.execute(
        """
        UPDATE form_analyses
        SET haiku_call_2_status = 'failed',
            haiku_call_2_error  = :err
        WHERE analysis_id = :aid
        """,
        values={"err": error, "aid": analysis_id},
    )


# ─── SSE helper ───────────────────────────────────────────────────────────────

async def _emit(analysis_id: str, event_name: str, percentage: int,
                status: str, extra: dict = None) -> None:
    """Thin wrapper that always injects job_id and timestamp_ms."""
    payload = {
        "job_id":       analysis_id,
        "timestamp_ms": _now_ms(),
    }
    if extra:
        payload.update(extra)
    await sse_manager.send_event(analysis_id, event_name, percentage, status, payload)


# ─── Main job ─────────────────────────────────────────────────────────────────

async def run_haiku_call_2(analysis_id: str) -> None:
    """
    Longitudinal coaching job for a completed analysis.

    Runs under HAIKU_CALL_2_SEMAPHORE to prevent TPM hammering.
    Emits SSE events at each stage so the frontend can show Tab 2 progress.
    Uses main branch DB schema: exercise_name, weight_kg, session_id PK on form_analyses.

    Terminal SSE events (one of these always fires, closing the stream):
      haiku_call_2_complete   — success; includes progression_output payload
      haiku_call_2_no_history — pre-condition failed; no previous session found
      job_failed              — error or timeout; includes error_code
    """
    async with HAIKU_CALL_2_SEMAPHORE:

        started_at = time.monotonic()

        # Small delay to let TPM window clear after Haiku Call 1
        await asyncio.sleep(10)

        print(f"[Haiku Call 2] START analysis_id={analysis_id}")

        try:
            # ── Mark running + emit started ────────────────────────────────
            await _mark_running(analysis_id)
            await _emit(
                analysis_id, "haiku_call_2_started", 87, "in_progress",
                {"output": None, "error": None},
            )

            # ── Fetch current session ──────────────────────────────────────
            current = await db.fetch_one(
                """
                SELECT
                    fa.analysis_id,
                    fa.user_id,
                    fa.exercise_name,
                    fa.weight_kg,
                    fa.created_at,
                    far.session_id,
                    far.exercise_id,
                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.range_of_motion_score,
                    far.movement_quality_score,
                    far.rep_scores,
                    far.coaching_output
                FROM form_analyses fa
                LEFT JOIN form_analysis_results far
                       ON fa.analysis_id = far.analysis_id
                WHERE fa.analysis_id = :aid
                """,
                {"aid": analysis_id},
            )

            if not current:
                raise ValueError(f"No record found for analysis_id={analysis_id}")

            print("[Haiku Call 2] Current session loaded")
            session_id    = current["session_id"]
            user_id       = current["user_id"]
            exercise_name = current["exercise_name"]
            exercise_id = current["exercise_id"] if current["exercise_id"] else exercise_name

            # ── Fetch most recent previous session ────────────────────────
            previous = await db.fetch_one(
                """
                SELECT
                    fa.weight_kg,
                    fa.created_at,
                    far.overall_form_score,
                    far.posture_score,
                    far.stability_score,
                    far.range_of_motion_score,
                    far.movement_quality_score,
                    far.rep_scores,
                    far.coaching_output
                FROM form_analyses fa
                LEFT JOIN form_analysis_results far
                       ON fa.analysis_id = far.analysis_id
                WHERE fa.user_id      = :uid
                  AND far.exercise_id = :exercise_id
                  AND fa.analysis_id  != :aid
                  AND fa.status IN ('complete', 'completed')
                ORDER BY fa.created_at DESC
                LIMIT 1
                """,
                {
                    "uid":         user_id,
                    "exercise_id": exercise_id,
                    "aid":         analysis_id,
                },
            )

            print("[Haiku Call 2] Previous session loaded")

            # ── No history → clean exit ────────────────────────────────────
            if not previous:

                elapsed = time.monotonic() - started_at

                if elapsed > 120:
                    raise TimeoutError(
                        "Haiku Call 2 exceeded 120 seconds"
                    )

                await db.execute(
                    """
                    INSERT INTO progression_results (
                        analysis_id,
                        session_id,
                        user_id,
                        exercise_id,
                        available
                    )
                    VALUES (
                        :analysis_id,
                        :session_id,
                        :user_id,
                        :exercise_id,
                        :available
                    )
                    """,
                    values={
                        "analysis_id": analysis_id,
                        "session_id": session_id,
                        "user_id": user_id,
                        "exercise_id": exercise_id,
                        "available": False
                    }
                )
                await _emit(
                    analysis_id, "haiku_call_2_no_history", 100, "completed",
                    {"output": None, "error": None},
                )
                await _mark_complete(analysis_id)
                print("[Haiku Call 2] No previous session — emitted no_history SSE")
                return

            # ── Extract previous next_session_focus ───────────────────────
            previous_coaching = {}
            if previous["coaching_output"]:
                raw = previous["coaching_output"]
                previous_coaching = json.loads(raw) if isinstance(raw, str) else raw
            previous_focus = previous_coaching.get("next_session_focus", [])

            previous_focus = (
                previous_coaching.get("next_session_focus", [])
                if previous_coaching else []
            )
            # -----------------------------------------
            # PROMPT
            # Includes both sessions' 4 parameter scores + overall + weight
            # + previous next_session_focus for "We've Told You" context
            # Weight progression reasoning is inline — no external MD files
            # -----------------------------------------
            prompt = f"""You are a strength progression coach.

Compare these two training sessions and return coaching output.

CURRENT SESSION
Overall score:    {current['overall_form_score']}
Posture score:    {current['posture_score']}
Stability score:  {current['stability_score']}
Range of Motion:  {current['range_of_motion_score']}
Movement quality: {current['movement_quality_score']}
Weight used:      {current['weight_kg']} kg
Rep Scores:       {current['rep_scores']}

PREVIOUS SESSION
Overall score:    {previous['overall_form_score']}
Posture score:    {previous['posture_score']}
Stability score:  {previous['stability_score']}
Range of Motion:  {previous['range_of_motion_score']}
Movement quality: {previous['movement_quality_score']}
Weight used:      {previous['weight_kg']} kg
Rep Scores:       {previous['rep_scores']}

WHAT YOU TOLD THEM TO FOCUS ON LAST SESSION
{json.dumps(previous_focus, indent=2)}

WEIGHT PROGRESSION RULES
- hold: overall score < 75, or score dropped vs previous session
- increase: overall score >= 80 AND score is stable or improving
- decrease: overall score dropped significantly (8+ points vs previous)
- target_weight_kg: suggest next logical increment (+2 kg increase, -2 kg decrease, same for hold)

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
  "posture_trend":          "up | down | stable",
  "stability_trend":        "up | down | stable",
  "range_of_motion_trend":  "up | down | stable",
  "movement_quality_trend": "up | down | stable"
}}"""

            print("[Haiku Call 2] Calling Haiku...")

            elapsed = time.monotonic() - started_at

            if elapsed > 120:
                raise TimeoutError("Haiku Call 2 exceeded time limit before calling Haiku")

            # -----------------------------------------
            # HAIKU CALL (RATE SAFE + RETRY)
            # -----------------------------------------
            response = await call_haiku_with_retry({
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 800,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })

            elapsed = time.monotonic() - started_at

            if elapsed > 120:
                raise TimeoutError(
                    "Haiku Call 2 exceeded 120 seconds"
                )

            result = safe_json_load(response.content[0].text)
            print("[Haiku Call 2] Response received")

            allowed_actions = {"hold", "increase", "decrease"}
            allowed_directions = {"up", "down", "stable"}

            required_fields = ["progression_verdict",
                               "progress_direction",
                                "weight_recommendation",
                                "focus_this_week",
                                "posture_trend",
                                "stability_trend",
                                "range_of_motion_trend",
                                "movement_quality_trend"]

            for field in required_fields:
                if field not in result:
                    raise KeyError(f"Missing required field in Haiku output: {field}")

            # -----------------------------------------
            # VALIDATION
            # -----------------------------------------
            if result["weight_recommendation"]["action"] not in ["hold", "increase", "decrease"]:
                raise ValueError(f"Invalid weight action: {result['weight_recommendation']['action']}")

            if result["weight_recommendation"]["action"] not in allowed_actions:
                raise ValueError(
                    f"Invalid weight action: {result['weight_recommendation']['action']!r}"
                )
            if result["progress_direction"] not in allowed_directions:
                raise ValueError(f"Invalid progress_direction: {result['progress_direction']!r}")
            for trend_field in (
                "posture_trend", "stability_trend",
                "range_of_motion_trend", "movement_quality_trend",
            ):
                if result[trend_field] not in allowed_directions:
                    raise ValueError(f"Invalid {trend_field}: {result[trend_field]!r}")

            # ── Write to progression_results ───────────────────────────────
            await db.execute(
                """
                INSERT OR REPLACE INTO progression_results (
                    analysis_id,
                    session_id,
                    user_id,
                    exercise_id,
                    available,
                    progression_verdict,
                    progress_direction,
                    weight_recommendation,
                    focus_this_week,
                    posture_trend,
                    stability_trend,
                    range_of_motion_trend,
                    movement_quality_trend
                ) VALUES (
                    :aid, :sid, :uid, :exercise_id, 1,
                    :verdict,    :direction,
                    :weight_rec, :focus,
                    :posture,    :stability,
                    :rom,        :mq
                )
                """,
                values={
                    "aid":         analysis_id,
                    "sid":         session_id,
                    "uid":         user_id,
                    "exercise_id": exercise_id,
                    "verdict":     result["progression_verdict"],
                    "direction":   result["progress_direction"],
                    "weight_rec":  json.dumps(result["weight_recommendation"]),
                    "focus":       result["focus_this_week"],
                    "posture":     result["posture_trend"],
                    "stability":   result["stability_trend"],
                    "rom":         result["range_of_motion_trend"],
                    "mq":          result["movement_quality_trend"],
                },
            )

            print("[Haiku Call 2] Saved to progression_results")

            # ── Emit complete + mark done ──────────────────────────────────
            await _emit(
                analysis_id, "haiku_call_2_complete", 100, "completed",
                {"output": result, "error": None},
            )
            await _mark_complete(analysis_id)
            print(f"[Haiku Call 2] SUCCESS analysis_id={analysis_id}")

        except asyncio.TimeoutError:
            error_code = "HAIKU_CALL_2_TIMEOUT"
            print(f"[Haiku Call 2] Timeout for analysis_id={analysis_id}")
            await _mark_failed(analysis_id, error_code)
            await _emit(
                analysis_id, "job_failed", 100, "failed",
                {
                    "error_code": error_code,
                    "job_type":   "haiku_call_2",
                    "error":      "Progression job timed out.",
                    "output":     None,
                },
            )

            print("[Haiku Call 2] SUCCESS")

        except Exception as exc:

            elapsed = (
                time.monotonic()
                - started_at
            )   

            if (
                isinstance(exc, TimeoutError)
                and elapsed > 120
            ):
                error_code = (
                    "HAIKU_CALL_2_TIMEOUT"
                )

                retryable = False

            else:

                error_code, retryable = (
                    map_exception_to_error_code(exc)
                )

            log_job_failure(
                analysis_id=analysis_id,
                error_code=error_code,
                retryable=retryable,
                attempt=4,
                elapsed=elapsed,
                exc=exc
            )

            print(
                f"[Haiku Call 2] FAILED "
                f"analysis_id={analysis_id} "
                f"error_code={error_code} "
                f"retryable={retryable} "
                f"elapsed={elapsed:.2f}s "
                f"exception={type(exc).__name__}"
            )

            existing = await db.fetch_one(
                """
                SELECT analysis_id
                FROM progression_results
                WHERE analysis_id = :analysis_id
                """,
                values={
                    "analysis_id": analysis_id
                }
            )

            if existing:

                await db.execute(
                    """
                    UPDATE progression_results
                    SET error_code = :error_code,
                        retryable = :retryable,
                        last_error_at = CURRENT_TIMESTAMP,
                        available = 0
                    WHERE analysis_id = :analysis_id
                    """,
                    values={
                        "error_code": error_code,
                        "retryable": retryable,
                        "analysis_id": analysis_id
                    }
                )

            else:

                await db.execute(
                    """
                    INSERT INTO progression_results (
                        analysis_id,
                        session_id,
                        user_id,
                        exercise_id,
                        available,
                        error_code,
                        retryable
                    )
                    VALUES (
                        :analysis_id,
                        :session_id,
                        :user_id,
                        :exercise_id,
                        0,
                        :error_code,
                        :retryable
                    )
                    """,
                    values={
                        "analysis_id": analysis_id,
                        "session_id":  session_id,
                        "user_id":     user_id,
                        "exercise_id": current["exercise_id"],
                        "error_code":  error_code,
                        "retryable":   retryable
                    }
                )

            traceback.print_exc()

            try:

                await sse_manager.send_event(
                    analysis_id,
                    "job_failed",
                    100,
                    "failed",
                    {
                        "job_type": 
                            "haiku_call_2",

                        "error_code":
                            error_code,

                        "retryable":
                            retryable
                    }
                )

            except Exception:
                pass
