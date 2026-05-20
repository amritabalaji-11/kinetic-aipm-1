# 🧭 Kinetic Backend

Backend service for video upload, analysis, and processing using FastAPI and Google Cloud Platform.

---

## 🚀 Tech Stack

- FastAPI (Python)
- Google Cloud Run
- Google Cloud Storage
- API Gateway
- Cloud Build (CI/CD)

---

## 📁 Project Structure

```text id="fix2"
backend/
├── routes/        # API endpoints
├── services/      # Business logic
├── models/        # Data schemas
├── utils/         # Config + helpers
├── main.py        # App entry point
```
---

## ⚙️ How to Run Locally with Google Cloud Authentication 

Each teammate must add the json file in the credentials folder inside the backend folder

```bash
gcloud auth login
gcloud auth application-default login
```

### 1. Activate environment
```bash
source venv/bin/activate
```
### 2. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```
### 3. Run server 
```bash
cd backend
uvicorn main:app --reload
```

### 4. Test API
```bash
curl http://127.0.0.1:8000/health
```
### 🌐 API Endpoints
GET `/health` → health check
POST `/upload` → upload video (WIP)
POST `/analyze` → video analysis (WIP)



### 📡 Real-Time Analysis Streaming (SSE)

This project uses Server-Sent Events (SSE) to stream video analysis progress in real time.



### 📍 Endpoint
`GET /analysis/{analysis_id}/stream`

## Small Note:
This system has two layers:
1. Fake SSE pipeline (used for frontend development before real ML pipeline exist): 
    `pipeline_stream()`
2. Real analysis pipeline (backend logic, not yet wired to SSE endpoint)
    `run_analysis()`
Executes real processing workflow (MediaPipe → Claude Haiku)
Emits events via:
    `sse_manager.send_event()`

### 🧠 How it works

```bash
Client uploads video → backend creates analysis_id  
        ↓  
Client opens SSE stream  
        ↓  
Backend streams analysis pipeline events  
        ↓  
Frontend updates UI in real time
```

### 📦 Event Format

All events follow this format:
`data: {"event":"mediapipe_complete","analysis_id":"abc123",...optional fields...}\n\n`

### Required Rules:
- Must include `analysis_id`
- Must be valid JSON
- Must be prefixed with `data:`
- Must end with `\n\n`
- Each event is a single SSE message

### 📊 Event Sequence

Events are always emitted in this order:
```bash 
upload_received →
mediapipe_started →
mediapipe_complete →
claude_started →
claude_complete →
analysis_complete
```
### ⏱ Timing Rules
- Minimum delay between events: ≥ 500ms
- Events must NOT be sent all at once
- Delays simulate AI processing stages

### ⚠️ Required Cloud Run Headers 

To ensure SSE works on Cloud Run:

```bash 
{
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
}
```

Why:
- Prevents proxy buffering
- Ensures real-time streaming
- Keeps connection open

### 🧪 Testing SSE Locally
``` curl -N http://127.0.0.1:8000/analysis/test123/stream ```

Expected:
- Events appear one by one
- Stream stays open
- Delays are visible

### ☁️ Cloud Run Testing
```curl -N https://<your-cloud-run-url>/analysis/test123/stream ```

If events appear all at once → buffering issue

### ☁️ Cloud Architecture

Client → API Gateway → Cloud Run → FastAPI → Services → GCS / AI APIs

### 🧠 Architecture Pattern
`routes/` → HTTP layer
`services/` → business logic
external APIs (Claude Haiku, GCS) called inside services

### 🔐 Environment Variables
Uses `.env` locally:
```bash
FRONTEND_ORIGIN=http://localhost:3000
ENV=development
GCS_BUCKET_NAME=your-bucket-name
```
Never commit `.env` to repo.


# Video Upload
''' bash
curl.exe POST http://127.0.0.1:8000/upload -F "file=@video_name.mp4" ---- Make sure to execute the command on the same folder than the video file.
Once uploaded it will be shown in the uploads folder.