# backend/services/analysis_pipeline.py
#
# This file is the bridge between the upload route and the real MediaPipe pipeline.
# Before this was wired up, it just slept and sent fake events.
# Now it hands off to run_mediapipe_analysis which does the real work:
#   - runs MediaPipe on the video
#   - checks quality gate (occlusion, out of frame, not enough reps)
#   - sends the correct SSE events (including error events) as it goes

from pipeline.process_video import run_mediapipe_analysis


async def run_analysis(analysis_id: str, file_location: str):
    print(f"[ANALYSIS] Starting analysis for analysis_id={analysis_id}")

    # Hand off to the real pipeline.
    # run_mediapipe_analysis handles everything from here:
    #   - SSE events for each pipeline step
    #   - quality gate error detection and SSE error events
    #   - DB updates
    #   - exception handling
    await run_mediapipe_analysis(analysis_id, file_location)
