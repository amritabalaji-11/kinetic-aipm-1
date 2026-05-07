import asyncio
from utils.sse_manager import SSEManager

async def run_analysis(analysis_id: str, file_location: str):
    try:
        # ------ Step 0: Initialization ------
        await asyncio.sleep(1)  # Simulate initialization time
        await SSEManager().send_event(analysis_id, "Upload recieved", 10)
        
        # ------ Step 1: MediaPipe ------
        await asyncio.sleep(2)  # Simulate MediaPipe processing time
        await SSEManager().send_event(analysis_id, "MediaPipe processing complete", 50)

        # ------ Step 2: Nemotron (Biomechanics) ------
        await SSEManager().send_event(analysis_id, "Starting Nemotron processing", 60)
        await asyncio.sleep(3)  # Simulate Nemotron processing time
        await SSEManager().send_event(analysis_id, "Nemotron processing complete", 80)

        # ------ Step 3: RAG & Claude ------
        await SSEManager().send_event(analysis_id, "Starting RAG processing", 85)
        await asyncio.sleep(4)  # Simulate RAG & Claude processing time
        await SSEManager().send_event(analysis_id, "RAG processing complete", 95)

        await SSEManager().send_event(analysis_id, "Starting Claude processing", 96)
        await asyncio.sleep(2)  # Simulate Claude processing time
        await SSEManager().send_event(analysis_id, "Claude processing complete", 100)

        # ----- Finalization ------
        await asyncio.sleep(1)  # Simulate finalization time
        await SSEManager().send_event(analysis_id, "Analysis complete", 100, status="complete")

        print(f"Analysis {analysis_id} completed successfully.")
    except Exception as e:
        await SSEManager().send_event(analysis_id, f"Error: {str(e)}", 0, status="error")
        print(f"Analysis {analysis_id} failed with error: {str(e)}")