# Kinetic AI Form Coach

Kinetic AI Form Coach is a local web application for uploading Goblet Squat workout videos, running biomechanical analysis, and viewing training feedback.

---

## Prerequisites

Ensure you have the following installed:
* Python 3.10+
* Node.js 18+ and npm

---

## Quickstart Setup

This application runs completely locally using SQLite.

### 1. Create env file and add Anthropic key

Create your env file from the template:
```bash
cp .env.example .env
```

Open the `.env` file and add your Anthropic API Key:
```env
ANTHROPIC_API_KEY=your-api-key
```

### 2. Backend setup

Initialize a Python virtual environment, install the backend dependencies, and initialize the database:

```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python backend/init_db.py
```

Run the server:

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

### 3. Frontend setup (new terminal)

From the project root:

```bash
cd frontend
npm install
npm run dev
```

---

## Open through:

Open your browser to:
http://localhost:5173
