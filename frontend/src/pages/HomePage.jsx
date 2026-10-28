import FounderTip from "../components/FounderTip"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { useEffect, useState } from "react"
import { apiFetch } from "../services/api"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { listWorkouts, fromDbTime, pendingAsRows, syncPendingWorkouts } from "../services/workoutService"
import { ArrowRight, Flame } from "lucide-react"
import { TYPE_META, workoutType } from "../utils/workoutType"
import TypeIcon from "../components/TypeIcon"
import { BottomSheet, GradientButton } from "../components/planUi"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const scanStyle = `
  @keyframes scanLine {
    0%   { top: 10%; }
    50%  { top: 80%; }
    100% { top: 10%; }
  }
  .scan-animation {
    animation: scanLine 2s infinite;
  }
`

function Barbell({ color, flip }) {
  const heights = flip ? [30, 22, 14] : [14, 22, 30]
  return (
    <div className="flex items-center gap-0.5">
      {heights.map((h, i) => (
        <div key={i} style={{ width: 3.5, height: h, background: color, borderRadius: 2, opacity: 1 }} />
      ))}
    </div>
  )
}

// --- Last 7 Days helpers ---
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// The 7 days ending today (oldest first), each with the workouts logged that day
function buildWeek(workouts, today = new Date()) {
  const byDay = new Map()
  for (const w of workouts) {
    const d = fromDbTime(w.started_at || w.created_at)
    if (d) byDay.set(dayKey(d), [...(byDay.get(dayKey(d)) || []), w])
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i))
    const list = byDay.get(dayKey(d)) || []
    return {
      day: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      date: d.getDate(),
      fullDate: d,
      isToday: i === 6,
      workouts: list,
      isWorkout: list.length > 0,
    }
  })
}

function weekRangeLabel(week) {
  const first = week[0].fullDate
  const last = week[6].fullDate
  const month = (d) => d.toLocaleDateString("en-US", { month: "short" })
  return first.getMonth() === last.getMonth()
    ? `${month(first)} ${first.getDate()} - ${last.getDate()}`
    : `${month(first)} ${first.getDate()} - ${month(last)} ${last.getDate()}`
}

