import asyncio


async def process_video(gcs_path: str, analysis_id: str) -> dict:

    await asyncio.sleep(2)

    return {
        "status": "success",
        "overlay_video_url": f"gs://overlay/{analysis_id}.mp4",
        "biomechanics_json": {
            "rep_count": 8,
            "overall_score": 72
        }
    }