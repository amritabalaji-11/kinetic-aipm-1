import asyncio
import uuid
from process_video import run_analysis


async def main():
    analysis_id = str(uuid.uuid4())

    # 👇 point this to a real local video file
    file_location = "./mediapipe_code/videos/goblet_squats_1.mp4"

    print(f"Starting test: {analysis_id}")

    await run_analysis(
        analysis_id=analysis_id,
        file_location=file_location
    )

    print("Done test run")


if __name__ == "__main__":
    asyncio.run(main())