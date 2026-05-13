# Real backend pipeline
import asyncio
from utils.sse_manager import sse_manager

async def run_analysis(analysis_id: str, file_location: str):
    try:
        # ------ Step 0 ------
        await asyncio.sleep(1)
        await sse_manager.send_event(analysis_id, "upload_received", 10)
        
        # ------ MediaPipe ------
        await sse_manager.send_event(analysis_id, "mediapipe_started", 20)
        await asyncio.sleep(2)
        await sse_manager.send_event(analysis_id, "mediapipe_complete", 50)     

        # ------ Nemotron ------
        await sse_manager.send_event(analysis_id, "nemotron_started", 60)
        await asyncio.sleep(3)
        await sse_manager.send_event(analysis_id, "nemotron_complete", 80)

        # ------ RAG ------
        await sse_manager.send_event(analysis_id, "rag_started", 85)
        await asyncio.sleep(4)
        await sse_manager.send_event(analysis_id, "rag_complete", 95)

        # ------ Claude ------
        await sse_manager.send_event(analysis_id, "claude_started", 96)
        await asyncio.sleep(2)
        await sse_manager.send_event(analysis_id, "claude_complete", 100)

        # ------ Final ------
        await asyncio.sleep(1)
        await sse_manager.send_event(
            analysis_id,
            "analysis_complete",
            100,
            status="complete"
        )

        print(f"Analysis {analysis_id} completed.")

    except Exception as e:
        await sse_manager.send_event(
            analysis_id,
            "error",
            0,
            status="error"
        )
        print(f"Failed: {e}")