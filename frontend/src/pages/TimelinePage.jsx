import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, Award, TrendingUp, User, ChevronRight, Activity } from "lucide-react"

export default function TimelinePage() {
  const navigate = useNavigate()
  
  // Profile filter toggle: "batch" or "local"
  const [profileFilter, setProfileFilter] = useState("batch")
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
  
  const localUserId = localStorage.getItem("user_id")
  const batchUserId = "00000000-0000-0000-0000-000000000000"
  const activeUserId = profileFilter === "batch" ? batchUserId : localUserId

  // Fetch session history from SQLite DB
  useEffect(() => {
    async function fetchHistory() {
      if (!activeUserId) {
        setSessions([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const response = await fetch(`${BASE_URL}/history/${activeUserId}`)
        if (response.ok) {
          const list = await response.json()
          if (Array.isArray(list)) {
            // Sort by created_at descending
            list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            setSessions(list)
          } else {
            setSessions([])
          }
        } else {
          setSessions([])
        }
      } catch (err) {
        console.error("Failed to fetch timeline history:", err)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [activeUserId, BASE_URL])

  // Navigate to results page with router state
  function handleSessionClick(sessionId) {
    navigate("/upload/results", { state: { analysisId: sessionId } })
  }

  // Color banding for overall score
  function getScoreColorClass(score) {
    if (score >= 80) return "text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40"
    if (score >= 60) return "text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40"
    return "text-red-500 bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40"
  }

  // Color dot for progress indicators
  function getScoreDotClass(score) {
    if (score >= 80) return "bg-emerald-500 shadow-emerald-400"
    if (score >= 60) return "bg-amber-500 shadow-amber-400"
    return "bg-red-500 shadow-red-400"
  }

  // SVG Line Chart of Scores Progression (requires at least 2 sessions)
  function renderProgressionChart() {
    if (sessions.length < 2) return null
    
    // Sort chronological (oldest to newest) for plotting
    const chrono = [...sessions].reverse()
    const scores = chrono.map(s => Number(s.overall_score || 0))
    
    const W = 450, H = 140, PAD = 20
    const n = chrono.length
    const minVal = Math.min(...scores) - 8
    const maxVal = Math.max(...scores) + 8
    
    const xOf = (i) => PAD + (i / (n - 1)) * (W - PAD * 2)
    const yOf = (v) => PAD + (1 - (v - minVal) / (maxVal - minVal)) * (H - PAD * 2)
    
    const pts = chrono.map((s, i) => [xOf(i), yOf(scores[i])])
    const linePath = pts.map(([x, y]) => `${x},${y}`).join(" ")
    const areaPath = [
      `${pts[0][0]},${H - PAD}`,
      ...pts.map(([x, y]) => `${x},${y}`),
      `${pts[pts.length - 1][0]},${H - PAD}`,
    ].join(" ")

    const latestDiff = chrono[chrono.length - 1].overall_score - chrono[0].overall_score
    const trendLabel = latestDiff >= 0 ? `+${latestDiff} Overall` : `${latestDiff} Dip`
    const trendClass = latestDiff >= 0 ? "bg-emerald-500" : "bg-red-500"

    return (
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl p-5 shadow-sm mb-6 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal" />
              Form Progression
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Longitudinal consistency and performance</p>
          </div>
          <span className={`text-[10px] uppercase font-bold text-white px-2.5 py-0.5 rounded-full ${trendClass}`}>
            {trendLabel}
          </span>
        </div>
        
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4dd9c0" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4dd9c0" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            
            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map((t, i) => (
              <line key={i}
                x1={PAD} y1={PAD + t * (H - PAD * 2)}
                x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
                stroke="#f1f5f9" className="dark:stroke-gray-800" strokeWidth="1"
              />
            ))}
            
            {/* Filled Area */}
            <polygon points={areaPath} fill="url(#chartGrad)" />
            
            {/* Smooth line */}
            <polyline points={linePath} fill="none" stroke="#4dd9c0" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            
            {/* Dots */}
            {pts.map(([x, y], i) => (
              <g key={i} className="group cursor-pointer">
                <circle cx={x} cy={y} r={4.5} fill="white" stroke="#4dd9c0" strokeWidth="2.5" />
                <circle cx={x} cy={y} r={10} fill="transparent" />
              </g>
            ))}
          </svg>
        </div>
        
        {/* Dates label footer */}
        <div className="flex justify-between text-[9px] font-semibold text-gray-400 dark:text-gray-500 mt-2 px-1">
          <span>{new Date(chrono[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>{chrono.length} Sessions Complete</span>
          <span>{new Date(chrono[chrono.length - 1].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg font-sans pb-10">
      <div className="max-w-md mx-auto px-4">
        
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="pt-6 pb-4 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Activity className="w-5 h-5 text-teal animate-pulse" />
            Workout History
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Select and track your exercise progression</p>
        </div>

        {/* ── Profile Filter Toggle ─────────────────────────────────────── */}
        <div className="flex bg-white dark:bg-dark-card rounded-2xl p-1.5 border border-gray-100 dark:border-dark-border shadow-sm mb-6">
          <button
            onClick={() => setProfileFilter("batch")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              profileFilter === "batch"
                ? "bg-teal text-white shadow-sm font-extrabold"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Batch Test Runs
          </button>
          
          <button
            onClick={() => setProfileFilter("local")}
            disabled={!localUserId}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
              profileFilter === "local"
                ? "bg-teal text-white shadow-sm font-extrabold"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            My Local Uploads
          </button>
        </div>

        {/* ── Analytics Line Chart ─────────────────────────────────────── */}
        {renderProgressionChart()}

        {/* ── Timeline list ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {loading ? "Syncing..." : `${sessions.length} Completed Sets`}
            </h2>
          </div>
          
          {loading ? (
            // Loading skeleton spinner
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-gray-400">Syncing progression history from SQLite DB...</p>
            </div>
          ) : sessions.length === 0 ? (
            // Empty state
            <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border p-8 text-center shadow-sm">
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-white mb-1">No completed runs found</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto leading-relaxed mb-4">
                {profileFilter === "batch"
                  ? "There are no batch workouts in the SQLite DB right now."
                  : "Upload your first squat video inside the scanner tab to launch real-time coaching!"}
              </p>
              <button
                onClick={() => navigate("/upload")}
                className="bg-teal text-white font-bold text-xs px-5 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shadow-teal/20"
              >
                Scan Form Now
              </button>
            </div>
          ) : (
            // History Card List
            <div className="space-y-3">
              {sessions.map((s, idx) => {
                const dateObj = new Date(s.created_at)
                const dateLabel = dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })
                const timeLabel = dateObj.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit"
                })
                
                const score = Number(s.overall_score || 0)
                
                // Formulate session subtitle
                const exName = (s.exercise_name || "goblet-squat")
                  .toUpperCase()
                  .replaceAll("-", " ")
                  .replaceAll("_", " ")
                const weightLabel = s.weight_value != null
                  ? `${s.weight_value} ${(s.weight_unit || "lbs").toUpperCase()}`
                  : "—"
                  
                return (
                  <div
                    key={s.session_id}
                    onClick={() => handleSessionClick(s.session_id)}
                    className="group bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border hover:border-teal/30 dark:hover:border-teal/40 rounded-3xl p-4 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between gap-4 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Left: Score Badge */}
                      <div className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center font-extrabold text-sm ${getScoreColorClass(score)}`}>
                        {score}%
                      </div>
                      
                      {/* Mid: Workout details */}
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-extrabold text-gray-800 dark:text-white group-hover:text-teal transition-colors">
                          {exName}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold dark:text-gray-400">
                          {weightLabel} · {s.rep_count || 0} Reps
                        </p>
                        
                        {/* Date and time */}
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{dateLabel} at {timeLabel}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: navigation indicator */}
                    <div className="flex items-center gap-1.5">
                      {/* Indicator dot */}
                      <div className={`w-2 h-2 rounded-full shadow-md ${getScoreDotClass(score)}`} />
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}