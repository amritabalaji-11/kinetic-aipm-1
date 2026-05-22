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


async def pipeline_stream(analysis_id: str):
    yield f"data: {json.dumps({'event': 'upload_received',    'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'mediapipe_started',  'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.5)

    yield f"data: {json.dumps({'event': 'mediapipe_complete', 'analysis_id': analysis_id, 'rep_count': 5})}\n\n"
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'nemotron_started',   'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(2.0)

    yield f"data: {json.dumps({'event': 'nemotron_complete',  'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'rag_started',        'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.0)

    yield f"data: {json.dumps({'event': 'rag_complete',       'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'claude_started',     'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.5)

    yield f"data: {json.dumps({'event': 'claude_complete',    'analysis_id': analysis_id})}\n\n"

    # Populate the in-memory record with stub results before firing analysis_complete
    if analysis_id in _analyses:
        _analyses[analysis_id]["status"] = "completed"
        _analyses[analysis_id]["biomechanics_json"] = json.dumps(STUB_BIOMECHANICS)

    yield f"data: {json.dumps({'event': 'analysis_complete',  'analysis_id': analysis_id})}\n\n"


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
