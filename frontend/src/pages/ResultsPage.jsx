import { useState, useMemo, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const PARAMS = [
  { key: "tempo",            label: "Range of Motion" },
  { key: "stability",        label: "Stability"       },
  { key: "posture",          label: "Posture"         },
  { key: "movement_quality", label: "Movement Quality"},
]

function ringColor(score) {
  if (score >= 80) return { stroke: "#22C55E", text: "#22C55E" }
  if (score >= 65) return { stroke: "#FF8C00", text: "#FF8C00" }
  return              { stroke: "#FF4C4C", text: "#FF4C4C" }
}

function ScoreRing({ score, size = 56, strokeW = 6, animate = false }) {
  const [display, setDisplay] = useState(animate ? 0 : score)
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, Math.min(100, display))
  const off  = circ - (pct / 100) * circ
  const c    = ringColor(display)

  useEffect(() => {
    if (!animate) return
    const start = performance.now()
    const dur   = 1200
    function step(now) {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(ease * score))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [score, animate])

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={c.stroke} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s" }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color: c.text }}>{display}</span>
    </div>
  )
}

function BigScoreRing({ score }) {
  const [display, setDisplay] = useState(0)
  const size = 90, strokeW = 8
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, Math.min(100, display))
  const off  = circ - (pct / 100) * circ
  const c    = ringColor(display)

  useEffect(() => {
    const start = performance.now()
    const dur   = 1200
    function step(now) {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(ease * score))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [score])

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={c.stroke} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-2xl font-extrabold" style={{ color: c.text }}>{display}</span>
      </div>
    </div>
  )
}

function ParamCard({ paramKey, label, data }) {
  const [open, setOpen] = useState(paramKey === "tempo")
  const score       = data?.score ?? 0
  const correction  = data?.tips?.[0] ?? null
  const affirmation = data?.affirmation ?? null
  const observation = data?.observation ?? null

  return (
    <div className="bg-white rounded-2xl mb-2 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <ScoreRing score={score} />
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-gray-900">{label}</div>
          {observation && (
            <div className="text-xs text-gray-500 mt-0.5 leading-snug">{observation}</div>
          )}
        </div>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {correction && (
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2 border-l-4 border-blue-400">
              <span className="text-blue-400 mt-0.5 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                </svg>
              </span>
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
          {observation && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">{observation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RepChart({ reps }) {
  if (!reps || reps.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-gray-400">
        Not enough reps to chart
      </div>
    )
  }

  const scores = reps.map(r => r.score ?? r.form_score ?? 0)
  const n = scores.length
  const half = Math.floor(n / 2)
  const firstHalf  = scores.slice(0, half).reduce((a, b) => a + b, 0) / half
  const secondHalf = scores.slice(half).reduce((a, b) => a + b, 0) / (n - half)
  const dip = Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
  const dipLabel = dip < 0 ? `${dip}% Dip` : `+${dip}%`
  const dipColor = dip < 0 ? "#FF4C4C" : "#22C55E"

  const W = 320, H = 130, PAD = 16
  const xOf = i => PAD + (i / (n - 1)) * (W - PAD * 2)
  const yOf = v => PAD + (1 - v / 100) * (H - PAD * 2)
  const pts = scores.map((v, i) => [xOf(i), yOf(v)])
  const linePt = pts.map(([x, y]) => `${x},${y}`).join(" ")
  const areaPt = [
    `${pts[0][0]},${H - PAD}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${H - PAD}`,
  ].join(" ")

  const repLabels = scores.map((_, i) => `REP ${i + 1}`)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500 font-medium">Consistency Analysis</div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: dipColor }}
        >
          {dipLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <defs>
          <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map(v => (
          <line key={v}
            x1={PAD} y1={yOf(v)} x2={W - PAD} y2={yOf(v)}
            stroke="#e5e7eb" strokeWidth="0.5"
          />
        ))}
        {[20, 40, 60, 80, 100].map(v => (
          <text key={v} x={PAD - 2} y={yOf(v) + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{v}</text>
        ))}
        <polygon points={areaPt} fill="url(#repGrad)" />
        <polyline points={linePt} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="white" stroke="#6366f1" strokeWidth="1.5" />
        ))}
        {scores.map((_, i) => (
          <text key={i} x={xOf(i)} y={H - 2} fontSize="6" fill="#9ca3af" textAnchor="middle">
            REP {i + 1}
          </text>
        ))}
      </svg>
    </div>
  )
}

