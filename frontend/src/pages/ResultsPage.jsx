import { useState, useMemo, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import FIXTURE_CLEAN        from "../../../fixtures/form-analysis.clean.json"
import FIXTURE_WITH_ISSUES  from "../../../fixtures/form-analysis.with-issues.json"
import FIXTURE_COMPARISON   from "../../../fixtures/form-comparison.json"
import FIXTURE_COMP_EMPTY   from "../../../fixtures/form-comparison.empty.json"

function arcColor(score) {
  if (score >= 80) return "#22C55E"
  if (score >= 65) return "#F97316"
  return "#EF4444"
}

function ScoreRing({ score, size = 52, strokeW = 5 }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const color = arcColor(score)
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function LargeScoreRing({ score, size = 80, strokeW = 8, delta = null, label = "" }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const c    = { stroke: arcColor(score), text: arcColor(score) }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.stroke} strokeWidth={strokeW}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
        </svg>
        <div className="absolute flex flex-col items-center leading-none gap-0.5">
          <span className="font-bold text-xl" style={{ color: c.text }}>{score}</span>
          {delta !== null && (
            <span className="text-[10px] font-bold" style={{ color: delta >= 0 ? "#6366f1" : "#ef4444" }}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-[11px] text-gray-400 text-center leading-tight">{label}</span>}
    </div>
  )
}

function BigScoreRing({ score }) {
  const [display, setDisplay] = useState(0)
  const size = 88, strokeW = 8
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.max(0, Math.min(100, display)) / 100) * circ
  const color = arcColor(display)
  useEffect(() => {
    const start = performance.now(), dur = 1200
    function step(now) {
      const t = Math.min((now - start) / dur, 1)
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * score))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [score])
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute text-2xl font-extrabold text-white">{display}</span>
    </div>
  )
}

function VideoPlayer({ src }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  function toggle() {
    if (playing) { videoRef.current?.pause() } else { videoRef.current?.play() }
    setPlaying(p => !p)
  }
  return (
    <div className="relative w-full cursor-pointer" style={{ minHeight: 220, background: "#0f0f1a" }} onClick={toggle}>
      <video ref={videoRef} src={src} className="w-full" style={{ display: "block", maxHeight: 300, objectFit: "cover" }}
        playsInline onEnded={() => setPlaying(false)} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "#14b8a6", boxShadow: "0 0 0 6px rgba(20,184,166,0.25)" }}>
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

function ParamCard({ label, score, observation, affirmation, correction, defaultNote, initOpen = false }) {
  const [open, setOpen] = useState(initOpen)
  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: "#fff", border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3">
        <ScoreRing score={score} />
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          {observation && <div className="text-xs text-gray-400 mt-0.5 leading-snug">{observation}</div>}
        </div>
        <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: "#d1d5db", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {correction && (
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2 border-l-4 border-blue-400">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">{correction}</p>
            </div>
          )}
          {affirmation && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">{affirmation}</p>
            </div>
          )}
          {observation && !correction && !affirmation && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">{observation}</p>
            </div>
          )}
          {!correction && !affirmation && !observation && defaultNote && (
            <p className="text-xs text-gray-400 leading-relaxed">{defaultNote}</p>
          )}
        </div>
      )}
    </div>
  )
}

