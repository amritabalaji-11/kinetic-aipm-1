# Fake pipeline (for Squad 1)
import asyncio
import json

def sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def pipeline_stream(analysis_id: str):
    yield sse({
        "event": "upload_received",
        "analysis_id": analysis_id
    })
    await asyncio.sleep(0.5)

    yield sse({
        "event": "mediapipe_started",
        "analysis_id": analysis_id
    })
    await asyncio.sleep(1.5)

    yield sse({
        "event": "mediapipe_complete",
        "analysis_id": analysis_id,
        "rep_count": 8
    })
    await asyncio.sleep(0.5)

    yield sse({
        "event": "nemotron_started",
        "analysis_id": analysis_id
    })
    await asyncio.sleep(2.0)

    yield sse({
        "event": "nemotron_complete",
        "analysis_id": analysis_id,
        "overall_score": 72
    })
    await asyncio.sleep(0.5)

    yield sse({
        "event": "rag_started",
        "analysis_id": analysis_id
    })
    await asyncio.sleep(1.0)

    yield sse({
        "event": "rag_complete",
        "analysis_id": analysis_id,
        "passages_retrieved": 8
    })
    await asyncio.sleep(0.5)

    yield sse({
        "event": "claude_started",
        "analysis_id": analysis_id
    })
    await asyncio.sleep(1.5)

    yield sse({
        "event": "claude_complete",
        "analysis_id": analysis_id
    })

    yield sse({
        "event": "analysis_complete",
        "analysis_id": analysis_id
    })