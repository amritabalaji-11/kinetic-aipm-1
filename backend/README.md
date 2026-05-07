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

## ⚙️ How to Run Locally

### 1. Activate environment
```bash
source venv/bin/activate
```
### 2. Install dependencies
```bash
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

### ☁️ Cloud Architecture

Client → API Gateway → Cloud Run → FastAPI → Services → GCS / AI APIs

### 🧠 Architecture Pattern
`routes/` → HTTP layer
`services/` → business logic
external APIs (Claude, Nemotron, GCS) called inside services

### 🔐 Environment Variables
Uses `.env` locally:
```bash
FRONTEND_ORIGIN=http://localhost:3000
ENV=development
```
Never commit `.env` to repo.


# Video Upload
''' bash
curl.exe POST http://127.0.0.1:8000/upload -F "file=@video_name.mp4" ---- Make sure to execute the command on the same folder than the video file.
Once uploaded it will be shown in the uploads folder.