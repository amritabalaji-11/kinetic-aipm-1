# Kinetic AI Form Coach

Kinetic AI Form Coach is a local web application for uploading Goblet Squat workout videos, running real-time biomechanical analysis, and viewing training feedback. 

This repository is structured as a monorepo containing:
* `backend/`: FastAPI Python server (MediaPipe and OpenCV data layer).
* `frontend/`: Vite React application (Light-themed coaching dashboard).
* `mediapipe_code/`: Core landmarks tracking algorithms and prompts.

---

## Prerequisites

Ensure you have the following installed on your machine:
* Python 3.10+
* Node.js 18+ and npm

---

## 1. Quickstart (Zero-Config Setup with Local SQLite)

This application runs completely locally on your system using a built-in, lightweight SQLite database. There is **no need** to install PostgreSQL, run Docker, or configure cloud databases.

### Step 1: Clone and Configure Environment
1. Clone the repository and navigate into the folder:
   ```bash
   git clone <your-repository-url>
   cd kinetic-ai-form-coach
   ```
2. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```
3. Open the `.env` file and insert your Anthropic API Key:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   ```

### Step 2: Start the Python Backend
1. Initialize a Python virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Initialize the local database:
   ```bash
   python backend/init_db.py
   ```
   *This automatically generates a local SQLite database (`backend/kinetic.db`) with all correct tables and seeds a Demo User profile to get you started immediately.*
4. Run the FastAPI backend:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * *Verify Health*: Visit `http://localhost:8000/health` (should return `{"status":"ok"}`).

### Step 3: Start the React Frontend
1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser. You can view the Timeline, upload a squat video, and inspect live feedback dashboards!

---

## Database Management & Audits

### Local SQLite Database
* The database is stored as a binary file at `backend/kinetic.db`. It is untracked by Git to keep your development runs lightweight.
* If you ever want to reset the database and start fresh with empty tables, simply delete the file and run `python backend/init_db.py` again.
