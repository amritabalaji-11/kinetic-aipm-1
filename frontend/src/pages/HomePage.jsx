import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Bell, CalendarDays, ChevronRight, Dumbbell, List, LayoutGrid, Target } from "lucide-react"
import { useUser } from "../context/UserContext"
import { WEEKLY_CALENDAR, PROGRESS_LADDER, FORM_HISTORY_DETAILED } from "../data/dummyData"

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreBadgeStyle(score) {
  if (score >= 80) return { bg: "#dcfce7", color: "#166534" }
  if (score >= 70) return { bg: "#fef3c7", color: "#92400e" }
  return { bg: "#fee2e2", color: "#991b1b" }
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]
const WEEK_DAYS = [24, 25, 26, 27, 28, 29, 30] // May 24–30

// ─── Week Calendar ────────────────────────────────────────────────────────────

function WeekCalendar({ userId }) {
  const cal = WEEKLY_CALENDAR[userId] || { weekLabel: "May 24 to 30", workoutDays: [], streak: 0 }
  const todayIdx = 3 // Wednesday = index 3 (Sun=0)

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "#f0eeff" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: "#8b8ba7" }}>
            This week
          </p>
          <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>
            {cal.weekLabel}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: "white", color: "#f59e0b" }}
        >
          {cal.streak} Day Streak
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pb-4">
        {DAY_LABELS.map((d, i) => {
          const hasWorkout = cal.workoutDays.includes(i)
          const isToday = i === todayIdx
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold" style={{ color: "#8b8ba7" }}>
                {d}
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: hasWorkout
                    ? "#6C5CE7"
                    : isToday
                    ? "white"
                    : "transparent",
                  border: isToday && !hasWorkout ? "1.5px solid #6C5CE7" : "none",
                }}
              >
                {hasWorkout ? (
                  <Dumbbell size={14} color="white" />
                ) : (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isToday ? "#6C5CE7" : "#c4b9ff" }}
                  >
                    {WEEK_DAYS[i]}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dark CTA Card ────────────────────────────────────────────────────────────

function ReadyCTA() {
  const navigate = useNavigate()
  return (
    <div className="px-4 mb-5">
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8b8ba7" }}>
        Next Up
      </p>
      <p className="text-lg font-black mb-3" style={{ color: "#1a1a2e" }}>
        Ready to work out?
      </p>
      <div
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312e81 100%)" }}
      >
        {/* Top row: heading + figure */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-black text-white leading-snug" style={{ maxWidth: "55%" }}>
            Let's get you to work.
          </h3>
          <img
            src="/workout_hero.png"
            alt=""
            className="h-20 w-24 object-contain pointer-events-none select-none flex-shrink-0"
            style={{ mixBlendMode: "multiply", marginTop: "-6px", marginRight: "-6px" }}
          />
        </div>

        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
          Build your sessions in seconds, then log every set as you crush it.
        </p>

        {/* Build Your Workout */}
        <button
          onClick={() => navigate("/upload")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2"
          style={{ background: "#6C5CE7" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <List size={13} color="white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Build Your Workout</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Quick exercise picker, then hit start
              </p>
            </div>
          </div>
          <ChevronRight size={16} color="white" />
        </button>

        {/* Log Your Workout */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-4"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <LayoutGrid size={13} color="rgba(255,255,255,0.7)" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Log Your Workout</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Track sets, reps, and weights
              </p>
            </div>
          </div>
          <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
        </button>

        {/* When in doubt */}
        <button
          onClick={() => navigate("/upload")}
          className="text-xs text-left"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          When in doubt?{" "}
          <span className="underline font-semibold" style={{ color: "#a29bfe" }}>
            Upload your video to get your form analyzed
          </span>
        </button>
      </div>
    </div>
  )
}

// ─── Progress Ladder ──────────────────────────────────────────────────────────

function ProgressLadder({ userId }) {
  const data = PROGRESS_LADDER[userId]
  if (!data) return null
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="px-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-base font-black" style={{ color: "#1a1a2e" }}>
          Your Progress
        </p>
        <p className="text-xs" style={{ color: "#8b8ba7" }}>
          Tracked by exercise, tap to switch
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {data.tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
            style={
              i === activeTab
                ? { background: "#6C5CE7", color: "white" }
                : { background: "#f0eeff", color: "#6C5CE7" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ladder card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#f0eeff", border: "1px solid #e0d9ff" }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: "#1a1a2e" }}>
          Progress ladder
        </p>
        <p className="text-xs mb-4" style={{ color: "#8b8ba7" }}>
          Form scores typically dip when you load heavier. That's normal.
          Watch your average per rung, not individual sessions.
        </p>

        <div className="space-y-2">
          {data.rungs.map((rung, i) => {
            const isCurrent = rung.label === "Current"
            const isPast = rung.label === "Past"
            const labelColor = rung.label === "Stuck" ? "#f59e0b"
              : isPast ? "#f59e0b"
              : rung.label === "New" ? "#6C5CE7"
              : isCurrent ? "#6C5CE7"
              : "#8b8ba7"

            // Pad to 5 display slots; empty dashed boxes fill the tail
            const shown = rung.sessions.slice(-5)
            const slots = [
              ...shown,
              ...Array(Math.max(0, 5 - shown.length)).fill({ empty: true }),
            ]

            const [weightNum, weightUnit] = rung.weight.split(" ")

            return (
              <div
                key={i}
                className="rounded-2xl p-3.5"
                style={{
                  background: "white",
                  border: isCurrent ? "2px solid #6C5CE7" : "1.5px solid #f0eeff",
                }}
              >
                {/* Single row: weight col + right col (badges + stats) */}
                <div className="flex items-center gap-3">
                  {/* Left: weight / label / subLabel / avg — vertically centred */}
                  <div className="flex-shrink-0" style={{ minWidth: 58 }}>
                    <div className="flex items-baseline gap-0.5 mb-0.5">
                      <span className="font-black" style={{ fontSize: 22, color: "#1a1a2e", lineHeight: 1 }}>
                        {weightNum}
                      </span>
                      <span className="text-xs font-bold" style={{ color: "#8b8ba7" }}>{weightUnit}</span>
                    </div>
                    <p className="text-xs font-bold" style={{ color: labelColor }}>{rung.label}</p>
                    {rung.subLabel && isPast && (
                      <p className="text-xs" style={{ color: labelColor }}>{rung.subLabel}</p>
                    )}
                    <p className="text-xs" style={{ color: isPast ? labelColor : "#8b8ba7" }}>
                      Avg {rung.avgScore}
                    </p>
                  </div>

                  {/* Right: badges on top, stats directly below */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    {/* Badge slots */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {slots.map((s, j) => {
                        if (s.empty) {
                          return (
                            <div
                              key={j}
                              className="flex-shrink-0 rounded-xl"
                              style={{ width: 38, height: 38, border: "1.5px dashed #d4caff" }}
                            />
                          )
                        }
                        if (s.analyzed) {
                          const badge = scoreBadgeStyle(s.score)
                          return (
                            <div
                              key={j}
                              className="flex-shrink-0 rounded-xl flex items-center justify-center"
                              style={{ width: 38, height: 38, background: badge.bg }}
                            >
                              <span className="text-xs font-black" style={{ color: badge.color }}>
                                {s.score}
                              </span>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={j}
                            className="flex-shrink-0 rounded-xl flex items-center justify-center"
                            style={{ width: 38, height: 38, background: "#f0eeff" }}
                          >
                            <Dumbbell size={14} color="#c4b9ff" />
                          </div>
                        )
                      })}
                    </div>

                    {/* Stats directly under badges */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: "#1a1a2e" }}>
                        {rung.totalSessions} sessions
                      </p>
                      {isCurrent && rung.subLabel && (
                        <p className="text-xs" style={{ color: "#8b8ba7" }}>{rung.subLabel}</p>
                      )}
                      <p className="text-xs font-semibold" style={{ color: "#6C5CE7" }}>
                        {rung.analyzedCount} Analyzed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Focus This Week ──────────────────────────────────────────────────────────

function FocusSection({ user }) {
  if (!user?.focus) return null
  return (
    <div className="px-4 mb-5">
      <div
        className="rounded-2xl p-4"
        style={{ background: "#f0eeff", border: "1px solid #e0d9ff" }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}
          >
            <Target size={15} color="white" />
          </div>
          <p className="text-sm font-black" style={{ color: "#1a1a2e" }}>
            {user.focus.title}
          </p>
        </div>
        <p className="text-xs mb-1.5" style={{ color: "#1a1a2e" }}>
          {user.focus.advice}
        </p>
        <p className="text-xs italic" style={{ color: "#8b8ba7" }}>
          {user.focus.tips}
        </p>
      </div>
    </div>
  )
}

// ─── Form History ─────────────────────────────────────────────────────────────

function FormHistoryCard({ item }) {
  const badge = scoreBadgeStyle(item.score)
  return (
    <div
      className="flex gap-3 p-3 rounded-2xl"
      style={{ background: "#f8f7ff", border: "1px solid #e8e4ff" }}
    >
      {/* Thumbnail */}
      <div
        className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #c4b9ff, #a29bfe)" }}
      >
        <img
          src="/muscular_light.png"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.45) saturate(0) contrast(1.2)", mixBlendMode: "multiply" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(108,92,231,0.5), rgba(162,155,254,0.3))" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-xs font-black" style={{ color: "#1a1a2e" }}>
            {item.exercise}
          </p>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            style={{ background: badge.bg, color: badge.color }}
          >
            {item.score}
            <span className="font-normal text-xs">/100</span>
          </span>
        </div>
        <p className="text-xs mb-1" style={{ color: "#8b8ba7" }}>
          {item.date} · {item.weight} · {item.reps}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#4a4a6a" }}>
          {item.feedback}
        </p>
      </div>
    </div>
  )
}

function FormHistory({ userId }) {
  const history = FORM_HISTORY_DETAILED[userId] || []
  return (
    <div className="px-4 pb-32">
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-black" style={{ color: "#1a1a2e" }}>
          Form History
        </p>
        <button className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "#6C5CE7" }}>
          View All <ChevronRight size={13} />
        </button>
      </div>
      <p className="text-xs mb-3" style={{ color: "#8b8ba7" }}>
        Your last 3 Analyses
      </p>
      <div className="space-y-3">
        {history.map((item) => (
          <FormHistoryCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function HomePage() {
  const { activeUser, activeUserId, clearUser } = useUser()
  const navigate = useNavigate()

  if (!activeUser) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-6 pb-3 bg-white">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a1a2e" }}>
            Hey {activeUser.name}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#8b8ba7" }}>
            {activeUser.greeting}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => { clearUser(); navigate("/login") }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#f0eeff" }}
          >
            <CalendarDays size={16} color="#6C5CE7" />
          </button>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#f0eeff" }}
          >
            <Bell size={16} color="#6C5CE7" />
          </button>
        </div>
      </div>

      <WeekCalendar userId={activeUserId} />
      <ReadyCTA />
      <ProgressLadder userId={activeUserId} />
      <FocusSection user={activeUser} />
      <FormHistory userId={activeUserId} />
    </div>
  )
}

export default HomePage
