# backend/services/haiku_call_2_progression.py
#
# Async job: Haiku Call 2 — longitudinal progression coaching.
#
# SSE event sequence (S2-W8-04):
#   haiku_call_2_started    → in_progress (emitted when job begins)
#   haiku_call_2_no_history → completed   (no previous session; exits cleanly)
#   haiku_call_2_complete   → completed   (output payload included)
#   job_failed              → failed      (error_code + job_type="haiku_call_2")
#
# haiku_call_2_queued is emitted by process_video.py at enqueue time.
#
# DB tracking fields written on form_analyses:
#   haiku_call_2_status  → queued → running → complete | failed
#   haiku_call_2_started_at, haiku_call_2_completed_at, haiku_call_2_error

import asyncio
import json
import os
import random
import re
import traceback
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from db.database import db
from utils.sse_manager import sse_manager


client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Haiku Call 2 must finish within this many seconds or job_failed fires.
HAIKU_CALL_2_TIMEOUT_SECONDS = 30

# Prevents multiple Haiku Call 2 jobs from hammering TPM.
# Increase to 2 if Anthropic quota allows it.
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


async def call_haiku_with_retry(payload, retries=3):
    """Prevents transient 429 failures from killing the pipeline."""
    for attempt in range(retries):
        try:
            return await client.messages.create(**payload)
        except Exception as e:
            wait = (2 ** attempt) + random.uniform(0, 0.5)
            print(f"[Haiku Call 2] retry {attempt + 1} in {wait:.2f}s due to {e}")
            await asyncio.sleep(wait)
    raise RuntimeError("Haiku Call 2 failed after retries")


# ─── DB status helpers ────────────────────────────────────────────────────────

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

    Terminal SSE events (one of these always fires, closing the stream):
      haiku_call_2_complete   — success; includes progression_output payload
      haiku_call_2_no_history — pre-condition failed; no previous session found
      job_failed              — error or timeout; includes error_code
    """
    async with HAIKU_CALL_2_SEMAPHORE:
        # Small delay to let the TPM window clear after Haiku Call 1
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
                    far.coaching_output,
                    fa.created_at
                FROM form_analysis_results far
                JOIN form_analyses fa ON far.analysis_id = fa.analysis_id
                WHERE far.analysis_id = :analysis_id
                """,
                values={"analysis_id": analysis_id},
            )

            if not current:
                print("[Haiku Call 2] No current session found — skipping")
                raise ValueError(f"No record found for analysis_id={analysis_id}")

            print("[Haiku Call 2] Current session loaded")
            session_id  = current["session_id"]
            user_id     = current["user_id"]
            exercise_id = current["exercise_id"]

            # ── Fetch most recent previous session ────────────────────────
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
                JOIN form_analyses fa ON far.analysis_id = fa.analysis_id
                WHERE far.user_id     = :user_id
                  AND far.exercise_id  = :exercise_id
                  AND far.analysis_id != :analysis_id
                ORDER BY fa.created_at DESC
                LIMIT 1
                """,
                values={
                    "user_id":      user_id,
                    "exercise_id":  exercise_id,
                    "analysis_id":  analysis_id,
                },
            )

            print("[Haiku Call 2] Previous session loaded")

            # ── No history → clean exit ────────────────────────────────────
            # Not an error: user simply has no previous session to compare.
            # Frontend resolves skeleton loaders and shows locked/empty state.
            if not previous:
                await db.execute(
                    """
                    INSERT INTO progression_results (analysis_id, available)
                    VALUES (:analysis_id, :available)
                    """,
                    values={"analysis_id": analysis_id, "available": False},
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

            # ── Build prompt ───────────────────────────────────────────────
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
  "posture_trend": "up | down | stable",
  "stability_trend": "up | down | stable",
  "range_of_motion_trend": "up | down | stable",
  "movement_quality_trend": "up | down | stable"
}}"""

            print("[Haiku Call 2] Calling Haiku...")

            # ── Call Haiku (rate-safe retry + timeout) ─────────────────────
            response = await asyncio.wait_for(
                call_haiku_with_retry({
                    "model":      "claude-haiku-4-5-20251001",
                    "max_tokens": 800,
                    "messages":   [{"role": "user", "content": prompt}],
                }),
                timeout=HAIKU_CALL_2_TIMEOUT_SECONDS,
            )

            result = safe_json_load(response.content[0].text)
            print("[Haiku Call 2] Response received")

            # ── Validate output fields ─────────────────────────────────────
            allowed_actions    = {"hold", "increase", "decrease"}
            allowed_directions = {"up", "down", "stable"}

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
                INSERT INTO progression_results (
                    user_id,
                    session_id,
                    analysis_id,
                    available,
                    progress_direction,
                    progression_verdict,
                    weight_recommendation,
                    focus_this_week,
                    posture_trend,
                    stability_trend,
                    range_of_motion_trend,
                    movement_quality_trend
                ) VALUES (
                    :user_id, :session_id, :analysis_id, :available,
                    :progress_direction, :progression_verdict,
                    :weight_recommendation, :focus_this_week,
                    :posture_trend, :stability_trend,
                    :range_of_motion_trend, :movement_quality_trend
                )
                """,
                values={
                    "user_id":               user_id,
                    "session_id":            session_id,
                    "analysis_id":           analysis_id,
                    "available":             True,
                    "progress_direction":    result["progress_direction"],
                    "progression_verdict":   result["progression_verdict"],
                    "weight_recommendation": json.dumps(result["weight_recommendation"]),
                    "focus_this_week":       result["focus_this_week"],
                    "posture_trend":         result["posture_trend"],
                    "stability_trend":       result["stability_trend"],
                    "range_of_motion_trend": result["range_of_motion_trend"],
                    "movement_quality_trend": result["movement_quality_trend"],
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

        except Exception as e:
            error_code = "HAIKU_CALL_2_FAILED"
            print(f"[Haiku Call 2] FAILED analysis_id={analysis_id}: {e}")
            traceback.print_exc()
            await _mark_failed(analysis_id, str(e))
            await _emit(
                analysis_id, "job_failed", 100, "failed",
                {
                    "error_code": error_code,
                    "job_type":   "haiku_call_2",
                    "error":      str(e),
                    "output":     None,
                },
            )
