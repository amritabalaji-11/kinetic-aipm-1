import asyncio


async def process_video(
    gcs_path: str,
    analysis_id: str
) -> dict:

    # Simulación de procesamiento
    await asyncio.sleep(2)

    return {
        "status": "success",
        "overlay_video_url": f"gs://kinetic_bucket/overlay/{analysis_id}.mp4",
        "biomechanics_json": {
            "rep_count": 8,
            "overall_score": 72,
            "exercise": "squat",
            "feedback": [
                "Good squat depth",
                "Keep chest more upright"
            ]
        }
    }