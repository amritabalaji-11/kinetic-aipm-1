import asyncio
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store so GET /analysis/{id} can return what was uploaded
_analyses: dict = {}

FIXTURES_DIR = Path(__file__).parent / "fixtures"
STUB_BIOMECHANICS = json.loads((FIXTURES_DIR / "form-analysis.clean.json").read_text())


@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    exercise_id: str = Form(...),
    weight_value: float = Form(...),
    weight_unit: str = Form(...),
    user_id: str = Form(...),
    session_id: str = Form(...),
):
    analysis_id = str(uuid.uuid4())
    _analyses[analysis_id] = {
        "analysis_id":  analysis_id,
        "exercise_id":  exercise_id,
        "weight_value": weight_value,
        "weight_unit":  weight_unit,
        "user_id":      user_id,
        "session_id":   session_id,
        "status":       "processing",
        "biomechanics_json": None,
    }
    print(f"[STUB] Upload received: exercise_id={exercise_id}, weight={weight_value}{weight_unit}")
    print(f"[STUB] analysis_id={analysis_id}")
    return {"analysis_id": analysis_id}


@app.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    record = _analyses.get(analysis_id)
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")
    return record


@app.get("/analysis/{analysis_id}/progression")
async def get_progression(analysis_id: str):
    from fastapi import HTTPException
    import json as _json
    from pathlib import Path as _Path

    record = _analyses.get(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if record.get("status") != "completed":
        raise HTTPException(status_code=202, detail="Progression analysis still processing")

    fixture = _json.loads((_Path(__file__).parent / "fixtures" / "form-comparison.json").read_text())
    return fixture


async def pipeline_stream(analysis_id: str):
    record     = _analyses.get(analysis_id, {})
    session_id = record.get("session_id")
    user_id    = record.get("user_id")
    ctx        = {"session_id": session_id, "user_id": user_id}

    def ev(event, **extra):
        return f"data: {json.dumps({'event': event, 'analysis_id': analysis_id, **ctx, **extra})}\n\n"

    yield ev("upload_received",    created_at="2026-05-21T00:00:00Z")
    await asyncio.sleep(0.5)

    yield ev("mediapipe_started",  video_url=record.get("video_url", ""))
    await asyncio.sleep(1.5)

    yield ev("mediapipe_complete", rep_count=5, fps=30, keypoints_detected=33, frames_processed=120)
    await asyncio.sleep(0.5)

    yield ev("biomechanics_complete", rep_count=5, joints_computed=12, avg_confidence=0.91)
    await asyncio.sleep(0.5)

    yield ev("haiku_started")
    await asyncio.sleep(2.0)

    overall_score = STUB_BIOMECHANICS.get("summary", {}).get("overall_form_score", 0)

    # Write stub results to in-memory record so GET /analysis/{id} returns real data
    if analysis_id in _analyses:
        _analyses[analysis_id]["status"] = "completed"
        _analyses[analysis_id]["biomechanics_json"] = json.dumps(STUB_BIOMECHANICS)

    yield ev("analysis_ready", overall_score=overall_score)

    # progression_ready fires ~1s after frame_ready (Haiku Call 2)
    await asyncio.sleep(1)
    yield ev("progression_ready")


@app.get("/analysis/{analysis_id}/stream")
async def stream(analysis_id: str):
    return StreamingResponse(
        pipeline_stream(analysis_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
