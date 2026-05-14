from db.database import db

from pipeline.process_video import run_analysis
from utils.sse_manager import sse_manager


async def run_pipeline(
    analysis_id: str,
    video_url: str
):

    try:

        # =====================================================
        # UPDATE STATUS → processing
        # =====================================================

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'processing'
            WHERE analysis_id = :analysis_id
            """,
            {
                "analysis_id": analysis_id
            }
        )

        # =====================================================
        # SSE EVENT
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "processing_started",
            5,
            "processing"
        )

        # =====================================================
        # RUN REAL PIPELINE
        # =====================================================

        await run_analysis(
            analysis_id,
            video_url
        )

        # =====================================================
        # UPDATE STATUS → completed
        # =====================================================

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'completed'
            WHERE analysis_id = :analysis_id
            """,
            {
                "analysis_id": analysis_id
            }
        )

        # =====================================================
        # FINAL SSE EVENT
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "analysis_completed",
            100,
            "completed"
        )

    except Exception as e:

        print("PIPELINE ERROR:")
        print(str(e))

        # =====================================================
        # UPDATE STATUS → failed
        # =====================================================

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'failed'
            WHERE analysis_id = :analysis_id
            """,
            {
                "analysis_id": analysis_id
            }
        )

        # =====================================================
        # SSE EVENT
        # =====================================================

        await sse_manager.send_event(
            analysis_id,
            "analysis_failed",
            100,
            "failed"
        )