// The icon for a day with workouts: its type (upper body, legs, full body, cardio), and a count if there were several
function DayIcon({ workouts }) {
  const type = workoutType(workouts[0])
  return (
    <div style={{ position: "relative", width: "30px", height: "30px", borderRadius: "50%", background: TYPE_META[type].tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TypeIcon type={type} size={20} />
      {workouts.length > 1 && (
        <span style={{ position: "absolute", top: "-5px", right: "-6px", minWidth: "15px", height: "15px", borderRadius: "8px", background: "#1E1B4B", color: "#fff", fontSize: "9px", fontWeight: 700, fontFamily: "'DM Sans'", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {workouts.length}
        </span>
      )}
    </div>
  )
}

// Total weight lifted in a workout: reps x weight, summed over every set (kg; pounds are converted)
function totalLiftedKg(workout) {
  let total = 0
  for (const ex of workout.exercises || []) {
    for (const set of ex.sets || []) {
      const weight = Number(set.weight), reps = Number(set.reps)
      if (!(weight > 0) || !(reps > 0)) continue // bodyweight or unfinished sets add nothing
      total += weight * reps * (/lb/i.test(set.weight_unit || "") ? 0.45359237 : 1)
    }
  }
  return Math.round(total)
}

// What was done on the tapped day, with a way into the full workout in History
function DayDetails({ day, onOpen }) {
  const title = day.isToday ? "Today" : day.fullDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  return (
    <div style={{ marginTop: "12px", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.85)", border: "1px solid #FFFFFF" }}>
      <p style={{ margin: "0 0 8px", fontFamily: "'DM Sans'", fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{title}</p>
      {day.workouts.map((w, i) => {
        const type = workoutType(w)
        const meta = TYPE_META[type]
        const started = fromDbTime(w.started_at || w.created_at)
        const exercises = w.exercises || []
        const lifted = totalLiftedKg(w)
        const facts = [started?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), started?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), w.duration_min ? `${w.duration_min} min` : null].filter(Boolean)
        return (
          <div key={w.workout_id || i} style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: i ? "10px" : 0, marginTop: i ? "10px" : 0, borderTop: i ? "1px solid rgba(100,116,139,0.15)" : "none" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: meta.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TypeIcon type={type} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: "15px", lineHeight: 1.2, color: "#0F172A" }}>
                {w.name || w.focus_label || meta.label}{w.pending ? " (not synced yet)" : ""}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: "'DM Sans'", fontSize: "12px", color: "#64748B" }}>{facts.join(" · ")}</p>
              <p style={{ margin: "3px 0 0", fontFamily: "'DM Sans'", fontSize: "13px", color: "#334155" }}>
                {lifted > 0 ? (
                  <><strong style={{ fontFamily: "'Bricolage Grotesque'", fontSize: "18px", color: "#6A1FD6" }}>{lifted.toLocaleString()} kg</strong> lifted</>
                ) : (
                  <>{exercises.length} exercise{exercises.length === 1 ? "" : "s"}, no weights logged</>
                )}
              </p>
            </div>
            <button type="button" onClick={() => onOpen(w)} aria-label={`Open ${w.name || meta.label} in History`} style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "12px", border: "none", cursor: "pointer", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowRight size={20} strokeWidth={2.6} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function HistoryCard({ session }) {
  const navigate = useNavigate()
  const exerciseName = (session.exercise_name || "Session")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const dateLabel = session.created_at
    ? new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const score = session.overall_score ?? 0

  return (
    <button
      type="button"
      onClick={() => navigate("/upload/results", { state: { analysisId: session.session_id } })}
      className="w-full rounded-lg overflow-hidden"
      style={{
        background: "#F4F2FA",
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.14)",
        minHeight: "73px"
      }}
    >
      <div className="p-3 flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex-1 max-w-none"
          style={{
            background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
            borderRadius: "8px"
          }}>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-gray-900 mb-1">{exerciseName}</p>
          <p className="text-[8px] text-gray-500 mb-2">{dateLabel} • 12kg • 12 Reps</p>
          <p className="text-[10px] text-gray-600 leading-tight">Depth held for 6 reps, ankle dorsiflexion limited reps 7-8.</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold" style={{ color: "#FFCC00" }}>{score}</span>
          <span className="text-[8px] text-gray-500">/100</span>
        </div>
      </div>
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { activeUser } = useUser()

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState({})
  const [workouts, setWorkouts] = useState([])

  // Logged workouts drive the "Last 7 Days" card. Workouts that finished but have not reached the server yet
  // count too (and are retried here), so this matches what you actually did.
  useEffect(() => {
    const load = () => listWorkouts().then(setWorkouts).catch(() => setWorkouts([]))
    load()
    if (pendingAsRows().length) syncPendingWorkouts().then(({ sent }) => { if (sent) load() })
  }, [])

  const countable = [...workouts, ...pendingAsRows()]
  const week = buildWeek(countable)
  const weekCount = week.reduce((n, d) => n + d.workouts.length, 0) // workouts in the 7 days shown
  const [selectedDay, setSelectedDay] = useState(null)
  const [showPlanPrompt, setShowPlanPrompt] = useState(false)

  // "Resume your workout": the one in progress, or the one you confirmed but have not started; otherwise ask to plan one
  const resumeWorkout = () => {
    if (localStorage.getItem("activeWorkout")) return navigate("/workout/active")
    if (localStorage.getItem("draftWorkout")) return navigate("/workout/commit")
    setShowPlanPrompt(true)
  }
  const selected = week.find((d) => dayKey(d.fullDate) === selectedDay)
  const toggleDay = (d) => setSelectedDay((cur) => (cur === dayKey(d.fullDate) ? null : dayKey(d.fullDate)))
  const dayProps = (d) =>
    d.isWorkout
      ? {
          role: "button", tabIndex: 0,
          "aria-label": `${d.fullDate.toDateString()}, ${d.workouts.length} workout${d.workouts.length === 1 ? "" : "s"}. Show details`,
          onClick: () => toggleDay(d),
          onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDay(d) } },
        }
      : {}

  useEffect(() => {
    const userId = localStorage.getItem("active_user_id") || "user_001"
    apiFetch(`${BASE_URL}/form_analysis_results/${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        console.log("Form history data:", data)
        if (Array.isArray(data)) {
          setHistory(data)
        }
        setHistoryLoading(false)
      })
      .catch(err => {
        console.error("Error fetching form history:", err)
        setHistoryLoading(false)
      })
  }, [])

  return (
    <div style={{ background: TOP_FADE_BACKGROUND, colorScheme: "light", minHeight: "100vh", paddingBottom: "140px" }}>
      <style>{scanStyle}</style>
      {/* Main Content */}
      {/* paddingTop leaves an empty band of just the background gradient above the greeting (plus the notch on phones that have one) */}
      <div style={{ maxWidth: "430px", margin: "0 auto", padding: "calc(env(safe-area-inset-top, 0px) + 48px) 20px 0px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#0F172A", margin: "0" }}>Hey {activeUser?.name?.split(" ")[0] || "There"}</h1>
            </div>
            <p style={{ fontSize: "14px", fontWeight: 400, color: "#64748B", fontFamily: "'DM Sans'", margin: "0" }}>You're stronger than last week!</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <Barbell color="#4a90d9" />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 900,
                background: "linear-gradient(90deg, #4a90d9 0%, #7c5ce7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.04em",
                fontFamily: "'Bricolage Grotesque'"
              }}
            >
              KINETIC
            </span>
            <Barbell color="#4a90d9" flip />
          </div>
        </div>

        {/* This Week Card */}
        <div style={{
          background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
          border: "1.5px solid #FFFFFF", // white edge so the card stays distinct against the gradient behind it
          boxShadow: "0px 4px 20px rgba(221, 162, 255, 0.14)",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
            <div>
              <p style={{ fontSize: "14px", fontFamily: "'DM Sans'", color: "#000000", marginBottom: "6px" }}>Last 7 Days</p>
              <p style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>{weekRangeLabel(week)}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px 6px 10px", background: "rgba(255, 255, 255, 0.55)", border: "1px solid rgba(255, 255, 255, 0.9)", boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.10)", borderRadius: "999px" }}>
              <Flame size={22} color="#EA580C" fill="#FDBA74" strokeWidth={2} />
              <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "24px", lineHeight: 1, color: "#C2410C" }}>{weekCount}</span>
              <span style={{ fontFamily: "'DM Sans'", fontWeight: 700, fontSize: "12px", lineHeight: 1.15, color: "#475569" }}>
                workout{weekCount === 1 ? "" : "s"}<br />this week
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {week.map((dayData) => (
              <div
                key={dayData.fullDate.toISOString()}
                {...dayProps(dayData)}
                style={{
                  cursor: dayData.isWorkout ? "pointer" : "default",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "10px 8px", gap: "6px", flex: 1, minHeight: "80px", borderRadius: "8px",
                  background: dayData.isWorkout ? "#FFFFFF" : "rgba(255, 255, 255, 0.2)",
                  border: dayData.isToday ? "1.5px solid #7C5CE7" : !dayData.isWorkout ? "1px dashed rgba(156, 156, 156, 0.4)" : "1px solid transparent",
                  boxShadow: dayData.isWorkout ? "0px 4px 10px rgba(102, 76, 226, 0.15)" : "none",
                  ...(selectedDay === dayKey(dayData.fullDate) ? { border: "2px solid #7C5CE7" } : {}),
                }}
              >
                <p style={{ fontSize: "14px", fontWeight: 400, margin: 0, color: dayData.isWorkout ? "#000000" : "#9C9C9C", fontFamily: "'DM Sans'" }}>{dayData.day}</p>
                <p style={{ fontSize: "12px", fontWeight: dayData.isToday ? 700 : 400, margin: "0 0 4px", color: dayData.isWorkout ? "#000000" : "#9C9C9C" }}>{dayData.date}</p>
                {dayData.isWorkout ? (
                  <DayIcon workouts={dayData.workouts} />
                ) : (
                  <div style={{ width: "10px", height: "10px", background: "rgba(156, 156, 156, 0.3)", borderRadius: "50%" }}></div>
                )}
              </div>
            ))}
          </div>
          {(() => {
            const seen = [...new Set(week.flatMap((d) => d.workouts.map(workoutType)))]
            return seen.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 14px", marginTop: "10px" }}>
                {seen.map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                    <TypeIcon type={t} size={14} />
                    {TYPE_META[t].label}
                  </span>
                ))}
              </div>
            )
          })()}
          {selected && <DayDetails day={selected} onOpen={(w) => navigate("/timeline", { state: { openWorkoutId: w.workout_id } })} />}
          <button type="button" onClick={() => navigate("/timeline")} style={{ display: "block", margin: "12px auto 0", padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "13px", fontWeight: 700, color: "#6A1FD6" }}>
            See all workouts →
          </button>
        </div>

        {/* Ready to work out */}
        <div style={{
          background: "#F4F2FA",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          border: "2px solid",
          borderImage: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%) 1"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0 0 8px 0", lineHeight: "1.2" }}>Let's get you to work.</h2>
              <p style={{ fontSize: "12px", color: "#8b8ba7", margin: "0", fontFamily: "'DM Sans'" }}>
                Build your sessions in seconds, then log every set as you crush it.
              </p>
            </div>
            <img
              src="/workout_hero.png"
              alt=""
              style={{ height: "80px", width: "96px", objectFit: "contain", pointerEvents: "none", userSelect: "none", marginTop: "-6px", marginRight: "-6px", flexShrink: 0 }}
            />
          </div>

          {/* CTA Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
            {/* Build Your Workout */}
            <button onClick={() => navigate("/plan")} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "linear-gradient(90deg, #60c8f8 0%, #3b8ef8 30%, #6C5CE7 65%, #a78bfa 100%)",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", margin: "0", fontFamily: "'Bricolage Grotesque'" }}>Build Your Workout</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", margin: "0", fontFamily: "'DM Sans'" }}>Pick a plan, confirm it, then start</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            {/* Resume your workout */}
            <button onClick={resumeWorkout} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
              borderRadius: "8px",
              border: "1px solid rgba(221, 162, 255, 0.3)",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(157.27deg, rgba(249, 218, 210, 0.9) 0%, rgba(151, 71, 255, 0.9) 94.21%, rgba(86, 98, 231, 0.9) 116.73%, rgba(2, 132, 199, 0.9) 164.73%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#000000", margin: "0 0 4px 0", fontFamily: "'Bricolage Grotesque'" }}>Resume your workout</p>
                <p style={{ fontSize: "11px", color: "#000000", margin: "0", opacity: 0.7, fontFamily: "'Bricolage Grotesque'" }}>Pick up where you left off</p>
              </div>
            </button>

            {/* Upload for Analysis */}
            <button onClick={() => navigate("/upload")} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
              borderRadius: "8px",
              border: "1px solid rgba(221, 162, 255, 0.3)",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(158.8deg, #F9DAD2 0%, #DBD4FC 24.98%, #0284C7 100.81%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#000000", margin: "0 0 4px 0", fontFamily: "'Bricolage Grotesque'" }}>Upload for Analysis</p>
                <p style={{ fontSize: "11px", color: "#000000", margin: "0", opacity: 0.7, fontFamily: "'Bricolage Grotesque'" }}>Get your form analyzed instantly</p>
              </div>
            </button>
          </div>
        </div>

        {/* A tip from the founder (was "Your focus this week") */}
        <FounderTip />

        {/* Form History */}
        <div style={{ background: "linear-gradient(135deg, #F9DAD2 0%, #E8D4F8 100%)", borderRadius: "16px", padding: "20px 12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#020D1B", margin: "0" }}>Form History</p>
              <p style={{ fontSize: "14px", fontFamily: "'Bricolage Grotesque'", color: "#39414D", margin: "0" }}>Your last 3 Analyses</p>
            </div>
            <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#39414D", cursor: "pointer" }}>View All</button>
          </div>

          {historyLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: "99px", background: "#F4F2FA", borderRadius: "16px", animation: "pulse 2s infinite" }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", background: "#F4F2FA", borderRadius: "16px" }}>
              <p style={{ fontSize: "14px", color: "#999", marginBottom: "15px" }}>No sessions yet</p>
              <button onClick={() => navigate("/upload")} style={{
                padding: "10px 20px",
                background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "'Bricolage Grotesque'"
              }}>Upload your first video</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {history.map((s, index) => {
                const exerciseName = (s.exercise || "Session").toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const dateLabel = s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown date";
                const score = Math.round(s.score ?? 0);
                const isExpanded = expandedCards[s.analysis_id] || false;
                const feedback = s.feedback || "No feedback available";

                // Construct image URL from formhistory folder if available
                const userId = localStorage.getItem("active_user_id") || "user_001";
                console.log(`Processing history item ${index}, userId:`, userId, "s.image_url:", s.image_url);
                let imageUrl = s.image_url;
                if (!imageUrl) {
                  if (userId === "user_001") {
                    imageUrl = `/formhistory/${userId}/user_001_${index + 1}.jpg`;
                  } else if (userId === "user_003") {
                    imageUrl = `/formhistory/${userId}/user_003_${index + 1}.jpg`;
                  } else if (userId === "user_002") {
                    const user002Images = ["user_002_front_1133.jpg", "user_002_front_45.jpg"];
                    imageUrl = `/formhistory/${userId}/${user002Images[index % user002Images.length]}`;
                    console.log(`📸 user_002 image URL for index ${index}:`, imageUrl);
                  }
                }
                console.log(`Final imageUrl for index ${index}:`, imageUrl);

                // Check if feedback is long enough to warrant truncation
                const lines = feedback.split('\n');
                const needsTruncation = lines.length > 3 || feedback.length > 200;
                const displayFeedback = isExpanded ? feedback : (lines.slice(0, 3).join('\n'));

                return (
                  <div key={s.analysis_id} style={{
                    background: "#F4F2FA",
                    borderRadius: "16px",
                    padding: "10px",
                    display: "flex",
                    gap: "10px",
                    textAlign: "left"
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: "70px",
                      height: "56px",
                      flexShrink: 0,
                      background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      overflow: "hidden"
                    }} onClick={() => navigate("/upload/results", { state: { analysisId: s.analysis_id } })}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={exerciseName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            console.warn("Failed to load image:", imageUrl);
                            e.target.style.display = "none";
                          }}
                          onLoad={() => {
                            console.log("Image loaded:", imageUrl);
                          }}
                        />
                      ) : null}
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9747FF" strokeWidth="1.5" style={{ display: imageUrl ? "none" : "block" }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <button onClick={() => navigate("/upload/results", { state: { analysisId: s.analysis_id } })} style={{ background: "none", border: "none", cursor: "pointer", padding: "0" }}>
                          <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>{exerciseName}</p>
                        </button>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FF8D28", fontFamily: "'Poppins'" }}>{score}</span>
                          <span style={{ fontSize: "7px", fontWeight: 400, color: "#000000", fontFamily: "'Poppins'" }}>/100</span>
                        </div>
                      </div>
                      <p style={{ fontSize: "7px", fontFamily: "'DM Sans'", color: "#39414D", margin: "0", lineHeight: "10px" }}>{dateLabel} • {s.load_kg}Kg • {s.rep_count} Reps</p>
                      <p style={{
                        fontSize: "11px",
                        fontFamily: "'DM Sans'",
                        color: "#000000",
                        margin: "0",
                        lineHeight: "14px",
                        overflow: isExpanded ? "visible" : "hidden",
                        display: isExpanded ? "block" : "-webkit-box",
                        WebkitLineClamp: isExpanded ? "unset" : 3,
                        WebkitBoxOrient: "vertical"
                      }}>
                        {displayFeedback}
                      </p>
                      {needsTruncation && (
                        <button
                          onClick={() => setExpandedCards({ ...expandedCards, [s.analysis_id]: !isExpanded })}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "8px",
                            fontWeight: 600,
                            fontFamily: "'DM Sans'",
                            color: "#0284C7",
                            cursor: "pointer",
                            padding: "0",
                            marginTop: "2px",
                            textAlign: "left"
                          }}
                        >
                          {isExpanded ? "See less" : "See more"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {showPlanPrompt && (
        <BottomSheet
          title="Create today's workout plan"
          onClose={() => setShowPlanPrompt(false)}
          footer={<GradientButton onClick={() => navigate("/plan")}>Choose a workout</GradientButton>}
        >
          <p style={{ fontFamily: "'DM Sans'", fontSize: "15px", color: "#334155", lineHeight: 1.5, margin: "4px 0 0" }}>
            You don&apos;t have a workout in progress. Pick a plan for today and we&apos;ll take it from there.
          </p>
        </BottomSheet>
      )}
      </div>
  )
}
