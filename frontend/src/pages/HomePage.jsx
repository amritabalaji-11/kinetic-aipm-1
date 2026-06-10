import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function ScoreRing({ score, size = 44, strokeW = 4 }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const color = score >= 80 ? "#22C55E" : score >= 65 ? "#F97316" : "#EF4444"
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function HistoryCard({ session, onPress }) {
  const navigate = useNavigate()
  const exerciseName = (session.exercise_name || "Session")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const dateLabel = session.created_at
    ? new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const score = session.overall_score ?? 0
  const repCount = session.rep_count ?? null
  const frameUrl = session.annotated_frame_urls?.[0]
    ? `${BASE_URL}/${session.annotated_frame_urls[0]}`
    : null

  return (
    <button
      type="button"
      onClick={() => navigate("/upload/results", { state: { analysisId: session.session_id } })}
      className="w-full flex items-center gap-3 bg-white rounded-2xl px-3 py-3 text-left"
      style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
        {frameUrl ? (
          <img src={frameUrl} alt="Session frame" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{exerciseName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {dateLabel && <span className="text-xs text-gray-400">{dateLabel}</span>}
          {repCount != null && <span className="text-xs text-gray-400">{repCount} reps</span>}
        </div>
      </div>
      <ScoreRing score={score} />
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const firstName = activeUser?.name?.split(" ")[0] || "There"

  const [ladderUrl,     setLadderUrl]     = useState(null)
  const [ladderLoading, setLadderLoading] = useState(true)
  const [history,       setHistory]       = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem("user_id") || "dev-user"
    fetch(`${BASE_URL}/users/${userId}/profile-images`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setLadderUrl(d?.progress_ladder_image_url ?? null); setLadderLoading(false) })
      .catch(() => setLadderLoading(false))
  }, [])

  useEffect(() => {
    const userId = localStorage.getItem("user_id") || "dev-user"
    fetch(`${BASE_URL}/history/${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setHistory(sorted.slice(0, 3))
        }
        setHistoryLoading(false)
      })
      .catch(() => setHistoryLoading(false))
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#F4F2FA", colorScheme: "light" }}>
      <div className="max-w-sm mx-auto px-4 pt-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Welcome back</p>
            <h1 className="text-xl font-extrabold text-gray-900">{firstName} 👋</h1>
          </div>
          <button type="button" onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
            <span className="text-white text-sm font-bold">{activeUser?.initials || "U"}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-white text-[10px] font-semibold leading-tight text-center">Upload Video</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-white"
            style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <svg className="w-5 h-5" style={{ color: "#664CE2" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-[10px] font-semibold leading-tight text-center text-gray-600">Build Workout</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-white"
            style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <svg className="w-5 h-5" style={{ color: "#664CE2" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-[10px] font-semibold leading-tight text-center text-gray-600">Log Workout</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 mb-5" style={{ border: "1.5px solid #c7d2fe" }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Progress Ladder</h2>
          {ladderLoading ? (
            <div className="w-full rounded-xl animate-pulse bg-gray-200" style={{ height: 180 }} />
          ) : ladderUrl ? (
            <img src={ladderUrl} alt="Progress ladder" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
          ) : (
            <div className="w-full rounded-xl flex items-center justify-center bg-gray-50" style={{ height: 160 }}>
              <div className="text-center px-4">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-xs text-gray-400">Complete a session to see your progress ladder</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Recent Sessions</h2>
            <button type="button" onClick={() => navigate("/timeline")} className="text-xs font-semibold" style={{ color: "#0284C7" }}>
              View all
            </button>
          </div>
          {historyLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-2xl animate-pulse bg-white" style={{ border: "1px solid #f3f4f6" }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center" style={{ border: "1px solid #f3f4f6" }}>
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-sm text-gray-400">No sessions yet</p>
              <button type="button" onClick={() => navigate("/upload")}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
                Upload your first video
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(s => <HistoryCard key={s.session_id} session={s} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}