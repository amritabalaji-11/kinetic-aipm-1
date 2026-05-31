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
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from db.database import db
from utils.sse_manager import sse_manager


client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _now_iso() -> str:
    """UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


# ─── Status helpers ────────────────────────────────────────────────────────────

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


# ─── Main job ─────────────────────────────────────────────────────────────────

async def run_haiku_call_2(analysis_id: str) -> None:
    """
    Longitudinal coaching job for a completed analysis.

    Compares current session against the most recent previous session
    for the same user + exercise. Writes all 8 output fields to
    progression_results and updates haiku_call_2_* tracking fields
    on form_analyses throughout.
    """
    try:
        await _mark_running(analysis_id)

        # ── Fetch current session ──────────────────────────────────────────
        current = await db.fetch_one(
            """
            SELECT
                fa.analysis_id,
                fa.user_id,
                fa.exercise_id,
                fa.weight_kg_normalised,
                fa.created_at,
                far.overall_form_score,
                far.posture_score,
                far.stability_score,
                far.movement_quality_score,
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

        # ── Fetch most recent previous session ────────────────────────────
        previous = await db.fetch_one(
            """
            SELECT
                fa.weight_kg_normalised,
                fa.created_at,
                far.overall_form_score,
                far.posture_score,
                far.stability_score,
                far.movement_quality_score,
                far.coaching_output
            FROM form_analyses fa
            LEFT JOIN form_analysis_results far
                   ON fa.analysis_id = far.analysis_id
            WHERE fa.user_id     = :uid
              AND fa.exercise_id  = :eid
              AND fa.analysis_id != :aid
              AND fa.status IN ('complete', 'completed')
            ORDER BY fa.created_at DESC
            LIMIT 1
            """,
            {
                "uid": current["user_id"],
                "eid": current["exercise_id"],
                "aid": analysis_id,
            },
        )

        # ── No history → mark complete with available=false ───────────────
        if not previous:
            await db.execute(
                """
                INSERT OR IGNORE INTO progression_results (analysis_id, available)
                VALUES (:aid, 0)
                """,
                values={"aid": analysis_id},
            )
            await sse_manager.send_event(
                analysis_id, "haiku_call_2_no_history", 100, "complete"
            )
            await _mark_complete(analysis_id)
            print(f"[haiku_call_2] No previous session for analysis_id={analysis_id}")
            return

        # ── Build prompt ───────────────────────────────────────────────────
        coaching_raw = current["coaching_output"] or "{}"
        coaching = (
            json.loads(coaching_raw)
            if isinstance(coaching_raw, str)
            else coaching_raw
        )
        prev_focus = coaching.get("next_session_focus", [])

        prompt = f"""You are a strength progression coach.

Compare these two training sessions and return coaching output.

CURRENT SESSION
Overall score:    {current['overall_form_score']}
Posture score:    {current['posture_score']}
Stability score:  {current['stability_score']}
Movement quality: {current['movement_quality_score']}
Weight used:      {current['weight_kg_normalised']} kg

PREVIOUS SESSION
Overall score:    {previous['overall_form_score']}
Posture score:    {previous['posture_score']}
Stability score:  {previous['stability_score']}
Movement quality: {previous['movement_quality_score']}
Weight used:      {previous['weight_kg_normalised']} kg

PREVIOUS NEXT-SESSION FOCUS
{json.dumps(prev_focus)}

Return ONLY valid JSON — no markdown fences, no explanation.

Required schema:
{{
  "progression_verdict": "<one-sentence verdict on overall progress>",
  "progress_direction": "up | down | stable",
  "weight_recommendation": {{
    "action": "hold | increase | decrease",
    "target_weight_kg": 0,
    "reason": "<brief reason>"
  }},
  "focus_this_week": "<single coaching cue for the next session>",
  "posture_trend":          "up | down | stable",
  "stability_trend":        "up | down | stable",
  "range_of_motion_trend":  "up | down | stable",
  "movement_quality_trend": "up | down | stable"
}}"""

        # ── Call Haiku ─────────────────────────────────────────────────────
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        result = json.loads(response.content[0].text)

        # ── Validate all 8 output fields ───────────────────────────────────
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

        # ── Write 8 output fields to progression_results ──────────────────
        await db.execute(
            """
            INSERT OR REPLACE INTO progression_results (
                analysis_id,
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
                :aid, 1,
                :verdict,    :direction,
                :weight_rec, :focus,
                :posture,    :stability,
                :rom,        :mq
            )
            """,
            values={
                "aid":        analysis_id,
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

        # ── SSE + mark complete ────────────────────────────────────────────
        await sse_manager.send_event(
            analysis_id,
            "haiku_call_2_complete",
            100,
            "complete",
            {"progression_output": result},
        )
        await _mark_complete(analysis_id)
        print(f"[haiku_call_2] Complete for analysis_id={analysis_id}")

    except Exception as e:
        print(f"[haiku_call_2] Failed for analysis_id={analysis_id}: {e}")
        await _mark_failed(analysis_id, str(e))