const MOCK = {
  exercise: "Goblet Squat",
  weight_kg: 20,
  weight_unit: "kg",
  rep_count: 10,
  created_at: "2026-04-24T10:32:00Z",
  overall_score: 76,
  verdict: [
    "Your squat depth was good — below knee level on 85% of reps.",
    "Bracing held for the first 8 reps before fatigue set in on the back half.",
  ],
  parameters: {
    tempo:            { score: 74, affirmation: "Parallel depth achieved.", observation: "Parallel depth achieved", tips: ["Focus on core bracing and hip mobility drills before your next heavy leg day."] },
    stability:        { score: 70, affirmation: null, observation: "Lateral shift detected", tips: ["Drive knees outward on the ascent."] },
    posture:          { score: 75, affirmation: null, observation: "Instability in joints detected", tips: ["Brace your core before each descent."] },
    movement_quality: { score: 68, affirmation: null, observation: "Inconsistent speed detected", tips: ["Aim for a controlled 2s descent."] },
  },
  reps: [
    { rep: 1,  score: 85 }, { rep: 2,  score: 84 }, { rep: 3,  score: 83 },
    { rep: 4,  score: 82 }, { rep: 5,  score: 80 }, { rep: 6,  score: 78 },
    { rep: 7,  score: 76 }, { rep: 8,  score: 74 }, { rep: 9,  score: 72 },
    { rep: 10, score: 70 }, { rep: 11, score: 69 }, { rep: 12, score: 68 },
  ],
  annotated_frame_url: null,
}

