from anthropic import AsyncAnthropic
from db.database import db
from utils.sse_manager import sse_manager
import json
import os


client = AsyncAnthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)


async def run_haiku_call_2(analysis_id: str):

    try:
        # -----------------------------------------
        # CURRENT SESSION
        # -----------------------------------------
        current = await db.fetchrow(
            """
            SELECT
                far.analysis_id,
                far.user_id,
                far.exercise_id,
                far.overall_form_score,
                far.posture_score,
                far.stability_score,
                far.range_of_motion_score,
                far.movement_quality_score,
                far.rep_scores,
                far.coaching_output,
                fa.weight_used,
                far.created_at
            FROM form_analysis_results far
            JOIN form_analyses fa
                ON far.analysis_id = fa.analysis_id
            WHERE far.analysis_id = $1
            """,
            analysis_id
        )

        if not current:
            return

        # -----------------------------------------
        # PREVIOUS SESSION
        # -----------------------------------------
        previous = await db.fetchrow(
            """
            SELECT
                far.analysis_id,
                far.overall_form_score,
                far.posture_score,
                far.stability_score,
                far.range_of_motion_score,
                far.movement_quality_score,
                far.rep_scores,
                far.coaching_output,
                fa.weight_used,
                far.created_at
            FROM form_analysis_results far
            JOIN form_analyses fa
                ON far.analysis_id = fa.analysis_id
            WHERE far.user_id = $1
            AND far.exercise_id = $2
            ORDER BY far.created_at DESC
            OFFSET 1
            LIMIT 1
            """,
            current["user_id"],
            current["exercise_id"]
        )

        # -----------------------------------------
        # NO HISTORY
        # -----------------------------------------
        if not previous:
            await db.execute(
                """
                INSERT INTO progression_results (
                    analysis_id,
                    available
                )
                VALUES ($1, false)
                """,
                analysis_id
            )

            await sse_manager.send_event(
                analysis_id,
                "haiku_call_2_no_history",
                100,
                "complete"
            )

            return

        previous_focus = previous["coaching_output"].get(
            "next_session_focus",
            []
        )

        # -----------------------------------------
        # PROMPT
        # -----------------------------------------
        prompt = f"""
You are a strength progression coach.

Compare these two training sessions.

CURRENT SESSION
Overall: {current['overall_form_score']}
Posture: {current['posture_score']}
Stability: {current['stability_score']}
ROM: {current['range_of_motion_score']}
Movement Quality: {current['movement_quality_score']}
Weight: {current['weight_used']}

PREVIOUS SESSION
Overall: {previous['overall_form_score']}
Posture: {previous['posture_score']}
Stability: {previous['stability_score']}
ROM: {previous['range_of_motion_score']}
Movement Quality: {previous['movement_quality_score']}
Weight: {previous['weight_used']}

PREVIOUS NEXT SESSION FOCUS
{json.dumps(previous_focus)}

Return ONLY valid JSON.

Required schema:
{{
  "progression_verdict": "",
  "progress_direction": "up | down | stable",
  "weight_recommendation": {{
    "action": "hold | increase | decrease",
    "target_weight_kg": 0,
    "reason": ""
  }},
  "focus_this_week": "",
  "posture_trend": "",
  "stability_trend": "",
  "range_of_motion_trend": "",
  "movement_quality_trend": ""
}}
"""

        # -----------------------------------------
        # HAIKU CALL
        # -----------------------------------------
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        result = json.loads(response.content[0].text)

        # -----------------------------------------
        # VALIDATION
        # -----------------------------------------
        allowed_actions = [
            "hold",
            "increase",
            "decrease"
        ]

        if (
            result["weight_recommendation"]["action"]
            not in allowed_actions
        ):
            raise ValueError(
                "Invalid weight recommendation action"
            )

        # -----------------------------------------
        # SAVE RESULT
        # -----------------------------------------
        await db.execute(
            """
            INSERT INTO progression_results (
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
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
            )
            """,
            analysis_id,
            True,
            result["progress_direction"],
            result["progression_verdict"],
            json.dumps(result["weight_recommendation"]),
            result["focus_this_week"],
            result["posture_trend"],
            result["stability_trend"],
            result["range_of_motion_trend"],
            result["movement_quality_trend"]
        )

        # -----------------------------------------
        # SSE COMPLETE
        # -----------------------------------------
        await sse_manager.send_event(
            analysis_id,
            "haiku_call_2_complete",
            100,
            "complete",
            {
                "progression_output": result
            }
        )

    except Exception as e:
        print(f"Haiku Call 2 failed: {e}")

    finally:
        await db.close()