import json
from pathlib import Path
from databases import Database

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "kinetic.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

db = Database(DATABASE_URL)

"""analyses = [
    (
        "8227e043-592d-44ff-b916-5e1382c38da7",
        "gs://kinetic_bucket/images/user_001/8227e043-592d-44ff-b916-5e1382c38da7/user_001_front_17.5kg.jpg"
    ),
    (
        "edac261e-99b4-4149-8383-a01de55b8ce8",
        "gs://kinetic_bucket/images/user_001/edac261e-99b4-4149-8383-a01de55b8ce8/user_001_side_17.5kg.jpg"
    ),
    (
        "3c8f8d25-6f73-462e-8697-d4f25e15d8f9",
        "gs://kinetic_bucket/images/user_001/3c8f8d25-6f73-462e-8697-d4f25e15d8f9/user_001_side_15kg.jpg"
    ),
    (
        "b59bcc7a-809b-4a0a-b8da-8076058c73da",
        "gs://kinetic_bucket/images/user_001/b59bcc7a-809b-4a0a-b8da-8076058c73da/user_001_side_12.5kg.jpg"
    ),
    (
        "e465c0ea-eae7-44ee-9f48-7fe941cc5872",
        "gs://kinetic_bucket/images/user_003/e465c0ea-eae7-44ee-9f48-7fe941cc5872/user_003_1.jpg"
    ),
    (
        "9cfae51c-15fe-490d-a8b0-20e587cd1bba",
        "gs://kinetic_bucket/images/user_003/9cfae51c-15fe-490d-a8b0-20e587cd1bba/user_003_2.jpg"
    ),
    (
        "92fcebed-fc8e-4ce2-943d-0cf7c8c7555f",
        "gs://kinetic_bucket/images/user_003/92fcebed-fc8e-4ce2-943d-0cf7c8c7555f/user_003_3.jpg"
    ),
]"""

#async def update_annotated_frame_url(db, analysis_id: str, url: str):
#    query = """
#    UPDATE form_analysis_results
#    SET annotated_frame_urls = :url
#    WHERE analysis_id = :analysis_id
#    """
#    values = {
#        "analysis_id": analysis_id,
#        "url": url
#    }
#    await db.execute(query=query, values=values)

import asyncio

#async def main():
#    await db.connect()

#    for analysis_id, url in analyses:
#        await update_annotated_frame_url(db, analysis_id, url)
    
#    url = (
#        "https://storage.googleapis.com/kinetic_bucket/"
#        "worst_frames/user_001_front_17.5kg.jpg"
#    )

#    query = """
#    UPDATE user_profiles
#    SET annotated_frame_url = :url
#    WHERE user_id = :user_id
#    """

#    values = {
#        "url": url,
#        "user_id": "user_001"
#    }

#    await db.execute(query=query, values=values)

#    await db.disconnect()

#if __name__ == "__main__":
#    asyncio.run(main())