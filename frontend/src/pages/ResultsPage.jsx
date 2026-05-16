/**
 * ResultsPage — W5 fixture build
 *
 * All data comes from fixture JSON passed via route state (from LoadingPage).
 * Falls back to importing fixtures directly if navigated to directly in dev.
 * Zero API calls — wired in W6.
 *
 * Acceptance criteria:
 * ✓ Score ring with colour banding: 0–49 red, 50–74 amber, 75–100 green
 * ✓ Four parameter cards: Posture, Stability, Movement Quality, Tempo
 * ✓ Rep-by-rep bar chart
 * ✓ "No issues" fixture renders cleanly
 * ✓ "With issues" fixture renders issue cards
 * ✓ Weight progression chip placeholder
 * ✓ Annotated frame placeholder
 * ✓ Dev fixture toggle at bottom
 */

import { useState, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import FIXTURE_CLEAN       from "../../../fixtures/form-analysis.clean.json"
import FIXTURE_WITH_ISSUES from "../../../fixtures/form-analysis.with-issues.json"

// ─── Score ring colour banding ────────────────────────────────────────────────
function ringColor(score) {
  if (score >= 75) return { stroke: "#2dd4bf", text: "text-teal-500", bg: "bg-teal-50",  label: "Good"  }
  if (score >= 50) return { stroke: "#f59e0b", text: "text-amber-500", bg: "bg-amber-50", label: "Fair"  }
  return              { stroke: "#ef4444", text: "text-red-500",   bg: "bg-red-50",   label: "Needs work" }
}

// ─── SVG score ring ───────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, stroke = 9 }) {
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = ringColor(score)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color.stroke}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-base font-bold ${color.text}`}>{score}</span>
    </div>
  )
}

// ─── Rep bar chart ────────────────────────────────────────────────────────────
function RepChart({ repScores }) {
  if (!repScores || repScores.length === 0) return null
  const max    = 100
  const barW   = Math.max(16, Math.min(36, Math.floor(280 / repScores.length) - 6))

  return (
    <div className="flex items-end gap-1.5 h-28 px-1">
      {repScores.map((score, i) => {
        const color = ringColor(score)
        const pct   = (score / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] text-gray-400">{score}</span>
            <div
              className="rounded-t w-full"
              style={{
                height: `${pct}%`,
                minHeight: 4,
                backgroundColor: color.stroke,
              }}
            />
            <span className="text-[9px] text-gray-400">R{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Parameter card ───────────────────────────────────────────────────────────
function ParamCard({ title, data, summaryKey, summary }) {
  const score = Math.round(
    data?.score ?? summary?.[`${summaryKey}_score`] ?? 0
  )
  const color = ringColor(score)
  const note  = data?.observation ?? data?.affirmation ?? data?.correction ?? "No additional notes."

  // Derive 2–3 tip chips from the correction text if available
  const tips = []
  if (data?.correction && data.correction !== note) tips.push(data.correction)

  return (
    <div className={`rounded-xl p-4 border ${color.bg} border-gray-100`}>
      <div className="flex items-center gap-4">
        <ScoreRing score={score} size={64} stroke={7} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{note}</div>
        </div>
      </div>
      {tips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tips.map((tip, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600"
            >
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Issue card ───────────────────────────────────────────────────────────────
function IssueCard({ issue }) {
  const severityColor =
    issue.severity === "High"   ? "text-red-500 bg-red-50 border-red-100"
  : issue.severity === "Medium" ? "text-amber-600 bg-amber-50 border-amber-100"
  : "text-gray-500 bg-gray-50 border-gray-100"

  return (
    <div className={`rounded-lg p-3 border ${severityColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">{issue.title}</span>
        <span className="text-[10px] uppercase tracking-wide font-medium">{issue.severity}</span>
      </div>
      <p className="text-xs leading-snug opacity-80">{issue.detail}</p>
    </div>
  )
}

