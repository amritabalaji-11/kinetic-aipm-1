# Kinetic Backend

Backend service for video upload, analysis, and processing using FastAPI and SQLite locally.

---

## How to Run Locally

### 1. Activate environment
Navigate to the project root and activate:
```bash
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Initialize local database
```bash
python backend/init_db.py
```

### 4. Run server
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

*Troubleshooting*:
* If you get a `ModuleNotFoundError: No module named 'utils.config'` error, run from the root folder instead using:
  ```bash
  PYTHONPATH=backend uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
* If running Python 3.13+ on macOS and the server crashes on start, append `--loop asyncio` to the command:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload --loop asyncio
  ```

---

## Test API

Confirm the API is working:
```bash
curl http://localhost:8000/health
```

---

## API Endpoints

* GET `/health` - health check
* POST `/upload` - upload video for biomechanics analysis
* GET `/analysis/{analysis_id}` - retrieve structured biomechanics coaching results

---

## Video Upload via CLI

```bash
curl -X POST http://localhost:8000/upload -F "file=@your_video.mp4"
```
Make sure to execute the command from the same folder where your video file is located. Once uploaded, the raw video will be saved in the `backend/uploads` directory.