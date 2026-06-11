# Local Testing Guide - Gitcodetesting4

This guide walks you through setting up and testing the analysis screen locally on your device.

## ✅ Pre-flight Checklist

- ✅ Files merged from Gitcodetesting3
  - Frontend pages (ResultsPage, LoadingPage, HomePage, etc.)
  - Backend pipeline (process_video.py, utils, database)
  - Configuration (.env, fixtures)
- ✅ Test fixtures included (form-analysis.clean.json, form-analysis.with-issues.json)
- ✅ Database schema ready (kinetic.db with demo data)

---

## 🚀 Quick Start (5 minutes)

### Terminal 1: Start Backend

```bash
cd Gitcodetesting4/backend
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

Backend will start on: **http://localhost:8000**

Check health: `curl http://localhost:8000/health`

### Terminal 2: Start Frontend

```bash
cd Gitcodetesting4/frontend
npm install  # Only needed first time
npm run dev
```

Frontend will start on: **http://localhost:5173**

---

## 🧪 Testing the Analysis Screen

### Test 1: Upload & Analysis (Complete Flow)
1. Open http://localhost:5173
2. Navigate to upload page
3. Select a test video from `Gitcodetesting3/videos/`
4. Watch the loading screen (ResultsPage showing real-time updates)
5. Verify analysis results display correctly

### Test 2: Mock Results with Fixtures
Frontend can render analysis results directly without a backend:
- Clean form analysis: `fixtures/form-analysis.clean.json`
- Form with issues: `fixtures/form-analysis.with-issues.json`
- Progression comparison: `fixtures/form-comparison.json`

### Test 3: Backend Health
```bash
# Check backend is responding
curl http://localhost:8000/health

# Check database loaded
curl http://localhost:8000/api/user/1 -H "Authorization: Bearer test-token"
```

---

## 📊 What Changed in This Merge

### Frontend Changes
- **ResultsPage.jsx**: Major overhaul of analysis visualization
  - New ScoreRing components with improved color banding
  - Updated chart rendering for rep-by-rep analysis
  - Better progression comparison layout
- **LoadingPage.jsx**: Enhanced streaming UI for real-time updates
- **HomePage.jsx**: Improved navigation and state management
- **uploadService.js**: Better file upload and SSE handling

### Backend Changes
- **process_video.py**: Updated video processing pipeline
- **database.py**: Enhanced schema for analysis results
- **haiku_call_1_system.txt**: Improved form analysis prompts
- **routes/user.py**: Better user data management

---

## 🔧 Troubleshooting

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend connection errors
- Ensure backend is running on port 8000
- Check `.env` file has correct API keys
- Verify database exists: `ls -la backend/kinetic.db`

### Port already in use
```bash
# Frontend (port 5173)
npm run dev -- --port 5174

# Backend (port 8000)
# Edit main.py or use: uvicorn main:app --port 8001
```

### Database issues
```bash
# Reset database to defaults
cd backend
python init_db.py
python load_demo_workout_logs.py
```

---

## 📋 Files Structure

```
Gitcodetesting4/
├── frontend/
│   ├── src/
│   │   ├── pages/          ← Analysis screen pages (updated)
│   │   ├── services/       ← Upload & API services
│   │   ├── App.jsx         ← Main router
│   │   └── data/
│   ├── package.json
│   └── .env.example        ← Copy to .env if needed
├── backend/
│   ├── main.py             ← FastAPI app
│   ├── pipeline/           ← Video processing (updated)
│   ├── prompts/            ← LLM prompts
│   ├── routes/             ← API endpoints
│   ├── .env                ← Configuration (already set)
│   └── kinetic.db          ← SQLite database
├── fixtures/               ← Test data
└── LOCAL_TESTING_GUIDE.md  ← This file
```

---

## ✨ Next Steps After Local Testing

1. **Verify analysis screen works end-to-end**
   - Upload video → Real-time loading screen → Results page
   - Check all score rings and charts render correctly

2. **Test edge cases**
   - Empty/failed analysis (form-analysis.failed.json)
   - Progression comparison with multiple sessions

3. **Performance check**
   - Monitor network tab for SSE streaming
   - Check browser console for any errors

4. **Database seeding**
   - Verify demo workout logs loaded properly
   - Test user history retrieval

---

## 📞 Debugging Tips

### Real-time Logs
```bash
# Backend
python main.py  # Shows all requests/responses

# Frontend (browser console)
F12 → Console → Look for network errors
```

### Test API Directly
```bash
# Start analysis
curl -X POST http://localhost:8000/api/analysis \
  -H "Authorization: Bearer test-token" \
  -F "video=@path/to/video.mp4"

# Stream results
curl http://localhost:8000/api/stream/analysis/1 \
  -H "Authorization: Bearer test-token"
```

---

**Last Updated:** June 11, 2026
**Status:** Ready for local testing ✅
