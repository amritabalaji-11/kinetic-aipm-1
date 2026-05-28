
import asyncio
import json
import uuid

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



@app.post("/upload") #changed from api/upload to /upload
async def upload_video(
    file: UploadFile = File(...), #changed video to file
    exercise: str = Form(...),
    weight: float = Form(...),
):
    analysis_id = str(uuid.uuid4())
    print(f"Upload received: exercise={exercise}, weight={weight}")
    print(f"analysis_id assigned: {analysis_id}")
    return {"analysis_id": analysis_id}



async def pipeline_stream(analysis_id: str):
    

    yield f"data: {json.dumps({'event': 'upload_received', 'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'mediapipe_started', 'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.5)
    

    yield f"data: {json.dumps({'event': 'mediapipe_complete', 'analysis_id': analysis_id, 'rep_count': 8})}\n\n"
    
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'nemotron_started', 'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(2.0)
    

    yield f"data: {json.dumps({'event': 'nemotron_complete', 'analysis_id': analysis_id, 'overall_score': 72})}\n\n"
    
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'rag_started', 'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.0)
    
    yield f"data: {json.dumps({'event': 'rag_complete', 'analysis_id': analysis_id, 'passages_retrieved': 8})}\n\n"
    
    await asyncio.sleep(0.5)

    yield f"data: {json.dumps({'event': 'claude_started', 'analysis_id': analysis_id})}\n\n"
    await asyncio.sleep(1.5)
   
    yield f"data: {json.dumps({'event': 'claude_complete', 'analysis_id': analysis_id})}\n\n"

    yield f"data: {json.dumps({'event': 'analysis_complete', 'analysis_id': analysis_id})}\n\n"
    


@app.get("/api/analysis/{analysis_id}/stream")
async def stream(analysis_id: str):
    return StreamingResponse(
        pipeline_stream(analysis_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",      
            "X-Accel-Buffering": "no",         
            "Connection": "keep-alive",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)