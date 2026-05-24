import { useEffect, useMemo, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSSEStream } from "../hooks/useSSEStream"

function StepIcon({ status }) {
  if (status === "complete") {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#6366f1" }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (status === "active") {
    return (
      <div className="w-6 h-6 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: "#6366f1", borderTopColor: "transparent" }} />
    )
  }
  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ef4444" }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  }
  return <div className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0" />
}

const DISPLAY_LABELS = [
  "Lock onto your posture...",
  "Check your barbell depth...",
  "Mapping bar path and stability...",
  "Calculating force and rhythm...",
]

export default function LoadingPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { analysisId, videoPreviewUrl } = location.state || {}
  const { steps, isDone, error, cancel, resultUrl, analysisData } = useSSEStream(analysisId)

  const [booted, setBooted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 800)
    return () => clearTimeout(t)
  }, [])

  const displaySteps = DISPLAY_LABELS.map((label, i) => {
    if (!booted) return { label, status: i === 0 ? "active" : "pending" }
    return {
      label,
      status: i < steps.length
        ? steps[i].status
        : isDone ? "complete" : "pending",
    }
  })

  const completedCount = useMemo(() => steps.filter(s => s.status === "complete").length, [steps])
  const progress = useMemo(() => {
    if (isDone) return 100
    const pct = Math.round((completedCount / steps.length) * 85)
    const hasActive = steps.some(s => s.status === "active")
    return hasActive ? Math.max(pct, 10) : pct
  }, [completedCount, steps, isDone])

  useEffect(() => {
    if (!isDone) return
    const t = setTimeout(async () => {
      let analysisRecord = null
      let progressionData = null

      try {
        const res = await fetch(`http://localhost:8000/analysis/${analysisId}`)
        if (res.ok) {
          analysisRecord = await res.json()
          if (analysisRecord?.biomechanics_json && typeof analysisRecord.biomechanics_json === "string") {
            try { analysisRecord.biomechanics_json = JSON.parse(analysisRecord.biomechanics_json) } catch (_) {}
          }
        }
      } catch (_) {}

      try {
        const res = await fetch(`http://localhost:8000/analysis/${analysisId}/progression`)
        if (res.ok) {
          const body = await res.json()
          if (body?.has_comparison !== undefined) progressionData = body
        }
      } catch (_) {}

      const result = analysisRecord
        ? { ...analysisRecord, progression_data: progressionData }
        : null

      navigate(resultUrl || "/upload/results", { state: { analysisId, analysisResult: result } })
    }, 3000)
    return () => clearTimeout(t)
  }, [isDone, analysisId, navigate, resultUrl])

  if (!analysisId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>
        <p className="text-gray-700 text-sm text-center mb-4">No analysis in progress.</p>
        <button className="text-indigo-500 underline text-sm" onClick={() => navigate("/upload")}>Upload a video</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>

      <div className="pt-4 px-4">
        <div className="rounded-2xl overflow-hidden w-full">
          {videoPreviewUrl ? (
            <video src={videoPreviewUrl} className="w-full" style={{ display: "block" }} autoPlay muted loop playsInline />
          ) : (
            <div className="w-full flex items-center justify-center bg-gray-900" style={{ height: 260 }}>
              <p className="text-gray-500 text-sm">Preview unavailable</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 px-5 pt-4 pb-6 gap-4">

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "#e0e7ff" }}>
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
            />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-0.5">Form Check in Progress</h1>
          <p className="text-sm text-gray-500">Kinetic is analyzing your video upload...</p>
        </div>

        <div className="rounded-2xl px-4 py-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" }}>
          <svg className="w-5 h-5 text-white shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-white leading-relaxed">
            <span className="font-semibold">Tips: </span>
            Take a 45-second breather. Your muscles need this reset for the next set.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl px-4 py-3 border border-red-100 bg-red-50">
            <p className="text-sm text-red-600">{error.userMessage}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl px-5 py-4 flex flex-col gap-4" style={{ border: "1.5px solid #c7d2fe" }}>
          {displaySteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <StepIcon status={step.status} />
              <span className={`text-sm font-medium ${step.status === "pending" ? "text-gray-400" : "text-gray-800"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {error ? (
          <div className="flex gap-3">
            <button
              className="flex-1 py-4 rounded-2xl text-sm font-bold text-white uppercase tracking-widest"
              style={{ background: "#ef4444" }}
              onClick={() => { cancel(); navigate("/upload") }}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-4 rounded-2xl text-sm font-bold text-white uppercase tracking-widest"
              style={{ background: "#f97316" }}
              onClick={() => { cancel(); navigate("/upload") }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <button
            className="w-full py-4 rounded-2xl text-sm font-bold text-white uppercase tracking-widest"
            style={{ background: isDone ? "#6366f1" : "#ef4444" }}
            onClick={() => { if (!isDone) { cancel(); navigate("/upload") } }}
            disabled={isDone}
          >
            {isDone ? "Complete! Taking you to results..." : "CANCEL"}
          </button>
        )}

      </div>
    </div>
  )
}