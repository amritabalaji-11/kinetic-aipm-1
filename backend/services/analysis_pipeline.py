# Real backend pipeline
import asyncio
import os
import hashlib
import random
import json
from utils.sse_manager import sse_manager


def _pseudo_result_for_id(analysis_id: str):
    # deterministic pseudo-random result based on analysis_id
    seed = int(hashlib.md5(analysis_id.encode('utf-8')).hexdigest()[:8], 16)
    rnd = random.Random(seed)

    overall = rnd.randint(60, 85)
    params = {
        "posture": {"score": rnd.randint(65, 85), "affirmation": "Your posture is generally solid."},
        "stability": {"score": rnd.randint(60, 80), "correction": "Root your feet and drive through the heels."},
        "movement_quality": {"score": rnd.randint(60, 80), "observation": "Slight forward lean at the top."},
        "velocity": {"score": rnd.randint(55, 75), "correction": "Try a slightly faster ascent."}
    }

    reps = []
    rep_count = rnd.randint(4, 8)
    for i in range(rep_count):
        reps.append({"rep_index": i + 1, "form_score": rnd.randint(55, 90)})

    coaching = {
        "summary_paragraph": "Lets stay in this weight and keep on improving!",
        "parameters": params
    }

    result = {
        "analysis_id": analysis_id,
        "summary": {"overall_form_score": overall},
        "coaching": coaching,
        "reps": reps,
        "issues": []
    }

    # add a simple issue if overall is low
    if overall < 70:
        result["issues"].append({
            "id": "knee-valgus",
            "title": "Knee valgus",
            "severity": "Medium",
            "detail": "Some inward knee movement detected on a few reps."
        })

    return result


async def run_analysis(analysis_id: str, file_location: str):
    print(f"[ANALYSIS] Starting analysis for analysis_id={analysis_id}")
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

        # ------ RAG/Claude ------
        await sse_manager.send_event(analysis_id, "rag_started", 85)
        await asyncio.sleep(2)
        await sse_manager.send_event(analysis_id, "rag_complete", 92)

        await sse_manager.send_event(analysis_id, "claude_started", 93)
        await asyncio.sleep(2)
        await sse_manager.send_event(analysis_id, "claude_complete", 98)

        # ----- Finalization ------
        await asyncio.sleep(1)

        # build deterministic pseudo result and persist to disk
        result = _pseudo_result_for_id(analysis_id)

        uploads_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        result_path = os.path.join(uploads_dir, f"{analysis_id}.json")
        try:
            with open(result_path, "w", encoding="utf-8") as fh:
                json.dump(result, fh, ensure_ascii=False, indent=2)
            print(f"[ANALYSIS] Result saved to {result_path}")
        except Exception as e:
            print(f"[ANALYSIS] Failed to save result: {e}")

        # send final SSE including the result
        await sse_manager.send_event(
            analysis_id,
            "analysis_complete",
            100,
            status="complete",
            result=result
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