// ─── Parameter definitions ────────────────────────────────────────────────────
const PARAMS = [
  { key: "posture",          summaryKey: "posture",          title: "Posture"           },
  { key: "stability",        summaryKey: "stability",        title: "Stability"         },
  { key: "movement_quality", summaryKey: "movement_quality", title: "Movement Quality"  },
  { key: "velocity",         summaryKey: "tempo",            title: "Tempo"             },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  // Dev toggle — only visible when no real result was passed
  const [devFixture, setDevFixture] = useState("clean")

  const data = useMemo(() => {
    // Real result passed from LoadingPage → use it
    if (state?.analysisResult) return state.analysisResult
    // Dev fallback: toggle between fixtures
    return devFixture === "clean" ? FIXTURE_CLEAN : FIXTURE_WITH_ISSUES
  }, [state?.analysisResult, devFixture])

  const isDevMode = !state?.analysisResult

  const summary  = data.summary  || {}
  const coaching = data.coaching || {}
  const params   = coaching.parameters || {}
  const reps     = data.reps     || []
  const issues   = data.issues   || []

  const overall    = summary.overall_form_score ?? 0
  const repScores  = reps.map((r) => r.form_score ?? 0)
  const overallColor = ringColor(overall)

  const headerExercise = data.display_name || data.exercise_id || "Session"
  const headerWeight   =
    data.weight_value != null && data.weight_unit
      ? `${data.weight_value} ${data.weight_unit}`
      : "—"

  const statusFailed =
    data.status === "failed" || (overall === 0 && reps.length === 0 && issues.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-sm mx-auto space-y-5 px-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center text-sm text-gray-400 font-medium">
          {headerExercise} · {headerWeight}
        </div>

        {/* ── Annotated frame placeholder ─────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {state?.videoPreviewUrl ? (
            <video
              src={state.videoPreviewUrl}
              className="w-full aspect-video object-cover"
              controls
              muted
              playsInline
            />
          ) : (
            <div className="h-52 bg-gray-100 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-xl">🎞</span>
              </div>
              <p className="text-xs text-gray-400">Frame analysis coming soon</p>
            </div>
          )}
        </div>

        {/* ── Failed state banner ─────────────────────────────────────────── */}
        {statusFailed && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
            This session didn't produce a full form score — see coaching notes below.
          </div>
        )}

        {/* ── Overall score ring ───────────────────────────────────────────── */}
        <div className={`rounded-xl p-5 text-center ${overallColor.bg} border border-gray-100`}>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Form Score</div>
          <div className="flex justify-center mb-3">
            <ScoreRing score={overall} size={100} stroke={11} />
          </div>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${overallColor.text}`}>
            {overallColor.label}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {coaching.summary_paragraph || "Let's stay at this weight and keep improving!"}
          </p>
        </div>

        {/* ── Weight progression chip ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <span className="text-lg">📈</span>
          <p className="text-xs text-gray-600">
            Your form at this weight is solid — keep going.
          </p>
        </div>

        {/* ── Parameter cards ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Key Parameters</h3>
          {PARAMS.map((p) => (
            <ParamCard
              key={p.key}
              title={p.title}
              data={params[p.key]}
              summaryKey={p.summaryKey}
              summary={summary}
            />
          ))}
        </div>

        {/* ── Issues ───────────────────────────────────────────────────────── */}
        {issues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Issues Detected</h3>
            {issues.map((issue) => (
              <IssueCard key={issue.id || issue.title} issue={issue} />
            ))}
          </div>
        )}

        {/* ── Rep-by-rep chart ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Rep-by-Rep Performance</h3>
          <p className="text-xs text-gray-400 mb-3">Consistency across the set</p>
          {repScores.length > 0 ? (
            <RepChart repScores={repScores} />
          ) : (
            <div className="h-20 flex items-center justify-center text-xs text-gray-400">
              No rep scores in this fixture
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/timeline")}
            className="flex-1 py-3 rounded-xl border border-teal-200 text-teal-700 text-sm font-medium"
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="flex-1 py-3 rounded-xl bg-teal-400 text-white text-sm font-semibold"
          >
            New Upload
          </button>
        </div>

        {/* ── Dev fixture toggle ────────────────────────────────────────────── */}
        {isDevMode && (
          <div className="text-center text-xs text-gray-400 space-y-2 pt-2 border-t border-gray-100">
            <div>Dev mode — fixture preview</div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDevFixture("clean")}
                className={`underline ${devFixture === "clean" ? "text-teal-600 font-semibold" : "text-gray-400"}`}
              >
                clean (no issues)
              </button>
              <button
                type="button"
                onClick={() => setDevFixture("issues")}
                className={`underline ${devFixture === "issues" ? "text-teal-600 font-semibold" : "text-gray-400"}`}
              >
                with issues
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
