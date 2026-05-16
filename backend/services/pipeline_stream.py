from db.database import db

from pipeline.process_video import run_analysis
from utils.sse_manager import sse_manager


async def run_pipeline(analysis_id: str, video_url: str):

    print(f"[PIPELINE] Starting pipeline for analysis_id={analysis_id}")

    try:

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'processing'
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id},
        )

        row = await db.fetch_one(
            """
            SELECT
                video_url,
                exercise_id,
                weight_value,
                weight_unit,
                weight_kg_normalised,
                session_id,
                user_id
            FROM form_analyses
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id},
        )

        if not row:
            raise RuntimeError(f"No form_analyses row for analysis_id={analysis_id}")

        frontend = await run_analysis(
            analysis_id,
            row["video_url"],
            session_id=row["session_id"],
            user_id=row["user_id"],
            exercise_id=row["exercise_id"],
            weight_value=float(row["weight_value"]),
            weight_unit=str(row["weight_unit"]),
            weight_kg_normalised=float(row["weight_kg_normalised"]),
        )

        db_status = (
            "completed"
            if frontend.get("status") == "complete"
            else "failed"
        )

        await db.execute(
            """
            UPDATE form_analyses
            SET status = :status
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id, "status": db_status},
        )

    except Exception as e:

        print("PIPELINE ERROR:")
        print(str(e))

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'failed'
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id},
        )

        await sse_manager.send_event(
            analysis_id,
            "analysis_failed",
            100,
            "failed",
        )
