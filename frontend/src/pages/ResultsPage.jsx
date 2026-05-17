/**
 * ResultsPage — W5 fixture build
 * Current tab:    uses form-analysis.clean.json / form-analysis.with-issues.json
 * Comparison tab: uses form-comparison.json / form-comparison.empty.json
 * Zero API calls — wired in W6.
 */

import { useState, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import FIXTURE_CLEAN        from "../../../fixtures/form-analysis.clean.json"
import FIXTURE_WITH_ISSUES  from "../../../fixtures/form-analysis.with-issues.json"
import FIXTURE_COMPARISON   from "../../../fixtures/form-comparison.json"
import FIXTURE_COMP_EMPTY   from "../../../fixtures/form-comparison.empty.json"

// ─── Colour banding ───────────────────────────────────────────────────────────
function ringColor(score) {
  if (score >= 75) return { stroke: "#f59e0b", text: "#f59e0b" }
  if (score >= 50) return { stroke: "#f59e0b", text: "#f59e0b" }
  return              { stroke: "#ef4444", text: "#ef4444" }
}

// ─── SVG score ring ───────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, strokeW = 8, delta = null, label = "" }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const c    = ringColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={c.stroke} strokeWidth={strokeW}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none gap-0.5">
          <span className="font-bold text-xl" style={{ color: c.text }}>{score}</span>
          {delta !== null && (
            <span
              className="text-[10px] font-bold"
              style={{ color: delta >= 0 ? "#6366f1" : "#ef4444" }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-[11px] text-gray-400 text-center leading-tight">{label}</span>
      )}
    </div>
  )
}

// ─── SVG line chart ───────────────────────────────────────────────────────────
function LineChart({ repScores, color = "#6366f1", gradientColor = "#818cf8" }) {
  const W = 300, H = 120, PAD = 14
  if (!repScores || repScores.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-gray-400">
        Not enough reps to chart
      </div>
    )
  }
  const n   = repScores.length
  const min = Math.min(...repScores) - 8
  const max = Math.max(...repScores) + 8
  const xOf = (i) => PAD + (i / (n - 1)) * (W - PAD * 2)
  const yOf = (v) => PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2)
  const pts = repScores.map((v, i) => [xOf(i), yOf(v)])

  const linePt = pts.map(([x, y]) => `${x},${y}`).join(" ")
  const areaPt = [
    `${pts[0][0]},${H - PAD}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${H - PAD}`,
  ].join(" ")

  const diff       = repScores[repScores.length - 1] - repScores[0]
  const trendLabel = diff < 0 ? `${diff}% Dip` : `+${diff}`
  const trendBg    = "#22c55e"

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">Performance Over Reps</div>
          <div className="text-xs text-gray-400">Consistency Analysis</div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white mt-0.5"
          style={{ backgroundColor: trendBg }}>
          {trendLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={gradientColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i}
            x1={PAD} y1={PAD + t * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke="#e5e7eb" strokeWidth="0.5"
          />
        ))}
        <polygon points={areaPt} fill={`url(#grad-${color})`} />
        <polyline points={linePt} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="white" stroke={color} strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  )
}

