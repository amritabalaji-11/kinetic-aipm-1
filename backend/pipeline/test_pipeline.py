import asyncio
import uuid
from pipeline.process_video import run_mediapipe_analysis
import os


async def main():
    session_id = str(uuid.uuid4())
    
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 👇 point this to a real local video file
    file_location = "./backend/mediapipe_code/videos/good_form/goblet_squats_1.mp4"

    print(f"Starting test: {session_id}")

    await run_mediapipe_analysis(
        analysis_id=session_id,
        file_location=file_location
    )

    print("Done test run")


if __name__ == "__main__":
    asyncio.run(main())