function RepChart({ repScores }) {
  if (!repScores || repScores.length < 2) {
    return <div className="h-24 flex items-center justify-center text-xs text-gray-400">Not enough reps to chart</div>
  }
  const scores = repScores
  const n = scores.length
  const half = Math.floor(n / 2)
  const firstHalf  = scores.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1)
  const secondHalf = scores.slice(half).reduce((a, b) => a + b, 0) / ((n - half) || 1)
  const dip = Math.round(((secondHalf - firstHalf) / (firstHalf || 1)) * 100)
  const dipLabel = dip < 0 ? `${dip}% Dip` : `+${dip}%`
  const dipColor = dip < 0 ? "#EF4444" : "#22C55E"
  const W = 320, H = 150, PAD = 18
  const xOf = i => PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2)
  const yOf = v => PAD + (1 - v / 100) * (H - PAD * 2)
  const pts = scores.map((v, i) => [xOf(i), yOf(v)])
  const areaPt = [`${pts[0][0]},${H - PAD}`, ...pts.map(([x, y]) => `${x},${y}`), `${pts[pts.length-1][0]},${H - PAD}`].join(" ")
  function sc(s) { return s >= 80 ? "#22C55E" : s >= 65 ? "#F97316" : "#EF4444" }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 font-medium">Consistency Analysis</div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: dipColor }}>{dipLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H + 10}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#22C55E" stopOpacity="0.22" />
            <stop offset="50%"  stopColor="#F97316" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#22C55E" />
            <stop offset="50%"  stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {[0, 20, 40, 60, 80, 100].map(v => (
          <line key={v} x1={PAD} y1={yOf(v)} x2={W - PAD} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="3,3" />
        ))}
        {[0, 20, 40, 60, 80, 100].map(v => (
          <text key={v} x={PAD - 3} y={yOf(v) + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{v}</text>
        ))}
        <polygon points={areaPt} fill="url(#areaGrad)" />
        <polyline points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="white" stroke={sc(scores[i])} strokeWidth="1.5" />
        ))}
        {scores.map((_, i) => (
          <text key={i} x={xOf(i)} y={H - 1} fontSize="5.5" fill="#9ca3af" textAnchor="middle">{`REP ${i + 1}`}</text>
        ))}
      </svg>
    </div>
  )
}

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
          {detail.severity && <span className="text-[10px] font-semibold opacity-60 capitalize">{detail.severity} severity</span>}
          {detail.intra_set_trend && <span className="text-[10px] font-semibold opacity-60 capitalize">{detail.intra_set_trend}</span>}
        </div>
      )}
    </div>
  )
}

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

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  const [tab,        setTab]        = useState("analysis")
  const [devFixture, setDevFixture] = useState("clean")
  const [devComp,    setDevComp]    = useState("with-data")

  const [liveSessions,            setLiveSessions]            = useState([])
  const [selectedLiveSessionId,   setSelectedLiveSessionId]   = useState("")
  const [selectedLiveSessionData, setSelectedLiveSessionData] = useState(null)
  const [liveCurrentData,  setLiveCurrentData]  = useState(null)
  const [liveCompData,     setLiveCompData]      = useState(null)

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  useEffect(() => {
    async function fetchSessions() {
      try {
        const localUserId = localStorage.getItem("user_id")
        const userId = localStorage.getItem("user_id")
        let allSessions = []
        const r1 = await fetch(`${BASE_URL}/history/${userId}`)
        if (r1.ok) {
          const list = await r1.json()
          if (Array.isArray(list)) allSessions.push(...list)
        }
        if (localUserId && localUserId !== batchUserId) {
          const r2 = await fetch(`${BASE_URL}/history/${localUserId}`)
          if (r2.ok) {
            const list = await r2.json()
            if (Array.isArray(list)) allSessions.push(...list)
          }
        }
        const unique = []
        const seen = new Set()
        for (const s of allSessions) {
          if (!seen.has(s.session_id)) { seen.add(s.session_id); unique.push(s) }
        }
        unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setLiveSessions(unique)
      } catch (err) {
        console.error("Failed to fetch live history sessions:", err)
      }
    }
    fetchSessions()
  }, [BASE_URL])

  useEffect(() => {
    if (state?.analysisId) handleLoadLiveSession(state.analysisId)
  }, [state?.analysisId])

  async function handleLoadLiveSession(sessionId) {
    if (!sessionId) {
      setSelectedLiveSessionId(""); setSelectedLiveSessionData(null)
      setLiveCurrentData(null); setLiveCompData(null)
      return
    }
    try {
      const response = await fetch(`${BASE_URL}/analysis/${sessionId}`)
      if (!response.ok) return
      const record = await response.json()
      console.log("📦 Full API response:", record)
      const baseAnalysis  = record.analysis     || {}
      const haikuCall1    = record.haiku_call_1 || {}
      const haikuCall2    = record.haiku_call_2 || {}
      const coachingOutput1  = haikuCall1.coaching_output || {}
      const paramScores1     = coachingOutput1.parameter_scores || {}
      const currentSummary = {
        overall_form_score:     haikuCall1.overall_form_score     || 0,
        posture_score:          haikuCall1.posture_score          || paramScores1.posture          || 0,
        stability_score:        haikuCall1.stability_score        || paramScores1.stability        || 0,
        movement_quality_score: haikuCall1.movement_quality_score || paramScores1.movement_quality || 0,
        range_of_motion_score:  haikuCall1.range_of_motion_score  || paramScores1.range_of_motion  || 0,
        tempo_score:            haikuCall1.tempo_score            || 0,
        summary_paragraph:
          coachingOutput1.verdict_summary   ||
          coachingOutput1.summary_paragraph ||
          record.summary_paragraph          || "",
      }
      const currentParameters = {
        posture: {
          score:       currentSummary.posture_score,
          affirmation: coachingOutput1.affirm?.[0]       || null,
          observation: null,
          correction:  coachingOutput1.correct?.[0]?.cue || null,
        },
        stability:        { score: currentSummary.stability_score },
        movement_quality: { score: currentSummary.movement_quality_score },
        range_of_motion:  { score: currentSummary.range_of_motion_score },
      }
      const currentCoaching = {
        summary_paragraph:  currentSummary.summary_paragraph,
        feedback:           coachingOutput1.correct?.[0]?.cue || "",
        next_session_focus: coachingOutput1.next_session_focus || [],
        parameters:         currentParameters,
      }
      let parsedReps = []
      try {
        const biomech = baseAnalysis.biomechanics_json ? JSON.parse(baseAnalysis.biomechanics_json) : null
        if (biomech?.reps?.length) {
          parsedReps = biomech.reps.map((rep) => {
            let formScore = 100
            if (rep.depth_data?.depth_classification === "Warning") formScore -= 20
            if (rep.depth_data?.depth_insufficient_flag)             formScore -= 15
            if (rep.back_data?.back_label === "Warning")             formScore -= 15
            if (rep.back_data?.back_angle_at_bottom > 30)           formScore -= 20
            if (rep.back_data?.back_angle_at_bottom > 45)           formScore -= 25
            return { rep_number: rep.rep_number, form_score: Math.max(0, Math.min(100, formScore)) }
          })
        }
      } catch (e) { console.warn("Failed to parse biomechanics_json:", e) }
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
      const coachingOutput2   = haikuCall2.coaching_output || haikuCall2
      const compParamScores2  = coachingOutput2.parameter_scores || {}
      const comp2CurrentScores  = haikuCall2.current_session  || {}
      const comp2PreviousScores = haikuCall2.previous_session || {}
      const compCurrentOverall    = comp2CurrentScores.overall_form_score    ?? haikuCall2.current_overall_form_score    ?? currentSummary.overall_form_score
      const compCurrentPosture    = comp2CurrentScores.posture_score          ?? haikuCall2.current_posture_score          ?? currentSummary.posture_score
      const compCurrentStability  = comp2CurrentScores.stability_score        ?? haikuCall2.current_stability_score        ?? currentSummary.stability_score
      const compCurrentMQ         = comp2CurrentScores.movement_quality_score ?? haikuCall2.current_movement_quality_score ?? currentSummary.movement_quality_score
      const compCurrentROM        = comp2CurrentScores.range_of_motion_score  ?? haikuCall2.current_range_of_motion_score  ?? currentSummary.range_of_motion_score
      const compPrevOverall   = comp2PreviousScores.overall_form_score    ?? haikuCall2.previous_overall_form_score    ?? null
      const compPrevPosture   = comp2PreviousScores.posture_score          ?? haikuCall2.previous_posture_score          ?? null
      const compPrevStability = comp2PreviousScores.stability_score        ?? haikuCall2.previous_stability_score        ?? null
      const compPrevMQ        = comp2PreviousScores.movement_quality_score ?? haikuCall2.previous_movement_quality_score ?? null
      const compPrevROM       = comp2PreviousScores.range_of_motion_score  ?? haikuCall2.previous_range_of_motion_score  ?? null
      const compParameters2 = {
        posture: {
          score: compCurrentPosture,
          observation_action: coachingOutput2.posture_note       || compParamScores2.posture?.observation_action || null,
          affirmation:        coachingOutput2.posture_affirmation || compParamScores2.posture?.affirmation        || null,
          correction:         coachingOutput2.posture_correction  || compParamScores2.posture?.correction         || null,
        },
        stability: {
          score: compCurrentStability,
          observation_action: coachingOutput2.stability_note        || compParamScores2.stability?.observation_action || null,
          affirmation:        coachingOutput2.stability_affirmation  || compParamScores2.stability?.affirmation        || null,
        },
        movement_quality: {
          score: compCurrentMQ,
          observation_action: coachingOutput2.movement_quality_note         || compParamScores2.movement_quality?.observation_action || null,
          affirmation:        coachingOutput2.movement_quality_affirmation   || compParamScores2.movement_quality?.affirmation        || null,
        },
        range_of_motion: {
          score: compCurrentROM,
          observation_action: coachingOutput2.range_of_motion_note        || compParamScores2.range_of_motion?.observation_action || null,
          affirmation:        coachingOutput2.range_of_motion_affirmation  || compParamScores2.range_of_motion?.affirmation        || null,
        },
      }
      const comparisonData = {
        has_comparison:        !!(haikuCall2 && Object.keys(haikuCall2).length > 0),
        progression_verdict:   haikuCall2.progression_verdict  || null,
        progress_direction:    haikuCall2.progress_direction    || null,
        weight_recommendation: haikuCall2.weight_recommendation || null,
        current: {
          date_label: baseAnalysis.created_at
            ? new Date(baseAnalysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "Current",
          weight_value:           baseAnalysis.weight_value ?? 0,
          weight_unit:            baseAnalysis.weight_unit  ?? "lbs",
          overall_form_score:     compCurrentOverall,
          posture_score:          compCurrentPosture,
          stability_score:        compCurrentStability,
          movement_quality_score: compCurrentMQ,
          range_of_motion_score:  compCurrentROM,
          reps:                   parsedReps,
        },
        previous: {
          date_label:             haikuCall2.previous_session_date
            ? new Date(haikuCall2.previous_session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : comp2PreviousScores.date_label || "Previous",
          weight_value:           comp2PreviousScores.weight_value ?? haikuCall2.previous_weight_value ?? null,
          weight_unit:            comp2PreviousScores.weight_unit  ?? haikuCall2.previous_weight_unit  ?? "lbs",
          overall_form_score:     compPrevOverall,
          posture_score:          compPrevPosture,
          stability_score:        compPrevStability,
          movement_quality_score: compPrevMQ,
          range_of_motion_score:  compPrevROM,
          reps:                   [],
        },
        comparison_coaching: {
          summary_paragraph:
            haikuCall2.progression_verdict    ||
            coachingOutput2.summary_paragraph ||
            coachingOutput2.verdict_summary   || "",
          parameters: compParameters2,
        },
      }
      setSelectedLiveSessionId(sessionId)
      setSelectedLiveSessionData(parsedCurrentResult)
      setLiveCurrentData(parsedCurrentResult)
      setLiveCompData(comparisonData)
    } catch (err) { console.error("Failed to load live session details:", err) }
  }

  function safeJsonLoad(val) {
    if (!val) return null
    if (typeof val === "object") return val
    try { return JSON.parse(val) } catch { return val }
  }

  const data = useMemo(() => {
    if (liveCurrentData)       return liveCurrentData
    if (state?.analysisResult) return state.analysisResult
    return devFixture === "clean" ? FIXTURE_CLEAN : FIXTURE_WITH_ISSUES
  }, [liveCurrentData, state?.analysisResult, devFixture])

  const compData = useMemo(() => {
    if (liveCompData) return liveCompData
    if (data.progression_results) return safeJsonLoad(data.progression_results)
    return devComp === "with-data" ? FIXTURE_COMPARISON : FIXTURE_COMP_EMPTY
  }, [liveCompData, data.progression_results, devComp])

  const isDevMode    = !state?.analysisResult
  const isProgression = tab === "progression"

  const summary  = data.summary  || {}
  const coaching = data.coaching || {}
  const params   = coaching.parameters || {}
  const reps     = data.reps   || []
  const issues   = data.issues || []

  const videoSrc  = state?.videoPreviewUrl || (data.video_url ? `${BASE_URL}/${data.video_url}` : null)
  const overall   = summary.overall_form_score ?? 0
  const repScores = reps.map(r => r.form_score ?? 0)

  const headerExercise = (data.exercise_name || data.display_name || data.exercise_id || "Session")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const weightLabel = data.weight_value != null && data.weight_unit
    ? `${data.weight_value}${data.weight_unit}` : null
  const createdAt = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""
  const repCount = reps.length

  const statusFailed = data.status === "failed" || (overall === 0 && reps.length === 0 && issues.length > 0)

  const hasComparison = !!(compData.has_comparison || compData.progression_verdict || compData.progress_direction || compData.coaching_reasoning)
  const compCurrent   = compData.current  || {}
  const compPrevious  = compData.previous || {}
  const compCoaching  = compData.comparison_coaching || {}
  const compParams    = compCoaching.parameters || {}

  function delta(cur, prev) {
    if (cur == null || prev == null) return null
    return cur - prev
  }

  const NAV_ITEMS = [
    { label: "Home",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", path: "/"         },
    { label: "Plan",     icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", path: "/plan"     },
    { label: "Analysis", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", path: "/results", active: true },
    { label: "Timeline", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", path: "/timeline" },
    { label: "Profile",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", path: "/profile"  },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>
      <div className="max-w-sm mx-auto pb-28">

        <div className="pt-6 pb-3 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900">{headerExercise}</h1>
        </div>

        <div className="mx-4 mb-4 flex rounded-2xl p-1" style={{ background: "#EDE9FE" }}>
          {[["analysis", "Analysis"], ["progression", "Progression"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:  tab === key ? "white" : "transparent",
                color:       tab === key ? "#6366f1" : "#9ca3af",
                boxShadow:   tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PROGRESSION TAB ── */}
        {isProgression && (
          <>
            {!hasComparison ? (
              <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="text-3xl mb-3">📊</div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {compData.empty_state_message || "No previous session found to compare against."}
                </p>
              </div>
            ) : (
              <>
                <div className="mx-4 mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white flex divide-x divide-gray-100">
                  <FramePlaceholder
                    label={compPrevious.date_label || "Previous"}
                    weight={compPrevious.weight_value != null ? `${compPrevious.weight_value}${(compPrevious.weight_unit || "lbs").toUpperCase()}` : "—"}
                    highlight={false}
                  />
                  <FramePlaceholder
                    label={compCurrent.date_label || "Current"}
                    weight={compCurrent.weight_value != null ? `${compCurrent.weight_value}${(compCurrent.weight_unit || "lbs").toUpperCase()}` : "—"}
                    highlight={true}
                  />
                </div>

                <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
                  <div className="text-white text-sm font-bold mb-3">Progression</div>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <BigScoreRing score={compCurrent.overall_form_score ?? 0} />
                      <span className="text-white text-xs opacity-80">Form Score</span>
                    </div>
                    <div className="flex-1">
                      {compPrevious.overall_form_score != null && compCurrent.overall_form_score != null && (
                        <div className="text-white text-xs font-bold mb-1 opacity-90">
                          {(compCurrent.overall_form_score - compPrevious.overall_form_score) > 0 ? "+" : ""}
                          {compCurrent.overall_form_score - compPrevious.overall_form_score} vs last session
                        </div>
                      )}
                      <p className="text-white text-xs leading-relaxed opacity-90">
                        {compCoaching.summary_paragraph || compData.progression_verdict || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mx-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" style={{ color: "#14b8a6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                    </svg>
                    <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Key Insights</h2>
                  </div>
                  {PARAMS.map((p, i) => {
                    const cp    = compParams[p.compKey] || {}
                    const score = cp.score ?? compCurrent[`${p.summaryKey}_score`] ?? 0
                    const prev  = compPrevious[`${p.summaryKey}_score`] ?? null
                    const d     = delta(score, prev)
                    const rawNote = cp.observation_action || cp.observation || cp.affirmation || cp.correction || compData[`${p.key}_trend`]
                    const note = rawNote?.trim() ? rawNote : DEFAULT_NOTES[p.key]
                    return (
                      <div key={p.key} className="rounded-2xl mb-2 overflow-hidden bg-white" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div className="flex items-start gap-4 px-4 py-3">
                          <LargeScoreRing score={score} size={72} strokeW={7} delta={d} label={p.label} />
                          <p className="text-sm text-gray-600 leading-relaxed pt-2 flex-1">{note}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" style={{ color: "#14b8a6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 4" />
                    </svg>
                    <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Performance Over Reps</h2>
                  </div>
                  <RepChart repScores={compCurrent.reps?.map(r => r.form_score) || []} />
                </div>
              </>
            )}
          </>
        )}

        {/* ── ANALYSIS TAB ── */}
        {!isProgression && (
          <>
            <div className="mx-4 mb-4 rounded-2xl overflow-hidden">
              {videoSrc ? (
                <VideoPlayer src={videoSrc} />
              ) : (
                <div className="h-52 flex flex-col items-center justify-center gap-3" style={{ background: "#0f0f1a", borderRadius: "1rem" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#14b8a6", boxShadow: "0 0 0 6px rgba(20,184,166,0.25)" }}>
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <p className="text-xs text-gray-500">Frame analysis coming soon</p>
                </div>
              )}
            </div>

            {statusFailed && (
              <div className="mx-4 mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                This session didn't produce a full form score — see coaching notes below.
              </div>
            )}

            <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
              <div className="text-white text-sm font-bold mb-3">AI Verdict • Maintain</div>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <BigScoreRing score={overall} />
                  <span className="text-white text-xs opacity-80">Form Score</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs leading-relaxed opacity-90 mb-3">
                    {coaching.summary_paragraph || "Keep it up — your form is consistent."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {createdAt && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.2)" }}>{createdAt}</span>
                    )}
                    {weightLabel && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.2)" }}>{weightLabel}</span>
                    )}
                    {repCount > 0 && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.2)" }}>{repCount} Reps</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" style={{ color: "#14b8a6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Key Insights</h2>
              </div>
              {PARAMS.map((p, i) => {
                const d     = params[p.key] || {}
                const score = Math.round(d.score ?? summary?.[`${p.summaryKey}_score`] ?? 0)
                return (
                  <ParamCard
                    key={p.key}
                    label={p.label}
                    score={score}
                    observation={d.observation || null}
                    affirmation={d.affirmation || null}
                    correction={d.correction || d.feedback || null}
                    defaultNote={DEFAULT_NOTES[p.key]}
                    initOpen={i === 0}
                  />
                )
              })}
            </div>

            <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" style={{ color: "#14b8a6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 4" />
                </svg>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Performance Over Reps</h2>
              </div>
              <RepChart repScores={repScores} />
            </div>
          </>
        )}

        <div className="mx-4 mt-2 mb-6 flex flex-col gap-3">
          <button type="button" onClick={() => navigate("/upload")}
            className="w-full py-4 rounded-2xl text-white text-sm font-bold tracking-wide"
            style={{ background: "linear-gradient(90deg, #4f46e5, #818cf8)" }}>
            New Upload
          </button>
          <button type="button" onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl text-sm font-semibold bg-white"
            style={{ border: "1.5px solid #e5e7eb", color: "#374151" }}>
            Continue to Set 3
          </button>
        </div>

        {isDevMode && (
          <div className="mt-4 mx-4 text-center text-xs text-gray-400 space-y-4 pt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {liveSessions.length > 0 && (
              <div className="space-y-1.5 text-left">
                <div className="font-semibold text-gray-700 text-xs flex items-center justify-between">
                  <span>⚡ Load Live Session from SQLite DB:</span>
                  <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full font-medium">v3.0 DB</span>
                </div>
                <select value={selectedLiveSessionId} onChange={e => handleLoadLiveSession(e.target.value)}
                  className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium">
                  <option value="">-- Select from DB or use Local Fixtures --</option>
                  {liveSessions.map(s => {
                    const dateStr = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
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
                {["clean", "issues"].map(f => (
                  <button key={f} type="button" onClick={() => { handleLoadLiveSession(""); setDevFixture(f) }}
                    className={`underline text-xs ${devFixture === f && !selectedLiveSessionId ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "clean" ? "No Issues" : "With Issues"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">Static Comparison Fixtures</div>
              <div className="flex justify-center gap-4">
                {["with-data", "empty"].map(f => (
                  <button key={f} type="button" onClick={() => { handleLoadLiveSession(""); setDevComp(f) }}
                    className={`underline text-xs ${devComp === f && !selectedLiveSessionId ? "text-teal-600 font-semibold" : "text-gray-400"}`}>
                    {f === "with-data" ? "With Data" : "Empty State"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-2 px-4" style={{ colorScheme: "light" }}>
        {NAV_ITEMS.map(({ label, icon, path, active }) => (
          <button key={label} type="button" onClick={() => navigate(path)} className="flex flex-col items-center gap-0.5">
            {active ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center -mt-4 shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            )}
            <span className="text-[10px]" style={{ color: active ? "#6366f1" : "#9ca3af" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}