import asyncio
import uuid
import os
from pathlib import Path

# Load .env before anything else so ANTHROPIC_API_KEY is available
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from db.database import db
from pipeline.process_video import run_mediapipe_analysis


async def main():

    analysis_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    user_id = "1ea9434e-6ad4-4bc1-bdf9-04a41db64e57"

    # -------------------------------------------------
    # INSERT TEST ROW
    # -------------------------------------------------
    await db.execute("""
        INSERT INTO form_analyses (
            analysis_id,
            session_id,
            user_id,
            exercise_name,
            video_url,
            status
        )
        VALUES (
            :analysis_id,
            :session_id,
            :user_id,
            'goblet_squat',
            :video_url,
            'processing'
        )
    """, {
        "analysis_id": analysis_id,
        "session_id": session_id,
        "user_id": user_id,
        "video_url": "mediapipe_code/videos/good_form/goblet_squats_3.mp4"
    })

    # -------------------------------------------------
    # RUN PIPELINE
    # -------------------------------------------------
    print(f"Starting test: {analysis_id}")

    await run_mediapipe_analysis(
        analysis_id=analysis_id,
        file_location="mediapipe_code/videos/good_form/goblet_squats_3.mp4"
    )

    print("Done test run")


if __name__ == "__main__":
    asyncio.run(main())