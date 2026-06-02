# backend/services/haiku_call_2_progression.py
#
# Async job: Haiku Call 2 — longitudinal progression coaching.
#
# S2-W8-01/02: Writes job tracking fields to form_analyses at each stage:
#   haiku_call_2_status  → queued (set by pipeline) → running → complete | failed
#   haiku_call_2_started_at, completed_at, error
#
# On success writes all 8 S2-W8-02 output fields to progression_results.

import json
import os
import traceback
import asyncio
import random
import re
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from db.database import db
from utils.sse_manager import sse_manager


# =========================================================
# ANTHROPIC CLIENT
# =========================================================

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# =========================================================
# GLOBAL RATE LIMIT CONTROL
# =========================================================
# Prevents multiple Haiku Call 2 jobs from hammering TPM
# Increase later if Anthropic quota allows it

HAIKU_CALL_2_SEMAPHORE = asyncio.Semaphore(1)


# =========================================================
# JSON PARSER
# =========================================================

def safe_json_load(raw: str):
    """Robust JSON parser for Claude output. Removes markdown fences if present."""
    raw = raw.strip()
    raw = re.sub(r"^```json", "", raw)
    raw = re.sub(r"^```", "", raw)
    raw = re.sub(r"```$", "", raw)
    return json.loads(raw.strip())


# =========================================================
# RETRY WRAPPER
# =========================================================

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
# STATUS HELPERS
# =========================================================

def _now_iso() -> str:
    """UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


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


# =========================================================
# MAIN JOB
# =========================================================

async def run_haiku_call_2(analysis_id: str) -> None:
    """
    Longitudinal coaching job for a completed analysis.

    Compares current session against the most recent previous session
    for the same user + exercise. Writes all 8 output fields to
    progression_results and updates haiku_call_2_* tracking fields
    on form_analyses throughout.
    """
    async with HAIKU_CALL_2_SEMAPHORE:

        # Small delay to let TPM window clear after Haiku Call 1
        await asyncio.sleep(10)

        print(f"[Haiku Call 2] START analysis_id={analysis_id}")

        try:
            await _mark_running(analysis_id)

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
            session_id = current["session_id"]
            user_id    = current["user_id"]
            exercise_name = current["exercise_name"]

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
                  AND fa.exercise_name = :ename
                  AND fa.analysis_id  != :aid
                  AND fa.status IN ('complete', 'completed')
                ORDER BY fa.created_at DESC
                LIMIT 1
                """,
                {
                    "uid":   user_id,
                    "ename": exercise_name,
                    "aid":   analysis_id,
                },
            )

            print("[Haiku Call 2] Previous session loaded")

            # ── No history → mark complete with available=false ───────────
            if not previous:
                await db.execute(
                    """
                    INSERT OR IGNORE INTO progression_results (
                        analysis_id, session_id, user_id, available
                    )
                    VALUES (:aid, :sid, :uid, 0)
                    """,
                    values={"aid": analysis_id, "sid": session_id, "uid": user_id},
                )
                await sse_manager.send_event(
                    analysis_id, "haiku_call_2_no_history", 100, "complete"
                )
                print(f"[Haiku Call 2] No previous session — emitted no_history SSE")
                await _mark_complete(analysis_id)
                return

            # ── Extract next_session_focus from previous coaching output ──
            previous_coaching = {}
            if previous["coaching_output"]:
                previous_coaching = (
                    json.loads(previous["coaching_output"])
                    if isinstance(previous["coaching_output"], str)
                    else previous["coaching_output"]
                )
            previous_focus = previous_coaching.get("next_session_focus", [])

            # ── Build prompt ───────────────────────────────────────────────
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
  "posture_trend":          "up | down | stable",
  "stability_trend":        "up | down | stable",
  "range_of_motion_trend":  "up | down | stable",
  "movement_quality_trend": "up | down | stable"
}}"""

            print("[Haiku Call 2] Calling Haiku...")

            # ── Call Haiku (rate-safe + retry) ─────────────────────────────
            response = await call_haiku_with_retry({
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            })

            result = safe_json_load(response.content[0].text)

            print("[Haiku Call 2] Response received")

            # ── Validate all 8 output fields ───────────────────────────────
            allowed_actions    = {"hold", "increase", "decrease"}
            allowed_directions = {"up", "down", "stable"}

            if result["weight_recommendation"]["action"] not in allowed_actions:
                raise ValueError(
                    f"Invalid weight_recommendation.action: "
                    f"{result['weight_recommendation']['action']!r}"
                )
            if result["progress_direction"] not in allowed_directions:
                raise ValueError(f"Invalid progress_direction: {result['progress_direction']!r}")
            for trend_field in (
                "posture_trend", "stability_trend",
                "range_of_motion_trend", "movement_quality_trend",
            ):
                if result[trend_field] not in allowed_directions:
                    raise ValueError(f"Invalid {trend_field}: {result[trend_field]!r}")

            # ── Write 8 output fields to progression_results ──────────────
            await db.execute(
                """
                INSERT OR REPLACE INTO progression_results (
                    analysis_id,
                    session_id,
                    user_id,
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
                    :aid, :sid, :uid, 1,
                    :verdict,    :direction,
                    :weight_rec, :focus,
                    :posture,    :stability,
                    :rom,        :mq
                )
                """,
                values={
                    "aid":        analysis_id,
                    "sid":        session_id,
                    "uid":        user_id,
                    "verdict":    result["progression_verdict"],
                    "direction":  result["progress_direction"],
                    "weight_rec": json.dumps(result["weight_recommendation"]),
                    "focus":      result["focus_this_week"],
                    "posture":    result["posture_trend"],
                    "stability":  result["stability_trend"],
                    "rom":        result["range_of_motion_trend"],
                    "mq":         result["movement_quality_trend"],
                },
            )

            print("[Haiku Call 2] Saved to progression_results")

            # ── SSE + mark complete ────────────────────────────────────────
            await sse_manager.send_event(
                analysis_id,
                "progression_ready",
                100,
                "complete",
                {"progression_output": result},
            )
            await _mark_complete(analysis_id)
            print(f"[Haiku Call 2] SUCCESS analysis_id={analysis_id}")

        except Exception as e:
            print(f"[Haiku Call 2] FAILED: {e}")
            traceback.print_exc()
            await _mark_failed(analysis_id, str(e))