// ─── Issue card ───────────────────────────────────────────────────────────────
function IssueCard({ issue }) {
  const cls =
    issue.severity === "High"   ? "bg-red-50 border-red-100 text-red-700"
  : issue.severity === "Medium" ? "bg-amber-50 border-amber-100 text-amber-700"
  : "bg-gray-50 border-gray-100 text-gray-600"
  return (
    <div className={`rounded-xl p-3 border ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">{issue.title}</span>
        <span className="text-[10px] uppercase tracking-wide font-medium opacity-70">{issue.severity}</span>
      </div>
      <p className="text-xs leading-snug opacity-80">{issue.detail}</p>
    </div>
  )
}

// ─── Frame placeholder with glowing dots ─────────────────────────────────────
function FramePlaceholder({ highlight = false, label, weight }) {
  return (
    <div className="flex flex-col items-center py-3 px-2 flex-1">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-xs font-semibold text-gray-700 mb-2">{weight}</div>
      <div className="relative h-28 w-full flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
        <div className="w-14 h-24 bg-gray-200 rounded-full opacity-30" />
        {highlight && (
          <>
            <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-300" />
            <div className="absolute top-12 left-10 w-3 h-3 rounded-full bg-amber-300 shadow-lg shadow-amber-200" />
            <div className="absolute bottom-5 left-14 w-3 h-3 rounded-full bg-amber-200 shadow-lg shadow-amber-100" />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Params config ────────────────────────────────────────────────────────────
const PARAMS = [
  { key: "posture",          summaryKey: "posture",          label: "Range of Motion", compKey: "posture"          },
  { key: "stability",        summaryKey: "stability",        label: "Stability",       compKey: "stability"        },
  { key: "movement_quality", summaryKey: "movement_quality", label: "Joint Angle",     compKey: "movement_quality" },
  { key: "velocity",         summaryKey: "tempo",            label: "Velocity",        compKey: "tempo"            },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  const [tab,        setTab]        = useState("current")
  const [devFixture, setDevFixture] = useState("clean")
  const [devComp,    setDevComp]    = useState("with-data") // "with-data" | "empty"

  // Current session data
  const data = useMemo(() => {
    if (state?.analysisResult) return state.analysisResult
    return devFixture === "clean" ? FIXTURE_CLEAN : FIXTURE_WITH_ISSUES
  }, [state?.analysisResult, devFixture])

  // Comparison fixture
  const compData = devComp === "with-data" ? FIXTURE_COMPARISON : FIXTURE_COMP_EMPTY

  const isDevMode    = !state?.analysisResult
  const isComparison = tab === "comparison"

  // ── Current session fields ────────────────────────────────────────────────
  const summary  = data.summary  || {}
  const coaching = data.coaching || {}
  const params   = coaching.parameters || {}
  const reps     = data.reps   || []
  const issues   = data.issues || []

  const overall   = summary.overall_form_score ?? 0
  const repScores = reps.map((r) => r.form_score ?? 0)

  const headerExercise = (data.display_name || data.exercise_id || "Session").toUpperCase()
  const headerWeight   =
    data.weight_value != null && data.weight_unit
      ? `${data.weight_value}${data.weight_unit.toUpperCase()}`
      : "—"

  const statusFailed =
    data.status === "failed" || (overall === 0 && reps.length === 0 && issues.length > 0)

  // ── Comparison fields ─────────────────────────────────────────────────────
  const hasComparison  = compData.has_comparison
  const compCurrent    = compData.current    || {}
  const compPrevious   = compData.previous   || {}
  const compCoaching   = compData.comparison_coaching || {}
  const compParams     = compCoaching.parameters || {}

  // Compute deltas: current score − previous score
  function delta(currentScore, previousScore) {
    if (currentScore == null || previousScore == null) return null
    return currentScore - previousScore
  }

  const today = new Date()
  const fmt   = (d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric" })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto pb-10">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="pt-6 pb-3 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900 tracking-widest">{headerExercise}</h1>
        </div>

        {/* ── Tab toggle ────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4 flex bg-gray-100 rounded-xl p-1 border border-gray-200">
          {["current", "comparison"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-white text-gray-900 shadow-sm font-semibold" : "text-gray-400"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            COMPARISON TAB
        ════════════════════════════════════════════════════════════════ */}
        {isComparison && (
          <>
            {!hasComparison ? (
              // ── Empty state ──────────────────────────────────────────
              <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="text-3xl mb-3">📊</div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {compData.empty_state_message}
                </p>
              </div>
            ) : (
              <>
                {/* Side-by-side frames */}
                <div className="mx-4 mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white flex divide-x divide-gray-100">
                  <FramePlaceholder
                    label={compPrevious.date_label || "Previous"}
                    weight={`${compPrevious.weight_value}${(compPrevious.weight_unit || "kg").toUpperCase()}`}
                    highlight={false}
                  />
                  <FramePlaceholder
                    label={compCurrent.date_label || "Current"}
                    weight={`${compCurrent.weight_value}${(compCurrent.weight_unit || "kg").toUpperCase()}`}
                    highlight={true}
                  />
                </div>

                {/* Comparison form score */}
                <div className="mx-4 mb-4 bg-amber-50 rounded-2xl p-5 text-center border border-amber-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Form Score</div>
                  <div className="text-6xl font-extrabold mb-1" style={{ color: "#f59e0b" }}>
                    {compCurrent.overall_form_score ?? overall}
                  </div>
                  {compPrevious.overall_form_score != null && (
                    <div
                      className="text-sm font-semibold mb-2"
                      style={{
                        color: (compCurrent.overall_form_score - compPrevious.overall_form_score) >= 0
                          ? "#6366f1" : "#ef4444"
                      }}
                    >
                      {compCurrent.overall_form_score - compPrevious.overall_form_score > 0 ? "+" : ""}
                      {compCurrent.overall_form_score - compPrevious.overall_form_score} vs last session
                    </div>
                  )}
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {compCoaching.summary_paragraph || ""}
                  </p>
                </div>

                {/* Comparison key insights with deltas */}
                <div className="mx-4 mb-4">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Key Insights</h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 px-4">
                    {PARAMS.map((p) => {
                      const cp     = compParams[p.compKey] || {}
                      const score  = cp.score ?? compCurrent[`${p.summaryKey}_score`] ?? 0
                      const prev   = compPrevious[`${p.summaryKey}_score`] ?? null
                      const d      = delta(score, prev)
                      const note   = cp.observation_action ?? "No additional notes."

                      return (
                        <div key={p.key} className="flex items-start gap-4 py-4">
                          <ScoreRing score={score} size={80} strokeW={8} delta={d} label={p.label} />
                          <p className="text-sm text-gray-600 leading-relaxed pt-2 flex-1">{note}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Comparison rep charts side by side */}
                <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <LineChart
                    repScores={compCurrent.reps?.map((r) => r.form_score) || []}
                    color="#6366f1"
                    gradientColor="#818cf8"
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CURRENT TAB
        ════════════════════════════════════════════════════════════════ */}
        {!isComparison && (
          <>
            {/* Frame placeholder */}
            <div className="mx-4 mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <div className="text-center py-2 text-xs text-gray-500">
                {today.toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {headerWeight}
              </div>
              {state?.videoPreviewUrl ? (
                <video
                  src={state.videoPreviewUrl}
                  className="w-full aspect-video object-cover"
                  muted playsInline controls
                />
              ) : (
                <div className="h-52 bg-gray-50 flex flex-col items-center justify-center gap-2 relative">
                  <div className="relative">
                    <div className="w-24 h-36 bg-gray-200 rounded-full opacity-30" />
                    <div className="absolute top-8 left-2 w-3 h-3 rounded-full bg-red-400 shadow-lg shadow-red-300" />
                    <div className="absolute top-16 left-8 w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-300" />
                    <div className="absolute bottom-4 left-12 w-3 h-3 rounded-full bg-amber-300 shadow-lg shadow-amber-200" />
                  </div>
                  <p className="text-xs text-gray-400">Frame analysis coming soon</p>
                </div>
              )}
            </div>

            {/* Failed banner */}
            {statusFailed && (
              <div className="mx-4 mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                This session didn't produce a full form score — see coaching notes below.
              </div>
            )}

            {/* Form score */}
            <div className="mx-4 mb-4 bg-amber-50 rounded-2xl p-5 text-center border border-amber-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Form Score</div>
              <div className="text-6xl font-extrabold mb-2" style={{ color: "#f59e0b" }}>{overall}</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {coaching.summary_paragraph || "Lets stay in this weight and keep on improving!"}
              </p>
            </div>

            {/* Key Insights */}
            <div className="mx-4 mb-4">
              <h2 className="text-base font-bold text-gray-900 mb-3">Key Insights</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 px-4">
                {PARAMS.map((p) => {
                  const d     = params[p.key] || {}
                  const score = Math.round(d.score ?? summary?.[`${p.summaryKey}_score`] ?? 0)
                  const note  = d.observation ?? d.affirmation ?? d.correction ?? "No additional notes."
                  return (
                    <div key={p.key} className="flex items-start gap-4 py-4">
                      <ScoreRing score={score} size={80} strokeW={8} label={p.label} />
                      <p className="text-sm text-gray-600 leading-relaxed pt-2 flex-1">{note}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Issues */}
            {issues.length > 0 && (
              <div className="mx-4 mb-4 space-y-2">
                <h2 className="text-base font-bold text-gray-900">Issues Detected</h2>
                {issues.map((issue) => (
                  <IssueCard key={issue.id || issue.title} issue={issue} />
                ))}
              </div>
            )}

            {/* Rep chart */}
            <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <LineChart repScores={repScores} />
            </div>
          </>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mx-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/timeline")}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-700 text-sm font-semibold bg-white"
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold"
            style={{ backgroundColor: "#4dd9c0" }}
          >
            New Upload
          </button>
        </div>

        {/* ── Dev toggles ───────────────────────────────────────────────── */}
        {isDevMode && (
          <div className="mt-6 mx-4 text-center text-xs text-gray-400 space-y-3 pt-4 border-t border-gray-100">
            <div className="space-y-1">
              <div className="font-medium">Current fixture</div>
              <div className="flex justify-center gap-4">
                {["clean", "issues"].map((f) => (
                  <button key={f} type="button" onClick={() => setDevFixture(f)}
                    className={`underline ${devFixture === f ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "clean" ? "no issues" : "with issues"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">Comparison fixture</div>
              <div className="flex justify-center gap-4">
                {["with-data", "empty"].map((f) => (
                  <button key={f} type="button" onClick={() => setDevComp(f)}
                    className={`underline ${devComp === f ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "with-data" ? "with data" : "empty state"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