export default function ResultsPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const [tab, setTab] = useState("analysis")
  const glowRef = useRef(null)

  const data = useMemo(() => {
    const real = state?.analysisResult
    if (!real) return MOCK

    const bio      = typeof real.biomechanics_json === "string"
      ? JSON.parse(real.biomechanics_json || "{}")
      : (real.biomechanics_json || {})
    const summary  = bio.summary || bio.session || {}
    const bioReps  = bio.reps || []
    const prog     = real.progression_data || null
    const current  = prog?.current || null
    const coaching = prog?.comparison_coaching || null

    const overallScore = summary.overall_form_score ?? current?.overall_form_score ?? 0

    if (!overallScore) {
      return {
        ...MOCK,
        exercise:    real.exercise ?? real.exercise_id ?? MOCK.exercise,
        exercise_id: real.exercise_id,
        weight_value: real.weight_value ?? MOCK.weight_kg,
        weight_kg:   real.weight_kg ?? real.weight_value ?? MOCK.weight_kg,
        weight_unit: real.weight_unit ?? MOCK.weight_unit,
        created_at:  real.created_at ?? MOCK.created_at,
      }
    }

    const buildParam = (key, src, directScore) => ({
      score:       src?.score ?? directScore ?? 0,
      observation: src?.observation_action ?? null,
      affirmation: null,
      tips:        src?.observation_action ? [src.observation_action] : [],
    })

    const parameters = {
      tempo:            buildParam("tempo",            coaching?.parameters?.tempo,            current?.tempo_score            ?? summary.tempo_score),
      stability:        buildParam("stability",        coaching?.parameters?.stability,        current?.stability_score        ?? summary.stability_score),
      posture:          buildParam("posture",          coaching?.parameters?.posture,          current?.posture_score          ?? summary.posture_score),
      movement_quality: buildParam("movement_quality", coaching?.parameters?.movement_quality, current?.movement_quality_score ?? summary.movement_quality_score),
    }

    const reps = bioReps.length
      ? bioReps.map((r, i) => ({ rep: r.rep_number ?? i + 1, score: r.form_score ?? 0 }))
      : (current?.reps || []).map((r, i) => ({ rep: r.rep_number ?? i + 1, score: r.form_score ?? 0 }))

    return {
      exercise:    real.exercise ?? real.exercise_id ?? "Session",
      exercise_id: real.exercise_id,
      weight_value: real.weight_value ?? 0,
      weight_kg:   real.weight_kg ?? real.weight_value ?? 0,
      weight_unit: real.weight_unit ?? "kg",
      rep_count:   real.rep_count ?? reps.length,
      created_at:  real.created_at,
      overall_score: overallScore,
      verdict:     coaching?.summary_paragraph ?? "",
      parameters,
      reps,
      annotated_frame_url: bio.annotated_frame_url ?? null,
    }
  }, [state?.analysisResult])

  const overall    = data.overall_score ?? 0
  const exercise   = (data.exercise ?? "Session").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const weightKg   = data.weight_kg ?? data.weight_value ?? 0
  const weightUnit = data.weight_unit ?? "kg"
  const repCount   = data.rep_count ?? data.reps?.length ?? 0
  const reps       = data.reps ?? []
  const params     = data.parameters ?? {}
  const verdict    = Array.isArray(data.verdict) ? data.verdict.join(" ") : (data.verdict ?? "")
  const frameUrl   = data.annotated_frame_url ?? null
  const createdAt  = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const weightLabel = `${weightKg}${weightUnit}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0EFFE" }}>
      <div className="max-w-sm mx-auto pb-24">

        {/* Header */}
        <div className="pt-6 pb-3 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900">{exercise}</h1>
        </div>

        {/* Tab toggle */}
        <div className="mx-4 mb-4 flex rounded-2xl p-1" style={{ background: "linear-gradient(135deg, #a78bfa, #818cf8)" }}>
          {[["analysis", "Analysis"], ["progression", "Progression"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:  tab === key ? "white" : "transparent",
                color:       tab === key ? "#1f2937" : "rgba(255,255,255,0.8)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "analysis" && (
          <>
            {/* Annotated frame */}
            <div className="mx-4 mb-4 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ minHeight: 200 }}>
              {frameUrl ? (
                <img src={frameUrl} alt="Annotated frame" className="w-full object-cover" />
              ) : (
                <div className="h-52 flex items-center justify-center relative" style={{ background: "#f8f7ff" }}>
                  <div className="relative flex items-center justify-center">
                    <div className="w-20 h-36 bg-gray-200 rounded-full opacity-40" />
                    <div className="absolute top-4  left-0  w-4 h-4 rounded-full shadow-lg" style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
                    <div className="absolute top-16 left-8 w-4 h-4 rounded-full shadow-lg" style={{ background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
                    <div className="absolute bottom-2 left-12 w-4 h-4 rounded-full shadow-lg" style={{ background: "#fbbf24", boxShadow: "0 0 8px #fbbf24" }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Verdict card */}
            <div
              ref={glowRef}
              className="mx-4 mb-4 rounded-2xl p-4 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #818cf8 60%, #60a5fa 100%)",
                animation: "verdictGlow 1.8s ease-in-out forwards",
              }}
            >
              <style>{`
                @keyframes verdictGlow {
                  0%   { box-shadow: 0 0 0px rgba(106,77,255,0); }
                  50%  { box-shadow: 0 0 18px rgba(106,77,255,0.5); }
                  100% { box-shadow: 0 0 8px rgba(106,77,255,0.25); }
                }
                @media (prefers-reduced-motion: reduce) {
                  * { animation: none !important; transition: none !important; }
                }
              `}</style>
              <div className="text-white text-sm font-bold mb-3">AI Verdict • Maintain</div>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                  <BigScoreRing score={overall} />
                  <span className="text-white text-xs opacity-80">Form Score</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs leading-relaxed opacity-90 mb-3">
                    {verdict || "Keep it up — your form is consistent."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {createdAt && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white bg-opacity-20 text-white">
                        {createdAt}
                      </span>
                    )}
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white bg-opacity-20 text-white">
                      {weightLabel}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white bg-opacity-20 text-white">
                      {repCount} Reps
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="mx-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Key Insights</h2>
              </div>
              {PARAMS.map(({ key, label }) => (
                <ParamCard key={key} paramKey={key} label={label} data={params[key]} />
              ))}
            </div>

            {/* Performance over reps */}
            <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-wide uppercase">Performance Over Reps</h2>
              </div>
              <RepChart reps={reps} />
            </div>

            {/* Tips for next workout */}
            <div className="mx-4 mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                <span className="text-sm font-bold text-gray-900">Tips for your next workout</span>
              </div>
              <blockquote className="border-l-4 border-indigo-300 pl-3 text-xs text-gray-600 leading-relaxed italic">
                {params?.tempo?.tips?.[0]
                  ?? "Focus on controlling your descent — aim for a 2-second lower each rep."}
              </blockquote>
            </div>
          </>
        )}

        {tab === "progression" && (
          <div className="mx-4 bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="text-2xl mb-3">📈</div>
            <p className="text-sm text-gray-500 leading-relaxed">
              You haven't done a previous session for this exercise yet. Upload another session to unlock comparison.
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="mx-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-2xl border border-gray-300 text-gray-700 text-sm font-semibold bg-white"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
          >
            New Upload
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-2 px-4">
        {[
          { label: "Home",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", path: "/" },
          { label: "Plan",     icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", path: "/plan" },
          { label: "Analysis", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", path: "/results", active: true },
          { label: "Timeline", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", path: "/timeline" },
          { label: "Profile",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", path: "/profile" },
        ].map(({ label, icon, path, active }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5"
          >
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