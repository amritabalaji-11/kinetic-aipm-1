# kinetic-aipm-1
Kinetic AI PM Product - 5May26

An AI form coach for lifting: record a set, get coaching on your form, plan a workout and log it.

- **Backend:** Python / FastAPI, SQLite (`backend/`)
- **Frontend:** React + Vite (`frontend/`)

> This repository is public. Never commit `.env` files, keys, credential JSON files or the database.
> They are git-ignored. Put real values only in your own local `.env` files.

## Run it locally

You need Python 3.10+, Node 18+ and the Google Cloud CLI (see `backend/README.md` for the Google Cloud login).

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate     # first time only
pip install -r requirements.txt
cp .env.example .env                                  # then fill in the values (see below)
uvicorn main:app --reload --port 8000
```

The database (`backend/kinetic.db`) is created and updated automatically when the server starts.
Check it works: <http://localhost:8000/health>

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env                                  # then fill in VITE_GOOGLE_CLIENT_ID
npm run dev
```

Open <http://localhost:5173>.

## Settings you need

Names only. The values are secret or specific to you; `backend/.env.example` and `frontend/.env.example` list everything.

| File | Setting | What it is |
|---|---|---|
| `backend/.env` | `ANTHROPIC_API_KEY` | Claude API key, for form analysis |
| `backend/.env` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Text-to-speech |
| `backend/.env` | `GOOGLE_CLIENT_ID` | The Google sign-in client ID (see below) |
| `backend/.env` | `JWT_SECRET` | A long random string that signs login tokens |
| `backend/.env` | `ALLOW_DEMO_LOGIN` | `true` (default) lets "Try demo" log in as a sample profile. Set `false` in production |
| `backend/.env` | `DEMO_PASSCODE` | The passcode people type to use "Try demo". Set it before the app is reachable from the internet; blank means no passcode |
| `frontend/.env` | `VITE_GOOGLE_CLIENT_ID` | The same Google client ID |

Every screen except the splash needs a login (Google, or a demo guest login). The backend reads who you are from the login
token and only ever shows you your own data.

Make a `JWT_SECRET`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Google sign-in setup

1. In Google Cloud Console go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Choose **Web application**.
3. Under **Authorized JavaScript origins** add `http://localhost:5173` (and your live address when you deploy).
4. Copy the **Client ID** into `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend).
5. Restart both servers. The backend refuses Google sign-in if `GOOGLE_CLIENT_ID` is missing.

The splash screen also has a **Try demo** link to the profile picker, which needs no sign-in.

## How the app is organised

```
backend/
  main.py                  app entry point
  init_db.py               creates and updates the database tables
  db/exercise_catalog.py   the exercise list (one row per exercise and equipment)
  routes/                  auth, workouts, exercises, upload, analysis ...
frontend/src/
  pages/                   one file per screen (splash, plan, planner, logging, home ...)
  components/              reusable pieces (swap sheet, add-exercise sheet ...)
  data/presetWorkouts.js   the ready-made workout plans
  utils/workoutModel.js    how a workout in progress is stored
  App.jsx                  which address opens which screen
```

- **Exercises:** the master list is `backend/db/exercise_catalog.py`. `frontend/src/data/dummyData.js` mirrors it, so change both together.
- **Workout plans** are written in `frontend/src/data/presetWorkouts.js` from the "Day N" programme PDFs.
- **A finished workout** is saved with its name, start and end time, and every ticked set (weight, reps, exercise id).
