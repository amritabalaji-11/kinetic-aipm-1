/**
 * ResultsPage — W5 fixture build
 * Current tab:    haiku_call_1 → form analysis of current session
 * Comparison tab: haiku_call_2 → progression results vs previous session
 */

import { useState, useMemo, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import FIXTURE_CLEAN        from "../../../fixtures/form-analysis.clean.json"
import FIXTURE_WITH_ISSUES  from "../../../fixtures/form-analysis.with-issues.json"
import FIXTURE_COMPARISON   from "../../../fixtures/form-comparison.json"
import FIXTURE_COMP_EMPTY   from "../../../fixtures/form-comparison.empty.json"
import FIXTURE_PROGRESSION  from "../../../fixtures/form-progression.json"

// ─── Colour banding ───────────────────────────────────────────────────────────
function ringColor(score) {
  if (score >= 80) return { stroke: "#10b981", text: "#10b981" }
  if (score >= 60) return { stroke: "#f59e0b", text: "#f59e0b" }
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
  const trendBg    = diff >= 0 ? "#22c55e" : "#ef4444"

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
function IssueCard({ issue, faultDetail }) {
  const cls =
    issue.severity === "High"   ? "bg-red-50 border-red-100 text-red-700"
  : issue.severity === "Medium" ? "bg-amber-50 border-amber-100 text-amber-700"
  : "bg-gray-50 border-gray-100 text-gray-600"

  const tagMap = {
    "Knee Valgus": "knee_valgus",
    "Forward Trunk Lean": "excessive_forward_lean",
    "Excessive Forward Lean": "excessive_forward_lean",
    "Excessive Forward Trunk Lean": "excessive_forward_lean",
    "Depth Fault": "insufficient_depth",
    "Insufficient Depth": "insufficient_depth",
  }
  const detailKey = Object.keys(tagMap).find(k => issue.title?.includes(k))
  const detail = detailKey && faultDetail ? faultDetail[tagMap[detailKey]] : null

  return (
    <div className={`rounded-xl p-3 border ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">{issue.title}</span>
        <span className="text-[10px] uppercase tracking-wide font-medium opacity-70">{issue.severity}</span>
      </div>
      <p className="text-xs leading-snug opacity-80">{issue.detail}</p>
      {detail && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-current/10">
          {detail.reps_affected && (
            <span className="text-[10px] font-semibold opacity-60">
              {detail.reps_affected.length} rep{detail.reps_affected.length !== 1 ? "s" : ""} affected
            </span>
          )}
          {detail.severity && (
            <span className="text-[10px] font-semibold opacity-60 capitalize">
              {detail.severity} severity
            </span>
          )}
          {detail.intra_set_trend && (
            <span className="text-[10px] font-semibold opacity-60 capitalize">
              {detail.intra_set_trend}
            </span>
          )}
        </div>
      )}
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
  { key: "posture",          summaryKey: "posture",          label: "Posture",          compKey: "posture"          },
  { key: "stability",        summaryKey: "stability",        label: "Stability",        compKey: "stability"        },
  { key: "movement_quality", summaryKey: "movement_quality", label: "Movement Quality", compKey: "movement_quality" },
  { key: "range_of_motion",  summaryKey: "range_of_motion",  label: "Range of Motion",  compKey: "range_of_motion"  },
]

const DEFAULT_NOTES = {
  posture: "Maintain a neutral spine and upright chest position throughout all reps of the movement.",
  stability: "Control your balance, plant your feet firmly, and avoid swaying or shifting weight excessively.",
  movement_quality: "Focus on smooth, controlled eccentric and concentric phases to ensure high movement efficiency.",
  range_of_motion: "Achieve full depth on every rep — hips below knees — while maintaining control and balance."
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  const [tab,        setTab]        = useState("current")
  const [devFixture, setDevFixture] = useState("clean")
  const [devComp,    setDevComp]    = useState("with-data")

  const [liveSessions,            setLiveSessions]            = useState([])
  const [selectedLiveSessionId,   setSelectedLiveSessionId]   = useState("")
  const [selectedLiveSessionData, setSelectedLiveSessionData] = useState(null)
  // ── Separate state for comparison (haiku_call_2) and current (haiku_call_1) ──
  const [liveCurrentData,  setLiveCurrentData]  = useState(null)  // haiku_call_1 shape
  const [liveCompData,     setLiveCompData]      = useState(null)  // haiku_call_2 shape

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  // Fetch completed sessions from DB
  useEffect(() => {
    async function fetchSessions() {
      try {
        const userId = localStorage.getItem("user_id")
        if (!userId) return

        const r1 = await fetch(`${BASE_URL}/history/${userId}`)
        if (r1.ok) {
          const list = await r1.json()
          if (Array.isArray(list)) {
            const sorted = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            setLiveSessions(sorted)
          }
        }
      } catch (err) {
        console.error("Failed to fetch live history sessions:", err)
      }
    }
    fetchSessions()
  }, [BASE_URL])

  useEffect(() => {
    if (state?.analysisId) {
      handleLoadLiveSession(state.analysisId)
    }
  }, [state?.analysisId])

  // ─────────────────────────────────────────────────────────────────────────
  // handleLoadLiveSession
  // Strictly separates haiku_call_1 (current tab) from haiku_call_2 (comparison tab)
  // ─────────────────────────────────────────────────────────────────────────
  async function handleLoadLiveSession(sessionId) {
    if (!sessionId) {
      setSelectedLiveSessionId("")
      setSelectedLiveSessionData(null)
      setLiveCurrentData(null)
      setLiveCompData(null)
      return
    }

    try {
      const response = await fetch(`${BASE_URL}/analysis/${sessionId}`)
      if (!response.ok) return

      const record = await response.json()
      console.log("📦 Full API response:", record)

      const baseAnalysis  = record.analysis      || {}
      const haikuCall1    = record.haiku_call_1  || {}  // current session analysis
      const haikuCall2    = record.haiku_call_2  || {}  // progression vs previous

      // ── CURRENT TAB — built exclusively from haiku_call_1 ─────────────────
      const coachingOutput1   = haikuCall1.coaching_output   || {}
      const paramScores1      = coachingOutput1.parameter_scores || {}

      const currentSummary = {
        overall_form_score:       haikuCall1.overall_form_score        || 0,
        posture_score:            haikuCall1.posture_score             || paramScores1.posture          || 0,
        stability_score:          haikuCall1.stability_score           || paramScores1.stability        || 0,
        movement_quality_score:   haikuCall1.movement_quality_score    || paramScores1.movement_quality || 0,
        range_of_motion_score:    haikuCall1.range_of_motion_score     || paramScores1.range_of_motion  || 0,
        tempo_score:              haikuCall1.tempo_score               || 0,
        summary_paragraph:
          coachingOutput1.verdict_summary   ||
          coachingOutput1.summary_paragraph ||
          record.summary_paragraph          ||
          "",
      }

      // Parameter-level coaching nodes (affirmation / observation / correction)
      // sourced from haiku_call_1 only
      const currentParameters = {
        posture: {
          score:       currentSummary.posture_score,
          affirmation: coachingOutput1.affirm?.[0]           || null,
          observation: null,
          correction:  coachingOutput1.correct?.[0]?.cue     || null,
        },
        stability: {
          score: currentSummary.stability_score,
        },
        movement_quality: {
          score: currentSummary.movement_quality_score,
        },
        range_of_motion: {
          score: currentSummary.range_of_motion_score,
        },
      }

      const currentCoaching = {
        summary_paragraph:   currentSummary.summary_paragraph,
        feedback:            coachingOutput1.correct?.[0]?.cue || "",
        next_session_focus:  coachingOutput1.next_session_focus || [],
        parameters:          currentParameters,
      }

      // Biomechanics / rep data (shared physical data, not score data)
      let parsedReps = []
      try {
        const biomech = baseAnalysis.biomechanics_json
          ? JSON.parse(baseAnalysis.biomechanics_json)
          : null

        if (biomech?.reps?.length) {
          parsedReps = biomech.reps.map((rep) => {
            let formScore = 100
            if (rep.depth_data?.depth_classification === "Warning") formScore -= 20
            if (rep.depth_data?.depth_insufficient_flag)             formScore -= 15
            if (rep.back_data?.back_label === "Warning")             formScore -= 15
            if (rep.back_data?.back_angle_at_bottom > 30)           formScore -= 20
            if (rep.back_data?.back_angle_at_bottom > 45)           formScore -= 25
            return {
              rep_number: rep.rep_number,
              form_score: Math.max(0, Math.min(100, formScore)),
            }
          })
        }
      } catch (e) {
        console.warn("Failed to parse biomechanics_json:", e)
      }

      const parsedCurrentResult = {
        analysis_id:   baseAnalysis.analysis_id  || haikuCall1.analysis_id,
        session_id:    baseAnalysis.session_id   || haikuCall1.session_id,
        exercise_id:   baseAnalysis.exercise_id  || haikuCall1.exercise_id,
        exercise_name: baseAnalysis.exercise_name || haikuCall1.exercise_id,
        display_name:  (baseAnalysis.exercise_name || haikuCall1.exercise_id)?.toUpperCase(),
        weight_value:  baseAnalysis.weight_value,
        weight_unit:   baseAnalysis.weight_unit,
        status:        baseAnalysis.status,
        video_url:     baseAnalysis.video_url,
        created_at:    baseAnalysis.created_at,
        summary:       currentSummary,
        coaching:      currentCoaching,
        reps:          parsedReps,
        issues:        [],
        causal_chains: coachingOutput1.root_cause_analysis || haikuCall1.root_cause_analysis || [],
      }

      // ── COMPARISON TAB — built exclusively from haiku_call_2 ──────────────
      // haiku_call_2 contains progression data: scores for current + previous
      // sessions and coaching that compares them.
      const coachingOutput2    = haikuCall2.coaching_output    || haikuCall2 // some APIs nest, some don't
      const compParamScores2   = coachingOutput2.parameter_scores || {}

      // Current session scores as reported by haiku_call_2 (may differ slightly)
      const comp2CurrentScores = haikuCall2.current_session    || {}
      // Previous session scores as reported by haiku_call_2
      const comp2PreviousScores = haikuCall2.previous_session  || {}

      // Resolve per-parameter scores for comparison current side:
      // prefer explicit current_session block, fall back to haikuCall2 top-level scores
      const compCurrentOverall = comp2CurrentScores.overall_form_score
        ?? haikuCall2.current_overall_form_score
        ?? currentSummary.overall_form_score    // last resort: same as current tab
      const compCurrentPosture = comp2CurrentScores.posture_score
        ?? haikuCall2.current_posture_score
        ?? currentSummary.posture_score
      const compCurrentStability = comp2CurrentScores.stability_score
        ?? haikuCall2.current_stability_score
        ?? currentSummary.stability_score
      const compCurrentMQ = comp2CurrentScores.movement_quality_score
        ?? haikuCall2.current_movement_quality_score
        ?? currentSummary.movement_quality_score
      const compCurrentROM = comp2CurrentScores.range_of_motion_score
        ?? haikuCall2.current_range_of_motion_score
        ?? currentSummary.range_of_motion_score

      // Previous session scores — exclusively from haiku_call_2
      const compPrevOverall    = comp2PreviousScores.overall_form_score    ?? haikuCall2.previous_overall_form_score    ?? null
      const compPrevPosture    = comp2PreviousScores.posture_score          ?? haikuCall2.previous_posture_score          ?? null
      const compPrevStability  = comp2PreviousScores.stability_score        ?? haikuCall2.previous_stability_score        ?? null
      const compPrevMQ         = comp2PreviousScores.movement_quality_score ?? haikuCall2.previous_movement_quality_score ?? null
      const compPrevROM        = comp2PreviousScores.range_of_motion_score  ?? haikuCall2.previous_range_of_motion_score  ?? null

      // Comparison-tab parameter coaching notes come from haiku_call_2
      const compParameters2 = {
        posture: {
          score:              compCurrentPosture,
          observation_action: coachingOutput2.posture_note          || compParamScores2.posture?.observation_action || null,
          affirmation:        coachingOutput2.posture_affirmation    || compParamScores2.posture?.affirmation        || null,
          correction:         coachingOutput2.posture_correction     || compParamScores2.posture?.correction         || null,
        },
        stability: {
          score:              compCurrentStability,
          observation_action: coachingOutput2.stability_note         || compParamScores2.stability?.observation_action || null,
          affirmation:        coachingOutput2.stability_affirmation  || compParamScores2.stability?.affirmation        || null,
        },
        movement_quality: {
          score:              compCurrentMQ,
          observation_action: coachingOutput2.movement_quality_note  || compParamScores2.movement_quality?.observation_action || null,
          affirmation:        coachingOutput2.movement_quality_affirmation || compParamScores2.movement_quality?.affirmation  || null,
        },
        range_of_motion: {
          score:              compCurrentROM,
          observation_action: coachingOutput2.range_of_motion_note   || compParamScores2.range_of_motion?.observation_action || null,
          affirmation:        coachingOutput2.range_of_motion_affirmation || compParamScores2.range_of_motion?.affirmation   || null,
        },
      }

      const comparisonData = {
        has_comparison:        !!(haikuCall2 && Object.keys(haikuCall2).length > 0),
        progression_verdict:   haikuCall2.progression_verdict   || null,
        progress_direction:    haikuCall2.progress_direction     || null,
        weight_recommendation: haikuCall2.weight_recommendation  || null,
        posture_trend:         haikuCall2.posture_trend          || null,
        stability_trend:       haikuCall2.stability_trend        || null,
        range_of_motion_trend: haikuCall2.range_of_motion_trend  || null,
        movement_quality_trend:haikuCall2.movement_quality_trend || null,

        // Current side of comparison (haiku_call_2's view of this session)
        current: {
          date_label: baseAnalysis.created_at
            ? new Date(baseAnalysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "Current",
          weight_value:              baseAnalysis.weight_value    ?? 0,
          weight_unit:               baseAnalysis.weight_unit     ?? "lbs",
          overall_form_score:        compCurrentOverall,
          posture_score:             compCurrentPosture,
          stability_score:           compCurrentStability,
          movement_quality_score:    compCurrentMQ,
          range_of_motion_score:     compCurrentROM,
          reps:                      parsedReps,
        },

        // Previous side of comparison (haiku_call_2 only — never falls back to current)
        previous: {
          date_label:              haikuCall2.previous_session_date
            ? new Date(haikuCall2.previous_session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : comp2PreviousScores.date_label || "Previous",
          weight_value:            comp2PreviousScores.weight_value   ?? haikuCall2.previous_weight_value   ?? null,
          weight_unit:             comp2PreviousScores.weight_unit    ?? haikuCall2.previous_weight_unit    ?? "lbs",
          overall_form_score:      compPrevOverall,
          posture_score:           compPrevPosture,
          stability_score:         compPrevStability,
          movement_quality_score:  compPrevMQ,
          range_of_motion_score:   compPrevROM,
          reps:                    [],
        },

        // Coaching text and per-parameter notes sourced from haiku_call_2
        comparison_coaching: {
          summary_paragraph:
            haikuCall2.progression_verdict        ||
            coachingOutput2.summary_paragraph     ||
            coachingOutput2.verdict_summary       ||
            "",
          parameters: compParameters2,
        },
      }

      setSelectedLiveSessionId(sessionId)
      setSelectedLiveSessionData(parsedCurrentResult)
      setLiveCurrentData(parsedCurrentResult)
      setLiveCompData(comparisonData)

    } catch (err) {
      console.error("Failed to load live session details:", err)
    }
  }

  function safeJsonLoad(val) {
    if (!val) return null
    if (typeof val === "object") return val
    try { return JSON.parse(val) } catch { return val }
  }

  // ── Data selectors ─────────────────────────────────────────────────────────
  // Current tab always uses liveCurrentData (haiku_call_1) or fixture
  const data = useMemo(() => {
    if (liveCurrentData)        return liveCurrentData
    if (state?.analysisResult)  return state.analysisResult
    return devFixture === "clean" ? FIXTURE_CLEAN : FIXTURE_WITH_ISSUES
  }, [liveCurrentData, state?.analysisResult, devFixture])

  // Comparison tab always uses liveCompData (haiku_call_2) or fixture
  const compData = useMemo(() => {
    if (liveCompData) return liveCompData
    if (data.progression_results) return safeJsonLoad(data.progression_results)
    // In dev: progression fixture has richer data (ladder, history, focus)
    if (devComp === "with-data") {
      const base = FIXTURE_COMPARISON
      const prog = FIXTURE_PROGRESSION
      return {
        ...base,
        previous_next_session_focus: prog.previous_next_session_focus || [],
        focus_this_week:  prog.ai_verdict?.focus_this_week  || null,
        focus_tags:       prog.focus_tags || [],
        progress_ladder:  prog.progress_ladder || [],
        progress_ladder_image_url: prog.progress_ladder_image_url || null,
        form_history:     prog.form_history || [],
        progress_direction: prog.ai_verdict?.progress_direction || null,
        weight_recommendation: prog.ai_verdict?.weight_recommendation || null,
      }
    }
    return FIXTURE_COMP_EMPTY
  }, [liveCompData, data.progression_results, devComp])

  const isDevMode    = !state?.analysisResult
  const isComparison = tab === "comparison"

  // ── Current tab fields (haiku_call_1) ─────────────────────────────────────
  const summary  = data.summary  || {}
  const coaching = data.coaching || {}
  const params   = coaching.parameters || {}
  const reps     = data.reps   || []
  const issues   = data.issues || []

  const videoSrc = state?.videoPreviewUrl || (data.video_url ? `${BASE_URL}/${data.video_url}` : null)

  const overall   = summary.overall_form_score ?? 0
  const repScores = reps.map((r) => r.form_score ?? 0)

  const headerExercise = (data.display_name || data.exercise_id || "Session").toUpperCase()
  const headerWeight   =
    data.weight_value != null && data.weight_unit
      ? `${data.weight_value}${data.weight_unit.toUpperCase()}`
      : "—"

  const statusFailed =
    data.status === "failed" || (overall === 0 && reps.length === 0 && issues.length > 0)

  // ── Comparison tab fields (haiku_call_2) ──────────────────────────────────
  const hasComparison = !!(
    compData.has_comparison      ||
    compData.progression_verdict ||
    compData.progress_direction  ||
    compData.coaching_reasoning
  )

  // compCurrent and compPrevious come directly from the parsed compData
  // (built from haiku_call_2) — NO cross-blending with haiku_call_1 summary
  const compCurrent  = compData.current  || {}
  const compPrevious = compData.previous || {}

  const compCoaching = compData.comparison_coaching || {}
  // compParams must come from haiku_call_2 parameters, not haiku_call_1
  const compParams   = compCoaching.parameters      || {}

  function delta(currentScore, previousScore) {
    if (currentScore == null || previousScore == null) return null
    return currentScore - previousScore
  }

  const today = new Date()

  return (
    <div className="min-h-screen" style={{ background: "#f0eeff" }}>
      <div className="max-w-sm mx-auto pb-10">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="pt-6 pb-3 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900 tracking-wide">{headerExercise}</h1>
        </div>

        {/* ── Tab toggle ────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4 flex rounded-2xl p-1" style={{ background: "#e2dbff" }}>
          {[["current", "Analysis"], ["comparison", "Progression"]].map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? "text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
              style={tab === t ? { background: "white" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            COMPARISON TAB — data from haiku_call_2 only
        ════════════════════════════════════════════════════════════════ */}
        {isComparison && (
          <>
            {!hasComparison ? (
              // ── Empty / locked state ──────────────────────────────────
              <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="text-3xl mb-3">🔒</div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {compData.empty_state_message || "Complete another session to unlock your progress view."}
                </p>
              </div>
            ) : (
              <>
                {/* ── Before / Now comparison strip ───────────────────── */}
                <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-3">
                    {/* BEFORE */}
                    <div className="flex-1 rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                      <div className="relative flex-1 bg-gray-50 flex items-center justify-center" style={{ minHeight: 140 }}>
                        <img src="/squat_posture.png" alt="Before" className="h-32 object-contain" style={{ filter: "grayscale(30%)" }} />
                        <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Before</div>
                        <div className="absolute top-2 right-2 p-1 rounded border border-gray-300 bg-white">
                          <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-white">
                        <span className="text-xs text-gray-400">{compPrevious.date_label || "Previous"}</span>
                        <span className="text-base font-extrabold text-gray-500">{compPrevious.overall_form_score ?? "—"}</span>
                      </div>
                    </div>
                    {/* NOW */}
                    <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ border: "2px solid #a78bfa" }}>
                      <div className="relative flex-1 bg-purple-50 flex items-center justify-center" style={{ minHeight: 140 }}>
                        <img src="/squat_posture.png" alt="Now" className="h-32 object-contain" />
                        {/* Dynamic glow dots — position matches squat figure anatomy, shown when trend is down */}
                        {(() => {
                          // Each entry: [trend field, top%, left%, label]
                          // Positions tuned to squat_posture.png anatomy
                          const dotMap = [
                            { trend: compData.posture_trend,          top: "18%", left: "38%", size: "w-4 h-4" }, // upper back/shoulder
                            { trend: compData.stability_trend,        top: "42%", left: "32%", size: "w-3 h-3" }, // hip/core
                            { trend: compData.range_of_motion_trend,  top: "62%", left: "28%", size: "w-4 h-4" }, // knee
                            { trend: compData.movement_quality_trend, top: "80%", left: "30%", size: "w-3 h-3" }, // ankle
                          ]
                          return dotMap
                            .filter(d => d.trend === "down")
                            .map((d, i) => (
                              <div key={i}
                                className={`absolute ${d.size} rounded-full bg-amber-400 opacity-90 blur-[1px]`}
                                style={{
                                  top: d.top,
                                  left: d.left,
                                  boxShadow: "0 0 8px 3px rgba(251,191,36,0.6)",
                                }}
                              />
                            ))
                        })()}
                        <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7c3aed" }}>Now</div>
                        <div className="absolute top-2 right-2 p-1 rounded border border-purple-200 bg-white">
                          <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-white">
                        <span className="text-xs text-gray-400">{compCurrent.date_label || "Current"}</span>
                        <span className="text-base font-extrabold" style={{ color: "#6366f1" }}>{compCurrent.overall_form_score ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── What We Told You ─────────────────────────────────── */}
                {compData.previous_next_session_focus?.length > 0 && (
                  <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm">
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                      Last Session · {compPrevious.date_label || "Previous"} · {compPrevious.weight_value != null ? `${compPrevious.weight_value}${(compPrevious.weight_unit || "kg").toUpperCase()}` : "—"}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#6366f1" }}>What We Told You</div>
                    <blockquote className="border-l-4 pl-3" style={{ borderColor: "#a78bfa" }}>
                      {compData.previous_next_session_focus.map((f, i) => (
                        <p key={i} className="text-sm text-gray-700 italic leading-relaxed">"{f}"</p>
                      ))}
                    </blockquote>
                  </div>
                )}

                {/* ── Form Score + AI Verdict ──────────────────────────── */}
                <div className="mx-4 mb-3 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #7c6ff7, #6fa8f5)" }}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Form Score</div>
                      <ScoreRing
                        score={compCurrent.overall_form_score ?? 0}
                        size={72}
                        strokeW={6}
                        delta={compPrevious.overall_form_score != null && compCurrent.overall_form_score != null
                          ? compCurrent.overall_form_score - compPrevious.overall_form_score
                          : null}
                      />
                      <div className="text-[9px] font-bold px-2 py-0.5 rounded-full text-gray-800 mt-1 bg-white">
                        {(() => {
                          const rec = compData.weight_recommendation
                          const recStr = typeof rec === "string" ? rec : rec?.action || rec?.label || rec?.recommendation || null
                          return recStr ? recStr.toUpperCase() : `HOLD AT ${compCurrent.weight_value ?? ""}${(compCurrent.weight_unit || "kg").toUpperCase()}`
                        })()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      {compData.progress_direction && (
                        <div className="text-sm font-bold text-white mb-1">
                          AI Verdict · Progress {compData.progress_direction === "up" ? "↑" : compData.progress_direction === "down" ? "↓" : "→"}
                        </div>
                      )}
                      <p className="text-xs text-white/90 leading-relaxed">
                        {compCoaching.summary_paragraph || compData.progression_verdict || ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Key Insights with delta chips ────────────────────── */}
                <div className="mx-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                    </svg>
                    <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Key Insights</h2>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {PARAMS.map((p, idx) => {
                      const cp    = compParams[p.compKey] || {}
                      const score = cp.score ?? compCurrent[`${p.summaryKey}_score`] ?? 0
                      const prev  = compPrevious[`${p.summaryKey}_score`] ?? null
                      const d     = delta(score, prev)
                      return (
                        <div key={p.key} className={`px-4 py-3 flex items-center gap-3 ${idx < PARAMS.length - 1 ? "border-b border-gray-50" : ""}`}>
                          <ScoreRing score={score} size={52} strokeW={5} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900">{p.label}</div>
                            <div className="text-xs text-gray-400">{prev ?? "—"} → {score}</div>
                          </div>
                          {d !== null && (
                            <div className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                              style={{
                                background: d > 0 ? "#dcfce7" : d < 0 ? "#fee2e2" : "#f3f4f6",
                                color:      d > 0 ? "#16a34a" : d < 0 ? "#dc2626" : "#6b7280",
                              }}>
                              {d > 0 ? `+${d} ↑` : d < 0 ? `${d} ↓` : "—"}
                            </div>
                          )}
                          <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Across Your Set — dual rep chart ─────────────────── */}
                <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-0.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Across Your Set</h2>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400">Rep-by-Rep Consistency</div>
                    {(() => {
                      const scores = (compCurrent.reps || []).map(r => r.form_score ?? 0)
                      const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : null
                      return spread !== null ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "#7c6ff7" }}>
                          {spread}-PT SPREAD
                        </span>
                      ) : null
                    })()}
                  </div>
                  <LineChart
                    repScores={(compCurrent.reps || []).map(r => r.form_score ?? 0)}
                    color="#6366f1"
                    gradientColor="#818cf8"
                  />
                  <div className="flex items-center gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2 border-dashed border-gray-300" />
                      <span className="text-[10px] text-gray-400">Last Session</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 border-t-2" style={{ borderColor: "#6366f1" }} />
                      <span className="text-[10px] text-gray-500 font-medium">This Session</span>
                    </div>
                  </div>
                </div>

                {/* ── Progress Ladder ──────────────────────────────────── */}
                {(compData.progress_ladder_image_url || compData.progress_ladder?.length > 0) && (
                  <div className="mx-4 mb-3 bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🪜</span>
                      <h2 className="text-sm font-extrabold text-gray-900">Progress ladder</h2>
                    </div>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                      Form scores typically dip when you load heavier, that's normal. Watch your average per rung, not individual sessions.
                    </p>
                    {compData.progress_ladder_image_url ? (
                      <img src={compData.progress_ladder_image_url} alt="Progress ladder" className="w-full rounded-xl" />
                    ) : (
                      <div className="space-y-2">
                        {(compData.progress_ladder || []).map((row, i) => {
                          const isCurrent = row.label?.toLowerCase().includes("current")
                          return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border"
                              style={{ borderColor: isCurrent ? "#a78bfa" : "#e5e7eb", background: isCurrent ? "#faf8ff" : "white" }}>
                              {/* Weight + label */}
                              <div className="shrink-0 w-12">
                                <div className="text-sm font-extrabold text-gray-900">{row.weight}{row.weight_unit ?? "kg"}</div>
                                <div className="text-[10px] font-semibold" style={{ color: isCurrent ? "#7c3aed" : "#9ca3af" }}>
                                  {row.label ?? ""}
                                </div>
                                {row.avg != null && (
                                  <div className="text-[10px] text-gray-400">Avg {row.avg}</div>
                                )}
                              </div>
                              {/* Score pills */}
                              <div className="flex gap-1.5 flex-wrap flex-1">
                                {(row.scores || []).map((s, j) => (
                                  typeof s === "number" ? (
                                    <span key={j} className="text-xs font-bold px-2.5 py-1 rounded-xl text-white"
                                      style={{ background: s >= 80 ? "#22c55e" : s >= 65 ? "#f59e0b" : "#ef4444" }}>
                                      {s}
                                    </span>
                                  ) : (
                                    // dumbbell placeholder for sessions without analysis
                                    <span key={j} className="w-9 h-7 rounded-xl flex items-center justify-center border-2"
                                      style={{ borderColor: "#e5e7eb" }}>
                                      <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
                                      </svg>
                                    </span>
                                  )
                                ))}
                              </div>
                              {/* Session + analyzed counts */}
                              <div className="shrink-0 text-right">
                                <div className="text-[10px] text-gray-400">{row.sessions ?? ""} sessions</div>
                                {row.analyzed != null && (
                                  <div className="text-[10px] font-semibold" style={{ color: "#7c3aed" }}>{row.analyzed} Analyzed</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Your Focus This Week ─────────────────────────────── */}
                <div className="mx-4 mb-3 bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🎯</span>
                    <h2 className="text-sm font-extrabold text-gray-900">Your focus this week</h2>
                  </div>
                  {compData.focus_this_week ? (
                    <>
                      <p className="text-sm font-semibold text-gray-800 leading-relaxed mb-2">{compData.focus_this_week}</p>
                      {compData.focus_tags?.length > 0 && (
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Try: {compData.focus_tags.join(", ")}.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No focus available yet.</p>
                  )}
                </div>

                {/* ── Form History ─────────────────────────────────────── */}
                {compData.form_history?.length > 0 && (
                  <div className="mx-4 mb-3">
                    <h2 className="text-sm font-extrabold text-gray-900 mb-0.5">Form History</h2>
                    <p className="text-xs text-gray-400 mb-3">Your last 3 Analyses</p>
                    <div className="space-y-3">
                      {compData.form_history.slice(0, 3).map((h, i) => {
                        const hScore   = h.overall_form_score ?? h.overall_score ?? 0
                        const hDate    = h.created_at
                          ? new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                          : (h.date ?? "—")
                        const hWeight  = h.weight_value != null ? `${h.weight_value}${h.weight_unit ?? "kg"}` : "—"
                        const hReps    = h.rep_count ?? h.reps ?? "—"
                        const hVerdict = h.verdict ?? h.summary ?? ""
                        const scoreColor = hScore >= 80 ? "#22c55e" : hScore >= 65 ? "#f59e0b" : "#ef4444"
                        return (
                          <div key={i} className="flex gap-3 p-3 rounded-2xl bg-white shadow-sm items-start">
                            {/* Figure thumbnail */}
                            <div className="w-14 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ede9fe, #dbeafe)" }}>
                              {h.annotated_frame_url ? (
                                <img src={h.annotated_frame_url} className="w-full h-full object-cover" alt="frame" />
                              ) : (
                                <svg className="w-7 h-7 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <div className="text-sm font-bold text-gray-900 leading-snug">{h.exercise_name ?? h.exercise ?? "Goblet Squat"}</div>
                                <div className="text-sm font-extrabold shrink-0" style={{ color: scoreColor }}>
                                  {hScore}<span className="text-[10px] text-gray-400 font-normal">/100</span>
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-400 mb-1">{hDate} · {hWeight} · {hReps} Reps</div>
                              {hVerdict && <p className="text-xs text-gray-500 leading-snug">{hVerdict}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* ── Verdict ──────────────────────────────────────────── */}
                {(compCoaching.summary_paragraph || compData.progression_verdict) && (
                  <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #7c6ff7, #6fa8f5)" }}>
                    <div className="text-sm font-bold text-white mb-1">Verdict</div>
                    <p className="text-xs text-white/90 leading-relaxed">
                      {compCoaching.summary_paragraph || compData.progression_verdict}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CURRENT TAB — data from haiku_call_1 only
        ════════════════════════════════════════════════════════════════ */}
        {!isComparison && (
          <>
            {/* Frame / video */}
            <div className="mx-4 mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <div className="text-center py-2 text-xs text-gray-500">
                {today.toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {headerWeight}
              </div>
              {videoSrc ? (
                <video
                  src={videoSrc}
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

            {/* Form score — from haiku_call_1 */}
            <div className="mx-4 mb-4 bg-amber-50 rounded-2xl p-5 text-center border border-amber-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Form Score</div>
              <div className="text-6xl font-extrabold mb-2" style={{ color: "#f59e0b" }}>{overall}</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {coaching.summary_paragraph || "Let's stay at this weight and keep improving!"}
              </p>
            </div>

            {/* Next-Set Cue — from haiku_call_1 */}
            {coaching.feedback && (
              <div className="mx-4 mb-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">💡 Next Set Cue</div>
                <p className="text-sm text-indigo-700 font-medium leading-relaxed">{coaching.feedback}</p>
              </div>
            )}

            {/* Key Insights — scores from haiku_call_1 */}
            <div className="mx-4 mb-4">
              <h2 className="text-base font-bold text-gray-900 mb-3">Key Insights</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 px-4">
                {PARAMS.map((p) => {
                  const d     = params[p.key] || {}
                  const score = Math.round(d.score ?? summary?.[`${p.summaryKey}_score`] ?? 0)

                  return (
                    <div key={p.key} className="flex items-start gap-4 py-4">
                      <ScoreRing score={score} size={80} strokeW={8} label={p.label} />
                      <div className="flex-1 pt-1 space-y-1.5">
                        {d.affirmation && (
                          <p className="text-xs text-emerald-600 leading-snug">✓ {d.affirmation}</p>
                        )}
                        {d.observation && (
                          <p className="text-xs text-amber-700 leading-snug">{d.observation}</p>
                        )}
                        {(d.correction || d.feedback) && (
                          <p className="text-xs text-indigo-600 leading-snug">→ {d.correction || d.feedback}</p>
                        )}
                        {!d.affirmation && !d.observation && !d.correction && !d.feedback && (
                          <p className="text-xs text-gray-400 leading-snug">{DEFAULT_NOTES[p.key]}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Root Cause Analysis — from haiku_call_1 */}
            {data.causal_chains && data.causal_chains.length > 0 && (
              <div className="mx-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">Root Cause</h2>
                <div className="space-y-2">
                  {data.causal_chains.map((chain, idx) => (
                    <div key={idx} className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                      <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">
                        {(chain.root_cause || "").replaceAll("_", " ")}
                      </div>
                      {chain.symptoms && chain.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {chain.symptoms.map((s, si) => (
                            <span key={si} className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                              {s.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues — from haiku_call_1 */}
            {issues.length > 0 && (
              <div className="mx-4 mb-4 space-y-2">
                <h2 className="text-base font-bold text-gray-900">Issues Detected</h2>
                {issues.map((issue) => (
                  <IssueCard key={issue.id || issue.title} issue={issue} faultDetail={data.fault_detail} />
                ))}
              </div>
            )}

            {/* Next Session Focus — from haiku_call_1 */}
            {coaching.next_session_focus && coaching.next_session_focus.length > 0 && (
              <div className="mx-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">Next Session Focus</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
                  {coaching.next_session_focus.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[10px] font-bold text-teal-600 shrink-0 mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-gray-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Trends — from haiku_call_1 */}
            {data.trends && (data.trends.depth || data.trends.posture || data.trends.stability) && (
              <div className="mx-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">Session Trends</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-around">
                  {["depth", "posture", "stability"].map((key) => {
                    const val = data.trends[key]
                    if (!val) return null
                    const icon  = val === "improving" ? "↑" : val === "worsening" ? "↓" : "→"
                    const color = val === "improving" ? "text-emerald-600" : val === "worsening" ? "text-red-500" : "text-gray-500"
                    return (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${color}`}>{icon}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{key}</span>
                        <span className={`text-[10px] font-semibold capitalize ${color}`}>{val}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rep chart — from haiku_call_1 reps */}
            <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <LineChart repScores={repScores} />
            </div>
          </>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mx-4 flex flex-col gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="w-full py-4 rounded-2xl text-white text-sm font-bold tracking-wide shadow-md"
            style={{ background: "linear-gradient(to right, #6c63ff, #5b9cf6)" }}
          >
            New Upload
          </button>
          <button
            type="button"
            onClick={() => navigate("/timeline")}
            className="w-full py-4 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-200"
          >
            Continue to Set 3
          </button>
        </div>

        {/* ── Dev toggles ───────────────────────────────────────────────── */}
        {isDevMode && (
          <div className="mt-6 mx-4 text-center text-xs text-gray-400 space-y-4 pt-4 border-t border-gray-100 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {liveSessions.length > 0 && (
              <div className="space-y-1.5 text-left">
                <div className="font-semibold text-gray-700 text-xs flex items-center justify-between">
                  <span>⚡ Load Live Session from SQLite DB:</span>
                  <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full font-medium">v3.0 DB</span>
                </div>
                <select
                  value={selectedLiveSessionId}
                  onChange={(e) => handleLoadLiveSession(e.target.value)}
                  className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                >
                  <option value="">-- Select from DB or use Local Fixtures --</option>
                  {liveSessions.map((s) => {
                    const dateStr = new Date(s.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })
                    return (
                      <option key={s.session_id} value={s.session_id}>
                        {s.exercise_name?.toUpperCase().replace("-", " ").replace("_", " ")} ({s.overall_score}%) - {dateStr}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <div className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Static Dev Fixtures</div>
              <div className="flex justify-center gap-4">
                {["clean", "issues"].map((f) => (
                  <button key={f} type="button"
                    onClick={() => { handleLoadLiveSession(""); setDevFixture(f) }}
                    className={`underline text-xs ${devFixture === f && !selectedLiveSessionId ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "clean" ? "No Issues" : "With Issues"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Static Comparison Fixtures</div>
              <div className="flex justify-center gap-4">
                {["with-data", "empty"].map((f) => (
                  <button key={f} type="button"
                    onClick={() => { handleLoadLiveSession(""); setDevComp(f) }}
                    className={`underline text-xs ${devComp === f && !selectedLiveSessionId ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "with-data" ? "With Data" : "Empty State"}
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
