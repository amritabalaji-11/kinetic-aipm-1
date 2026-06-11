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

function TruncatedText({ text, maxLines = 3 }) {
  const [expanded, setExpanded] = useState(false)
  if (!text || !text.trim()) return null
  const lines = text.trim().split('\n').filter(l => l.trim())
  const shouldTruncate = lines.length > maxLines
  const displayText = expanded ? lines.join('\n') : lines.slice(0, maxLines).join('\n')
  return (
    <div>
      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {shouldTruncate && !expanded && (
        <button onClick={() => setExpanded(true)} className="text-[11px] text-gray-400 hover:text-gray-600 mt-1">
          ...more
        </button>
      )}
      {expanded && shouldTruncate && (
        <button onClick={() => setExpanded(false)} className="text-[11px] text-gray-400 hover:text-gray-600 mt-1">
          show less
        </button>
      )}
    </div>
  )
}

function ParameterInsightCard({ paramKey, label, currentScore, previousScore, trendText, defaultNote }) {
  const [expanded, setExpanded] = useState(false)
  const displayTrendOnly = false // Always collapse by default

  const paramColors = {
    range_of_motion: "#0284C7",
    stability: "#EAAF1C",
    posture: "#14b8a6",
    movement_quality: "#9747FF"
  }

  const d = previousScore != null && currentScore != null ? currentScore - previousScore : null
  const borderColor = paramColors[paramKey] || (currentScore >= 80 ? "#22C55E" : currentScore >= 65 ? "#F97316" : "#EF4444")
  const deltaColor = d == null ? "#9ca3af" : d > 0 ? "#22C55E" : d < 0 ? "#EF4444" : "#9ca3af"
  const deltaArrow = d == null ? "" : d > 0 ? "↑" : d < 0 ? "↓" : ""
  const deltaBg = d == null ? "bg-gray-100" : d > 0 ? "bg-green-100" : d < 0 ? "bg-red-100" : "bg-gray-100"

  const displayText = trendText || defaultNote

  return (
    <div className="rounded-2xl mb-3 bg-white overflow-hidden" style={{ border: "1px solid #f3f4f6", borderLeft: `4px solid ${borderColor}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-4 px-4 py-4">
        <ScoreRing score={currentScore} />
        <div className="flex-1 text-left">
          <div className="text-base font-bold text-gray-900">{label}</div>
          <div className="text-sm text-gray-500 mt-1">
            {previousScore != null ? `${previousScore} → ${currentScore}` : `${currentScore}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${deltaBg}`} style={{ color: deltaColor }}>
            {d != null ? `${d > 0 ? '+' : ''}${d}` : '—'}
          </div>
          <svg className="w-4 h-4 transition-transform text-gray-400" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && displayText && (
        <div className="px-4 pb-4 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {displayText}
        </div>
      )}
    </div>
  )
}

function ParamCard({ label, score, observation, affirmation, correction, defaultNote, initOpen = false, paramKey = "" }) {
  const [open, setOpen] = useState(initOpen)
  // Parameter-specific colors (avoid green, orange, red — reserved for score conditional formatting)
  const paramColors = {
    range_of_motion: "#0284C7",    // Blue
    stability: "#EAAF1C",           // Gold/Yellow
    posture: "#14b8a6",             // Teal/Cyan
    movement_quality: "#9747FF"     // Purple (doesn't conflict with score colors)
  }
  const borderColor = paramColors[paramKey] || (score >= 80 ? "#22C55E" : score >= 65 ? "#F97316" : "#EF4444")
  const observationPreview = observation ? observation.split('\n')[0].substring(0, 80) : ""
  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: "#fff", border: "1px solid #f3f4f6", borderLeft: `4px solid ${borderColor}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3">
        <ScoreRing score={score} />
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          {observationPreview && <div className="text-xs text-gray-400 mt-0.5 leading-snug">{observationPreview}...</div>}
        </div>
        <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: "#d1d5db", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {affirmation && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <TruncatedText text={affirmation} maxLines={3} />
            </div>
          )}
          {observation && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <TruncatedText text={observation} maxLines={3} />
            </div>
          )}
          {correction && (
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2 border-l-4 border-blue-400">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <TruncatedText text={correction} maxLines={4} />
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

function LastSessionCard({ date, weight, unit, whatWeToldYou }) {
  const [expanded, setExpanded] = useState(false)
  if (!whatWeToldYou || !whatWeToldYou.trim()) return null

  const lines = whatWeToldYou.split('\n').filter(l => l.trim())
  const shouldShowMore = lines.length > 4
  const displayText = expanded ? lines.join('\n') : lines.slice(0, 4).join('\n')

  return (
    <div className="mx-4 mb-4 rounded-2xl p-4 bg-white border border-gray-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="text-xs text-gray-400 mb-2">LAST SESSION · {date} · {weight}{unit}</div>
      <div className="text-sm font-semibold text-blue-600 mb-3">WHAT WE TOLD YOU</div>
      <div className="flex gap-3">
        <div className="w-1 bg-blue-600 flex-shrink-0 rounded-full"></div>
        <div className="flex-1">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{displayText}</p>
          {shouldShowMore && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
              {expanded ? 'See Less' : 'See More'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function NextSessionFocusBox({ focusItems }) {
  const [expanded, setExpanded] = useState(false)
  if (!focusItems || focusItems.length === 0) return null
  const displayItems = expanded ? focusItems : focusItems.slice(0, 1)
  return (
    <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-white text-sm font-bold">Next Session Focus</div>
        {focusItems.length > 1 && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="text-white opacity-70 hover:opacity-100">
            <svg className="w-5 h-5 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-2">
        {displayItems.map((item, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="text-white text-xs font-semibold opacity-70 flex-shrink-0 mt-1">{i + 1}.</div>
            <p className="text-white text-xs leading-relaxed opacity-90">{item}</p>
          </div>
        ))}
      </div>
      {focusItems.length > 1 && !expanded && (
        <div className="text-white text-[10px] opacity-60 mt-3">+{focusItems.length - 1} more</div>
      )}
    </div>
  )
}

function RepChart({ currentRepScores = [], previousRepScores = [] }) {
  const current = currentRepScores && currentRepScores.length > 0 ? currentRepScores : null
  const previous = previousRepScores && previousRepScores.length > 0 ? previousRepScores : null

  if (!current) {
    return <div className="h-24 flex items-center justify-center text-xs text-gray-400">Not enough reps to chart</div>
  }

  const W = 320, H = 150, PAD = 18
  const maxReps = Math.max(current?.length || 0, previous?.length || 0)
  const xOf = i => PAD + (i / Math.max(maxReps - 1, 1)) * (W - PAD * 2)
  const yOf = v => PAD + (1 - v / 100) * (H - PAD * 2)

  const currentPts = current.map((v, i) => [xOf(i), yOf(v)])
  const previousPts = previous ? previous.map((v, i) => [xOf(i), yOf(v)]) : []

  function sc(s) { return s >= 80 ? "#22C55E" : s >= 65 ? "#F97316" : "#EF4444" }

  const currentAvg = current.reduce((a, b) => a + b, 0) / current.length
  const previousAvg = previous ? previous.reduce((a, b) => a + b, 0) / previous.length : null
  const improvement = previousAvg ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100) : null
  const improvementColor = improvement === null ? "#9ca3af" : improvement > 0 ? "#22C55E" : "#EF4444"
  const improvementLabel = improvement === null ? "—" : `${improvement > 0 ? "+" : ""}${improvement}%`

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 font-medium">Rep-by-Rep Consistency</div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: improvementColor }}>{improvementLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H + 10}>
        <defs>
          <linearGradient id="currentGrad" x1="0" y1="0" x2="1" y2="0">
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
        {previous && (
          <polyline points={previousPts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.8" />
        )}
        <polyline points={currentPts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="url(#currentGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {currentPts.map(([x, y], i) => (
          <circle key={`curr-${i}`} cx={x} cy={y} r={3.5} fill="white" stroke={sc(current[i])} strokeWidth="1.5" />
        ))}
        {previous && previousPts.map(([x, y], i) => (
          <circle key={`prev-${i}`} cx={x} cy={y} r={2.5} fill="none" stroke="#0284C7" strokeWidth="1" opacity="0.8" />
        ))}
        {current.map((_, i) => (
          <text key={i} x={xOf(i)} y={H - 1} fontSize="5.5" fill="#9ca3af" textAnchor="middle">{`R${i + 1}`}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-0.5" style={{ backgroundColor: "url(#currentGrad)" }}></div>
          <span className="text-gray-600">This Session</span>
        </div>
        {previous && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 border-b border-dashed" style={{ borderColor: "#0284C7" }}></div>
            <span className="text-blue-600 font-medium">Last Session</span>
          </div>
        )}
      </div>
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

function FramePlaceholder({ highlight = false, label, weight, imageUrl = null, onImageClick = null }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const isPrevious = label && label.toLowerCase().includes("previous")

  return (
    <div className="flex flex-col items-center py-3 px-2 flex-1">
      <div className={`text-xs mb-0.5 ${isPrevious ? "text-purple-600 font-semibold" : "text-gray-600"}`}>{label}</div>
      <div className={`text-xs font-semibold mb-2 ${isPrevious ? "text-purple-700" : "text-gray-900"}`}>{weight}</div>
      <div className="relative h-28 w-full flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden group">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover cursor-pointer"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.warn("⚠️ Failed to load image:", imageUrl)
              setImageLoaded(false)
            }}
            onClick={() => onImageClick?.(imageUrl)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        ) : null}
        {imageLoaded && imageUrl && (
          <button
            onClick={() => onImageClick?.(imageUrl)}
            className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
            title="Expand image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 3v6h6M21 21v-6h-6M3 21h6v-6M21 3h-6v6"/>
            </svg>
          </button>
        )}
        {!imageLoaded && (
          <>
            <div className="w-14 h-24 bg-gray-200 rounded-full opacity-30" />
            {highlight && (
              <>
                <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-300" />
                <div className="absolute top-12 left-10 w-3 h-3 rounded-full bg-amber-300 shadow-lg shadow-amber-200" />
                <div className="absolute bottom-5 left-14 w-3 h-3 rounded-full bg-amber-200 shadow-lg shadow-amber-100" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FormHistorySection({ userId, exerciseId, currentAnalysisId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  useEffect(() => {
    if (!userId) return
    fetch(`${BASE_URL}/form_analysis_results/${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const filtered = data.filter(s => s.analysis_id !== currentAnalysisId).slice(0, 3)
          setHistory(filtered)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, currentAnalysisId])

  if (loading || history.length === 0) return null

  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Form History</h2>
      </div>
      <div className="space-y-3">
        {history.map(session => (
          <div key={session.analysis_id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900">{session.date ? new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</p>
              <p className="text-xs text-gray-600">{session.load_kg ?? "—"} kg • {session.rep_count ?? "—"} reps</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: session.score >= 80 ? "#22C55E" : session.score >= 65 ? "#F97316" : "#EF4444" }}>
                {session.score ?? "—"}
              </span>
              <span className="text-xs text-gray-500">/100</span>
            </div>
          </div>
        ))}
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
  const [fullscreenImage, setFullscreenImage] = useState(null)

  const [liveSessions,            setLiveSessions]            = useState([])
  const [selectedLiveSessionId,   setSelectedLiveSessionId]   = useState("")
  const [selectedLiveSessionData, setSelectedLiveSessionData] = useState(null)
  const [liveCurrentData,  setLiveCurrentData]  = useState(null)
  const [liveCompData,     setLiveCompData]      = useState(null)
  const [userAnnotatedFrameUrl, setUserAnnotatedFrameUrl] = useState(null)
  const [formHistory, setFormHistory] = useState([])
  const [formHistoryLoading, setFormHistoryLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState({})

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  useEffect(() => {
    async function fetchUserData() {
      try {
        const userId = localStorage.getItem("active_user_id")
        if (!userId) return
        const r = await fetch(`${BASE_URL}/users/${userId}/profile`)
        if (r.ok) {
          const profile = await r.json()
          if (profile.annotated_frame_url) {
            let url = profile.annotated_frame_url
            if (url.startsWith('http')) {
              // Already a full URL, use as-is
            } else if (url.startsWith('/')) {
              // Path from frontend public folder — use current origin (frontend)
              url = window.location.origin + url
            } else {
              // Relative path — prepend backend base URL
              url = `${BASE_URL}/${url}`
            }
            setUserAnnotatedFrameUrl(url)
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err)
      }
    }
    async function fetchSessions() {
      try {
        const userId = localStorage.getItem("active_user_id")
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
    async function fetchFormHistory() {
      try {
        const userId = localStorage.getItem("active_user_id") || "user_001"
        const url = `${BASE_URL}/form_analysis_results/${userId}`
        console.log("🔄 Fetching form history from:", url)
        const r = await fetch(url)
        console.log("📡 Form history response status:", r.status)
        const data = await (r.ok ? r.json() : [])
        console.log("📊 Form history data received:", data)
        if (Array.isArray(data)) {
          console.log("✅ Form history loaded, count:", data.length)
          setFormHistory(data)
        } else {
          console.warn("⚠️ Form history response is not an array:", data)
        }
        setFormHistoryLoading(false)
      } catch (err) {
        console.error("❌ Error fetching form history:", err)
        setFormHistoryLoading(false)
      }
    }
    fetchUserData()
    fetchSessions()
    fetchFormHistory()
  }, [BASE_URL])

  useEffect(() => {
    if (state?.analysisId) {
      handleLoadLiveSession(state.analysisId)
    } else if (!liveCurrentData) {
      // Load default fixture when page opens without live data
      setLiveCurrentData(FIXTURE_CLEAN)
      setLiveCompData(null)
    }
  }, [state?.analysisId, liveCurrentData])

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

      // Fetch progression data for comparison (includes "What We Told You")
      let progressionData = {}
      try {
        const progRes = await fetch(`${BASE_URL}/analysis/${sessionId}/progression`)
        if (progRes.ok) {
          progressionData = await progRes.json()
          console.log("📊 Progression data:", progressionData)
        }
      } catch (e) {
        console.warn("Could not fetch progression data:", e)
      }

      // Merge progression data into haikuCall2 for compatibility
      // Check if progression data has useful content instead of relying on available flag
      if (progressionData && Object.keys(progressionData).length > 0) {
        haikuCall2.previous_next_session_focus = progressionData.previous_next_session_focus || []
        haikuCall2.previous_session_date = progressionData.previous_session?.date
        haikuCall2.previous_weight_value = progressionData.previous_session?.weight_value
        haikuCall2.previous_weight_unit = progressionData.previous_session?.weight_unit
        haikuCall2.weight_recommendation = progressionData.ai_verdict?.weight_recommendation
        haikuCall2.progression_verdict = progressionData.ai_verdict?.progression_verdict
        haikuCall2.progress_direction = progressionData.ai_verdict?.progress_direction
        haikuCall2.posture_trend = progressionData.ai_verdict?.posture_trend
        haikuCall2.stability_trend = progressionData.ai_verdict?.stability_trend
        haikuCall2.range_of_motion_trend = progressionData.ai_verdict?.range_of_motion_trend
        haikuCall2.movement_quality_trend = progressionData.ai_verdict?.movement_quality_trend

        // Also merge comparison coaching if available
        if (progressionData.comparison_coaching) {
          haikuCall2.comparison_coaching = progressionData.comparison_coaching
        }

        console.log("✅ Merged progression data into haikuCall2:", {
          previous_session_date: haikuCall2.previous_session_date,
          previous_weight_value: haikuCall2.previous_weight_value,
          previous_weight_unit: haikuCall2.previous_weight_unit,
          previous_next_session_focus: haikuCall2.previous_next_session_focus,
          weight_recommendation: haikuCall2.weight_recommendation,
          progression_verdict: haikuCall2.progression_verdict
        })
      } else {
        console.warn("❌ No progression data available", { progressionData })
      }

      // Parse nested coaching_output structure
      const coachingOutput1 = typeof haikuCall1.coaching_output === 'string'
        ? (function() { try { return JSON.parse(haikuCall1.coaching_output) } catch { return {} } })()
        : (haikuCall1.coaching_output || {})

      // The parameters can be nested at: parameter_scores OR coaching_output.parameter_scores OR parameters
      let nestedParams = coachingOutput1.parameter_scores || coachingOutput1.coaching_output?.parameter_scores || coachingOutput1.parameters || coachingOutput1.coaching_output?.parameters || {}

      // Map tempo → range_of_motion (Haiku returns tempo, UI expects range_of_motion)
      if (nestedParams.tempo && !nestedParams.range_of_motion) {
        nestedParams = { ...nestedParams, range_of_motion: nestedParams.tempo }
      }

      const currentSummary = {
        overall_form_score:     haikuCall1.overall_form_score     || coachingOutput1.overall_form_score || 0,
        posture_score:          haikuCall1.posture_score          || nestedParams.posture?.score          || 0,
        stability_score:        haikuCall1.stability_score        || nestedParams.stability?.score        || 0,
        movement_quality_score: haikuCall1.movement_quality_score || nestedParams.movement_quality?.score || 0,
        range_of_motion_score:  haikuCall1.range_of_motion_score  || nestedParams.range_of_motion?.score  || 0,
        tempo_score:            haikuCall1.tempo_score            || nestedParams.tempo?.score            || 0,
        summary_paragraph:
          haikuCall1.verdict_summary   ||
          coachingOutput1.verdict_summary ||
          haikuCall1.summary_paragraph ||
          record.summary_paragraph          || "",
      }

      const currentParameters = {
        posture: {
          score:       currentSummary.posture_score,
          affirmation: nestedParams.posture?.affirmation || null,
          observation: nestedParams.posture?.observation || null,
          correction:  nestedParams.posture?.correction  || null,
        },
        stability: {
          score:       currentSummary.stability_score,
          affirmation: nestedParams.stability?.affirmation || null,
          observation: nestedParams.stability?.observation || null,
          correction:  nestedParams.stability?.correction  || null,
        },
        movement_quality: {
          score:       currentSummary.movement_quality_score,
          affirmation: nestedParams.movement_quality?.affirmation || null,
          observation: nestedParams.movement_quality?.observation || null,
          correction:  nestedParams.movement_quality?.correction  || null,
        },
        range_of_motion: {
          score:       currentSummary.range_of_motion_score,
          affirmation: nestedParams.range_of_motion?.affirmation || null,
          observation: nestedParams.range_of_motion?.observation || null,
          correction:  nestedParams.range_of_motion?.correction  || null,
        },
      }
      const nextSessionFocus = coachingOutput1.coaching_output?.next_session_focus || coachingOutput1.next_session_focus || []

      const currentCoaching = {
        summary_paragraph:  currentSummary.summary_paragraph,
        feedback:           coachingOutput1.correct?.[0]?.cue || "",
        next_session_focus: nextSessionFocus,
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

      // Fallback to Haiku rep_scores if biomechanics data not available
      if (parsedReps.length === 0 && (haikuCall1.rep_scores || coachingOutput1.rep_scores)) {
        const repsData = haikuCall1.rep_scores || coachingOutput1.rep_scores || []
        parsedReps = repsData.map(r => ({ rep_number: r.rep_number, form_score: r.form_score }))
      }
      const parsedCurrentResult = {
        analysis_id:   baseAnalysis.analysis_id  || haikuCall1.analysis_id,
        session_id:    baseAnalysis.session_id   || haikuCall1.session_id,
        user_id:       baseAnalysis.user_id      || coachingOutput1.session_metadata?.user_id || localStorage.getItem("active_user_id"),
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
        annotated_frame_url: baseAnalysis.annotated_frame_urls?.[0] || baseAnalysis.annotated_frame_url || haikuCall1.annotated_frame_url || null,
      }
      // Fetch previous session from database (form_analysis_results table)
      let previousAnalysis = null
      const userId = parsedCurrentResult.user_id
      const exerciseId = parsedCurrentResult.exercise_id
      try {
        const histRes = await fetch(`${BASE_URL}/form_analysis_results/${userId}`)
        if (histRes.ok) {
          const allResults = await histRes.json()
          // Filter to get previous session for same exercise
          const sameExerciseResults = allResults.filter(r => r.exercise === exerciseId)
          if (sameExerciseResults.length >= 2) {
            // Get the second-most recent (first is current, second is previous)
            const prevResult = sameExerciseResults[1]
            // Now fetch the full previous analysis to get all haiku data
            const fullPrevRes = await fetch(`${BASE_URL}/analysis/${prevResult.analysis_id}`)
            if (fullPrevRes.ok) {
              previousAnalysis = await fullPrevRes.json()
              // Map tempo → range_of_motion if tempo is present but range_of_motion is missing
              if (previousAnalysis?.haiku_call_1?.tempo_score && !previousAnalysis?.haiku_call_1?.range_of_motion_score) {
                previousAnalysis.haiku_call_1.range_of_motion_score = previousAnalysis.haiku_call_1.tempo_score
              }
              console.log("📊 Previous analysis found:", previousAnalysis)
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch previous analysis:", e)
      }

      // Parse previous session rep_scores from biomechanics_json (like current session)
      let parsedPreviousReps = []
      try {
        const prevBiomech = previousAnalysis?.analysis?.biomechanics_json ? JSON.parse(previousAnalysis.analysis.biomechanics_json) : null
        if (prevBiomech?.reps?.length) {
          parsedPreviousReps = prevBiomech.reps.map((rep) => {
            let formScore = 100
            if (rep.depth_data?.depth_classification === "Warning") formScore -= 20
            if (rep.depth_data?.depth_insufficient_flag)             formScore -= 15
            if (rep.back_data?.back_label === "Warning")             formScore -= 15
            if (rep.back_data?.back_angle_at_bottom > 30)           formScore -= 20
            if (rep.back_data?.back_angle_at_bottom > 45)           formScore -= 25
            return { rep_number: rep.rep_number, form_score: Math.max(0, Math.min(100, formScore)) }
          })
        }
      } catch (e) { console.warn("Failed to parse previous biomechanics:", e) }

      console.log("📊 Parsed previous reps:", parsedPreviousReps)

      const coachingOutput2   = haikuCall2.coaching_output || haikuCall2
      const compParamScores2  = coachingOutput2.parameter_scores || {}
      const comp2CurrentScores  = haikuCall2.current_session  || {}
      const comp2PreviousScores = haikuCall2.previous_session || {}

      // Use previous analysis data if available
      const compCurrentOverall    = comp2CurrentScores.overall_form_score    ?? haikuCall2.current_overall_form_score    ?? currentSummary.overall_form_score
      const compCurrentPosture    = comp2CurrentScores.posture_score          ?? haikuCall2.current_posture_score          ?? currentSummary.posture_score
      const compCurrentStability  = comp2CurrentScores.stability_score        ?? haikuCall2.current_stability_score        ?? currentSummary.stability_score
      const compCurrentMQ         = comp2CurrentScores.movement_quality_score ?? haikuCall2.current_movement_quality_score ?? currentSummary.movement_quality_score
      const compCurrentROM        = comp2CurrentScores.range_of_motion_score  ?? haikuCall2.current_range_of_motion_score  ?? currentSummary.range_of_motion_score

      const compPrevOverall   = comp2PreviousScores.overall_form_score    ?? haikuCall2.previous_overall_form_score    ?? previousAnalysis?.haiku_call_1?.overall_form_score ?? null
      const compPrevPosture   = comp2PreviousScores.posture_score          ?? haikuCall2.previous_posture_score          ?? previousAnalysis?.haiku_call_1?.posture_score ?? null
      const compPrevStability = comp2PreviousScores.stability_score        ?? haikuCall2.previous_stability_score        ?? previousAnalysis?.haiku_call_1?.stability_score ?? null
      const compPrevMQ        = comp2PreviousScores.movement_quality_score ?? haikuCall2.previous_movement_quality_score ?? previousAnalysis?.haiku_call_1?.movement_quality_score ?? null
      const compPrevROM       = comp2PreviousScores.range_of_motion_score  ?? haikuCall2.previous_range_of_motion_score  ?? previousAnalysis?.haiku_call_1?.range_of_motion_score ?? null

      console.log("📊 Previous session scores:", { compPrevOverall, compPrevPosture, compPrevStability, compPrevMQ, compPrevROM })
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
        previous_next_session_focus: haikuCall2.previous_next_session_focus || [],
        posture_trend:         haikuCall2.posture_trend || null,
        stability_trend:       haikuCall2.stability_trend || null,
        movement_quality_trend: haikuCall2.movement_quality_trend || null,
        range_of_motion_trend: haikuCall2.range_of_motion_trend || null,
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
          annotated_frame_url:    baseAnalysis.annotated_frame_url || haikuCall1.annotated_frame_url || null,
        },
        previous: {
          date_label:             previousAnalysis?.created_at
            ? new Date(previousAnalysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : haikuCall2.previous_session_date
            ? new Date(haikuCall2.previous_session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : comp2PreviousScores.date_label || "Previous",
          weight_value:           previousAnalysis?.weight_value ?? comp2PreviousScores.weight_value ?? haikuCall2.previous_weight_value ?? null,
          weight_unit:            previousAnalysis?.weight_unit ?? comp2PreviousScores.weight_unit  ?? haikuCall2.previous_weight_unit  ?? "lbs",
          overall_form_score:     compPrevOverall,
          posture_score:          compPrevPosture,
          stability_score:        compPrevStability,
          movement_quality_score: compPrevMQ,
          range_of_motion_score:  compPrevROM,
          reps:                   parsedPreviousReps,
          annotated_frame_url:    previousAnalysis?.annotated_frame_urls?.[0] ?? previousAnalysis?.annotated_frame_url ?? comp2PreviousScores.annotated_frame_url ?? null,
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

    } catch (err) {
      console.error("Failed to load live session details:", err)
    }
  }

  function safeJsonLoad(val) {
    if (!val) return null
    if (typeof val === "object") return val
    try { return JSON.parse(val) } catch { return val }
  }

  const data = useMemo(() => {
    if (liveCurrentData) {
      console.log("✅ Using liveCurrentData", liveCurrentData)
      return liveCurrentData
    }
    if (state?.analysisResult) {
      console.log("✅ Using state.analysisResult, has summary?", !!state.analysisResult.summary)
      return state.analysisResult
    }
    console.log("✅ Using fixture", devFixture)
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

  useEffect(() => {
    console.log("📦 Loaded data source:", { hasLiveData: !!liveCurrentData, hasStateData: !!state?.analysisResult, devFixture })
    console.log("📊 Data summary scores:", {
      overall: summary.overall_form_score,
      posture: summary.posture_score,
      stability: summary.stability_score,
      movement_quality: summary.movement_quality_score,
      range_of_motion: summary.range_of_motion_score
    })
    console.log("🎯 Extracted params:", params)
    console.log("📋 Coaching object:", coaching)
    console.log("💾 Full data object keys:", Object.keys(data).slice(0, 20))
  }, [data, liveCurrentData, state?.analysisResult, devFixture, summary, params, coaching])

  const videoSrc    = state?.videoPreviewUrl || (data.video_url ? `${BASE_URL}/${data.video_url}` : null)
  const frameSrc    = data.annotated_frame_url
    ? (function() {
        if (data.annotated_frame_url.startsWith('http')) return data.annotated_frame_url
        if (data.annotated_frame_url.startsWith('/')) return data.annotated_frame_url
        return `${BASE_URL}/${data.annotated_frame_url}`
      })()
    : null

  // DEBUG: Check if frameSrc is being set
  if (data.annotated_frame_url && !frameSrc) {
    console.warn("⚠️ ISSUE: annotated_frame_url exists but frameSrc is null!", {
      annotated_frame_url: data.annotated_frame_url,
      frameSrc
    })
  } else if (frameSrc) {
    console.log("✅ frameSrc set successfully:", frameSrc)
  }

  const overall   = summary.overall_form_score ?? 0
  const repScores = reps.map(r => r.form_score ?? 0)

  useEffect(() => {
    console.log("🖼️ Image/Video Debug:", {
      userAnnotatedFrameUrl,
      frameSrc,
      videoSrc,
      dataAnnotatedUrl: data.annotated_frame_url,
      dataVideoUrl: data.video_url,
    })
  }, [userAnnotatedFrameUrl, frameSrc, videoSrc, data.annotated_frame_url, data.video_url])

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
    { label: "Home",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", path: "/home"     },
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

        <div className="mx-4 mb-4 flex rounded-2xl p-1" style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
          {[["analysis", "Analysis"], ["progression", "Progression"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:  tab === key ? "white" : "transparent",
                color:       tab === key ? "#0284C7" : "rgba(255,255,255,0.8)",
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
                  {(() => {
                    const userId = localStorage.getItem("active_user_id") || "user_001";

                    // Helper to get formhistory image - use a single consistent image for all weights
                    const getFormHistoryImage = (weight) => {
                      // Use user-specific image
                      if (userId === "user_003") {
                        return `/formhistory/${userId}/user_003_1.jpg`;
                      }
                      return `/formhistory/${userId}/user_001_front_17.5kg.jpg`;
                    };

                    const prevImageUrl = compPrevious.annotated_frame_url || getFormHistoryImage(compPrevious.weight_value);
                    const currImageUrl = userAnnotatedFrameUrl || compCurrent.annotated_frame_url || getFormHistoryImage(compCurrent.weight_value);

                    console.log("🖼️ Comparison Frame URLs:", {
                      prevImageUrl,
                      currImageUrl,
                      prevWeight: compPrevious.weight_value,
                      currWeight: compCurrent.weight_value
                    })

                    return (
                      <>
                        <FramePlaceholder
                          label={compPrevious.date_label || "Previous"}
                          weight={compPrevious.weight_value != null ? `${compPrevious.weight_value}${(compPrevious.weight_unit || "lbs").toUpperCase()}` : "—"}
                          highlight={false}
                          imageUrl={prevImageUrl}
                          onImageClick={setFullscreenImage}
                        />
                        <FramePlaceholder
                          label={compCurrent.date_label || "Current"}
                          weight={compCurrent.weight_value != null ? `${compCurrent.weight_value}${(compCurrent.weight_unit || "lbs").toUpperCase()}` : "—"}
                          highlight={true}
                          imageUrl={currImageUrl}
                          onImageClick={setFullscreenImage}
                        />
                      </>
                    );
                  })()}
                </div>

                <LastSessionCard
                  date={compPrevious.date_label || "Previous"}
                  weight={compPrevious.weight_value ?? "—"}
                  unit={compPrevious.weight_unit ? compPrevious.weight_unit.toUpperCase() : ""}
                  whatWeToldYou={compData.previous_next_session_focus?.join('\n') || ""}
                />

                <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <BigScoreRing score={compCurrent.overall_form_score ?? 0} />
                        {compPrevious.overall_form_score != null && compCurrent.overall_form_score != null && (
                          <div
                            className="absolute -right-2 -bottom-1 text-white text-xs font-bold px-2 py-1 rounded-full"
                            style={{
                              background: (compCurrent.overall_form_score - compPrevious.overall_form_score) > 0 ? "#22c55e" : (compCurrent.overall_form_score - compPrevious.overall_form_score) < 0 ? "#ef4444" : "#6b7280"
                            }}
                          >
                            {(compCurrent.overall_form_score - compPrevious.overall_form_score) > 0 ? "+" : ""}
                            {compCurrent.overall_form_score - compPrevious.overall_form_score}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-xs opacity-80">Form Score</span>
                      {compData.weight_recommendation?.target_weight_kg && (
                        <div className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                          {compData.weight_recommendation.action?.toUpperCase() || "HOLD"} AT {compData.weight_recommendation.target_weight_kg}KG
                        </div>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="text-white text-sm font-bold mb-2">AI Verdict</div>
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
                  {PARAMS.map((p) => {
                    const currentScore = compCurrent[`${p.summaryKey}_score`] ?? 0
                    const previousScore = compPrevious[`${p.summaryKey}_score`] ?? null
                    const trendText = compData[`${p.key}_trend`] || null
                    return (
                      <ParameterInsightCard
                        key={p.key}
                        paramKey={p.key}
                        label={p.label}
                        currentScore={currentScore}
                        previousScore={previousScore}
                        trendText={trendText}
                        defaultNote={DEFAULT_NOTES[p.key]}
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
                  <RepChart
                    currentRepScores={compCurrent.reps?.map(r => r.form_score) || []}
                    previousRepScores={compPrevious.reps?.map(r => r.form_score) || []}
                  />
                </div>

                {compData.weight_recommendation?.reason && (
                  <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}>
                    <div className="text-white text-sm font-bold mb-2">Weight Recommendation</div>
                    <p className="text-white text-xs leading-relaxed opacity-95">
                      {compData.weight_recommendation.reason}
                    </p>
                  </div>
                )}

                {/* Your Focus This Week */}
                {compData.focus_this_week && (
                  <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full" style={{ background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)" }}></div>
                      <h3 className="text-sm font-bold text-gray-900">Your Focus This Week</h3>
                    </div>
                    <p className="text-xs text-gray-900 leading-relaxed">
                      {compData.focus_this_week}
                    </p>
                  </div>
                )}

                {/* Progress Ladder - Same as HomePage */}
                <div style={{ marginBottom: "20px", marginLeft: "16px", marginRight: "16px", background: "#FFFFFF", borderRadius: "16px", padding: "16px 12px", gap: "16px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#020D1B", margin: "0" }}>Progress ladder</p>
                    <p style={{ fontSize: "12px", fontFamily: "'DM Sans'", color: "#394250", margin: "0", lineHeight: "16px", letterSpacing: "-0.04em" }}>Form scores typically dip when you load heavier. Watch your average per rung, not individual sessions.</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* 14 Kg Card */}
                    <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg><span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>14 Kg</span></div>
                        <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 70</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}><div style={{ flex: 1, height: "32px", background: "#FF8A4D", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>68</span></div><div style={{ flex: 1, height: "32px", background: "#FD9D53", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>72</span></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div></div>
                      <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>2 sessions analyzed</p>
                    </div>
                    {/* 12 Kg Card */}
                    <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: "6px" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg><span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>12 Kg</span></div><span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 72</span></div>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}><div style={{ flex: 1, height: "32px", background: "#FD9D53", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>72</span></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div></div>
                      <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>1 session analyzed</p>
                    </div>
                    {/* 10 Kg Card */}
                    <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: "6px" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg><span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>10 Kg</span></div><span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 83</span></div>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", background: "#2BC95B", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>83</span></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px" }}></div><div style={{ flex: 1, height: "32px", background: "#34C759", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>85</span></div></div>
                      <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>1 session analyzed</p>
                    </div>
                  </div>
                </div>

                {/* Form History */}
                <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px 12px", marginBottom: "20px", marginLeft: "16px", marginRight: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <p style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#020D1B", margin: "0" }}>Form History</p>
                      <p style={{ fontSize: "14px", fontFamily: "'Bricolage Grotesque'", color: "#39414D", margin: "0" }}>Your last 3 Analyses</p>
                    </div>
                    <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#39414D", cursor: "pointer" }}>View All</button>
                  </div>

                  {formHistoryLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: "99px", background: "#F4F2FA", borderRadius: "16px", animation: "pulse 2s infinite" }} />
                      ))}
                    </div>
                  ) : formHistory.length === 0 ? (
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
                      {formHistory.slice(0, 3).map((s, index) => {
                        const exerciseName = (s.exercise || "Session").toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                        const dateLabel = s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown date";
                        const score = Math.round(s.score ?? 0);
                        const isExpanded = expandedCards[s.analysis_id] || false;
                        const feedback = s.feedback || "No feedback available";

                        // Use a single consistent image for all form history items
                        const userId = localStorage.getItem("active_user_id") || "user_001";
                        let formHistoryImageUrl = s.image_url;
                        if (!formHistoryImageUrl) {
                          if (userId === "user_003") {
                            formHistoryImageUrl = `/formhistory/${userId}/user_003_${index + 1}.jpg`;
                          } else {
                            // Use same image for all user_001 analyses regardless of weight
                            formHistoryImageUrl = `/formhistory/${userId}/user_001_front_17.5kg.jpg`;
                          }
                        }

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
                              {formHistoryImageUrl ? (
                                <img
                                  src={formHistoryImageUrl}
                                  alt={exerciseName}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling?.style.setProperty('display', 'flex');
                                  }}
                                />
                              ) : null}
                              {!formHistoryImageUrl && (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9747FF" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <button onClick={() => navigate("/upload/results", { state: { analysisId: s.analysis_id } })} style={{ background: "none", border: "none", cursor: "pointer", padding: "0" }}>
                                  <p style={{ fontSize: "16px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>{exerciseName}</p>
                                </button>
                                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#FF8D28", fontFamily: "'Poppins'" }}>{score}</span>
                                  <span style={{ fontSize: "10px", fontWeight: 400, color: "#000000", fontFamily: "'Poppins'" }}>/100</span>
                                </div>
                              </div>
                              <p style={{ fontSize: "11px", fontFamily: "'DM Sans'", color: "#39414D", margin: "0", lineHeight: "14px" }}>{dateLabel} • {s.load_kg}Kg • {s.rep_count} Reps</p>
                              <p style={{
                                fontSize: "12px",
                                fontFamily: "'DM Sans'",
                                color: "#000000",
                                margin: "0",
                                lineHeight: "16px",
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
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    fontFamily: "'DM Sans'",
                                    color: "#0284C7",
                                    cursor: "pointer",
                                    padding: "0",
                                    marginTop: "4px",
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
              </>
            )}
          </>
        )}

        {/* ── ANALYSIS TAB ── */}
        {!isProgression && (
          <>
            <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative group">
              {userAnnotatedFrameUrl ? (
                <>
                  <img src={userAnnotatedFrameUrl} alt="User annotated frame" className="w-full object-cover cursor-pointer" style={{ display: "block", maxHeight: 300, borderRadius: "1rem" }} onClick={() => setFullscreenImage(userAnnotatedFrameUrl)} />
                  <button onClick={() => setFullscreenImage(userAnnotatedFrameUrl)} className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors" title="Expand image">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 3v6h6M21 21v-6h-6M3 21h6v-6M21 3h-6v6"/>
                    </svg>
                  </button>
                </>
              ) : frameSrc ? (
                <>
                  <img src={frameSrc} alt="Annotated analysis frame" className="w-full object-cover cursor-pointer" style={{ display: "block", maxHeight: 300, borderRadius: "1rem" }} onClick={() => setFullscreenImage(frameSrc)} />
                  <button onClick={() => setFullscreenImage(frameSrc)} className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors" title="Expand image">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2s-2-.69-2-2c0-2.61 2.91-5 5-5 1.31 0 2 1.16 2 2s-.69 2-2 2zm13.71-9.71L19 6.41V3h-3v2h2.59L13 9.59 15.59 12 21 6.41V9h2V4h-5V1h-3v4h2.59z"/></svg>
                  </button>
                </>
              ) : videoSrc ? (
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

            {/* Failed banner */}
            {statusFailed && (
              <div className="mx-4 mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                This session didn't produce a full form score — see coaching notes below.
              </div>
            )}

            <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
              <div className="text-white text-sm font-bold mb-3">AI Verdict</div>
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
                    paramKey={p.key}
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
              <RepChart currentRepScores={repScores} previousRepScores={[]} />
            </div>

            <NextSessionFocusBox focusItems={coaching.next_session_focus} />
          </>
        )}

        <div className="mx-4 mt-2 mb-6 flex flex-col gap-3">
          <button type="button" onClick={() => navigate("/upload")}
            className="w-full py-4 rounded-2xl text-white text-sm font-bold tracking-wide"
            style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
            New Upload
          </button>
          <button type="button" onClick={() => navigate("/home")}
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

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-3 rounded-full transition-colors"
            title="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
