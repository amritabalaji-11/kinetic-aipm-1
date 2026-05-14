# Fake pipeline (for Squad 1)
import asyncio
import json

from db.database import db
from utils.sse_manager import sse_manager


async def run_pipeline(
    analysis_id: str,
    video_url: str
):
    """
    Background task that runs the analysis pipeline.
    Updates database status and sends SSE events in real-time.
    """
    try:
        # Update status to processing
        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'processing'
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id}
        )

        # Run the pipeline stream and send each event in real-time
        async for event_data in pipeline_stream(analysis_id):
            # event_data is a dict, send it through sse_manager
            await sse_manager.send_event(
                analysis_id,
                event_data.get("event"),
                event_data.get("percentage", 0),
                event_data.get("status", "in_progress")
            )

        # Update status to completed
        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'completed'
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id}
        )

    except Exception as e:
        print(e)

        await db.execute(
            """
            UPDATE form_analyses
            SET status = 'failed'
            WHERE analysis_id = :analysis_id
            """,
            {"analysis_id": analysis_id}
        )

        await sse_manager.send_event(
            analysis_id,
            "analysis_failed",
            100,
            "failed"
        )


async def pipeline_stream(analysis_id: str):
    """Generator that yields pipeline events with progress tracking."""
    
    yield {
        "event": "upload_received",
        "analysis_id": analysis_id,
        "percentage": 10,
        "status": "in_progress"
    }
    await asyncio.sleep(0.5)

    yield {
        "event": "mediapipe_started",
        "analysis_id": analysis_id,
        "percentage": 20,
        "status": "in_progress"
    }
    await asyncio.sleep(1.5)

    yield {
        "event": "mediapipe_complete",
        "analysis_id": analysis_id,
        "percentage": 35,
        "status": "in_progress",
        "rep_count": 8
    }
    await asyncio.sleep(0.5)

    yield {
        "event": "nemotron_started",
        "analysis_id": analysis_id,
        "percentage": 45,
        "status": "in_progress"
    }
    await asyncio.sleep(2.0)

    yield {
        "event": "nemotron_complete",
        "analysis_id": analysis_id,
        "percentage": 60,
        "status": "in_progress",
        "overall_score": 72
    }
    await asyncio.sleep(0.5)

    yield {
        "event": "rag_started",
        "analysis_id": analysis_id,
        "percentage": 70,
        "status": "in_progress"
    }
    await asyncio.sleep(1.0)

    yield {
        "event": "rag_complete",
        "analysis_id": analysis_id,
        "percentage": 80,
        "status": "in_progress",
        "passages_retrieved": 8
    }
    await asyncio.sleep(0.5)

    yield {
        "event": "claude_started",
        "analysis_id": analysis_id,
        "percentage": 85,
        "status": "in_progress"
    }
    await asyncio.sleep(1.5)

    yield {
        "event": "claude_complete",
        "analysis_id": analysis_id,
        "percentage": 95,
        "status": "in_progress"
    }
    await asyncio.sleep(0.5)

    yield {
        "event": "analysis_complete",
        "analysis_id": analysis_id,
        "percentage": 100,
        "status": "completed"
    }