import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Lightbulb, Check, X, AlertTriangle } from "lucide-react"
import { useSSEStream } from "../hooks/useSSEStream"

// ─── Fixture imports (W5 only) ────────────────────────────────────────────────
import FIXTURE_CLEAN from "../../../fixtures/form-analysis.clean.json"

// ─── Fake pipeline steps for fixture mode ────────────────────────────────────
const FIXTURE_STEPS = [
  { label: "Lock onto your posture…" },
  { label: "Check your barbell depth…" },
  { label: "Mapping bar path and stability…" },
  { label: "Calculating force and rhythm…" },
]
const STEP_DELAY_MS = 900
const DONE_HOLD_MS  = 1200

// ─────────────────────────────────────────────────────────────────────────────

function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    analysisId,
    videoPreviewUrl,
    fixtureMode,
    exercise,
  } = location.state || {}

  // ── FIXTURE MODE (W5) ─────────────────────────────────────────────────────
  // When fixtureMode: true is passed from UploadScanPage, skip the SSE stream
  // entirely and run a fake timed pipeline instead.
  const [fixtureSteps, setFixtureSteps] = useState(
    FIXTURE_STEPS.map((s) => ({ label: s.label, status: "pending" }))
  )
  const [fixtureDone, setFixtureDone] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!fixtureMode) return

    const ac = new AbortController()
    abortRef.current = ac

    const sleep = (ms) =>
      new Promise((res, rej) => {
        const t = setTimeout(res, ms)
        ac.signal.addEventListener("abort", () => { clearTimeout(t); rej(new Error("aborted")) })
      })

    ;(async () => {
      try {
        for (let i = 0; i < FIXTURE_STEPS.length; i++) {
          await sleep(STEP_DELAY_MS)
          setFixtureSteps(FIXTURE_STEPS.map((s, idx) => ({
            label:  s.label,
            status: idx < i  ? "complete"
                  : idx === i ? "active"
                  : "pending",
          })))
        }
        await sleep(STEP_DELAY_MS)
        setFixtureSteps(FIXTURE_STEPS.map((s) => ({ label: s.label, status: "complete" })))
        await sleep(DONE_HOLD_MS)
        setFixtureDone(true)
      } catch {
        // aborted — user cancelled
      }
    })()

    return () => ac.abort()
  }, [fixtureMode])

  // Navigate to results once fixture pipeline finishes
  useEffect(() => {
    if (!fixtureMode || !fixtureDone) return
    navigate("/upload/results", {
      state: {
        analysisResult: FIXTURE_CLEAN,
        videoPreviewUrl,
        exercise,
      },
    })
  }, [fixtureMode, fixtureDone])

  // ── REAL SSE MODE (W6) ────────────────────────────────────────────────────
  const { steps, isDone, error, partialWarning, cancel, resultUrl } =
    useSSEStream(fixtureMode ? null : analysisId)

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  useEffect(() => {
    if (fixtureMode || !isDone) return
    const timer = setTimeout(async () => {
      let analysisResult = null
      try {
        const response = await fetch(`${BASE_URL}/analysis/${analysisId}`)
        if (response.ok) {
          const record = await response.json()
          const biomechanics = record.biomechanics_json
            ? JSON.parse(record.biomechanics_json)
            : {}
          analysisResult = {
            ...biomechanics,
            analysis_id:  record.analysis_id,
            exercise_id:  record.exercise_id,
            weight_value: record.weight_value,
            weight_unit:  record.weight_unit,
            status:       record.status,
          }
        }
      } catch {
        // Fall through — ResultsPage will show fixtures if analysisResult is null
      }
      navigate(resultUrl || "/upload/results", {
        state: { analysisId, analysisResult, videoPreviewUrl },
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [fixtureMode, isDone, analysisId, navigate, resultUrl, videoPreviewUrl])

  // ── GUARD — no analysis in progress (real mode only) ─────────────────────
  if (!fixtureMode && !analysisId) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col items-center justify-center px-6">
        <p className="text-text-primary dark:text-white text-body text-center mb-4">
          No analysis in progress.
        </p>
        <button
          className="text-teal underline text-body"
          onClick={() => navigate("/upload")}
        >
          Upload a video
        </button>
      </div>
    )
  }

  // Pick which steps + done state to show depending on mode
  const displaySteps  = fixtureMode ? fixtureSteps : steps
  const displayIsDone = fixtureMode ? fixtureDone  : isDone

  function handleCancel() {
    if (fixtureMode) {
      abortRef.current?.abort()
    } else {
      cancel()
    }
    navigate("/upload")
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">

      {/* Video thumbnail */}
      <div className="pt-3 px-4">
        <div className="w-full rounded-2xl overflow-hidden" style={{ height: "380px" }}>
          {videoPreviewUrl ? (
            <video
              src={videoPreviewUrl}
              className="w-full h-full object-cover object-center"
              autoPlay muted loop playsInline
            />
          ) : (
            <div className="w-full h-full bg-dark-card flex items-center justify-center">
              <p className="text-gray-600 text-body">Preview unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-5 pt-5 pb-8 gap-4">

        {/* Title + subtitle */}
        <div className="text-center">
          <h1
            className="text-text-primary dark:text-white font-medium mb-1"
            style={{ fontSize: "17px" }}
          >
            Form Check in Progress
          </h1>
          <p className="text-text-tertiary dark:text-gray-400 text-body">
            Kinetic is analyzing your video upload...
          </p>
        </div>

        {/* Partial warning — real mode only */}
        {!fixtureMode && partialWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3 border border-amber-200 dark:border-amber-700 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-body text-amber-700 dark:text-amber-400">
              {partialWarning}
            </p>
          </div>
        )}

        {/* Tips card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-transparent flex items-start gap-3">
          <Lightbulb size={18} className="text-text-tertiary dark:text-gray-400 mt-0.5 shrink-0" />
          <p className="text-body text-text-tertiary dark:text-gray-400 leading-relaxed">
            <span className="text-text-primary dark:text-white font-medium">Tips: </span>
            Take a 45-second breather. Your muscles need this reset for the next set.
          </p>
        </div>

        {/* Steps checklist */}
        <div className="bg-white dark:bg-dark-card rounded-2xl px-4 py-3 border border-gray-100 dark:border-transparent flex flex-col gap-3">
          {displaySteps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <StepIcon status={step.status} />
              <span
                className={`text-body ${
                  step.status === "complete" ? "text-text-primary dark:text-white" :
                  step.status === "active"   ? "text-text-primary dark:text-white" :
                  step.status === "error"    ? "text-error" :
                  "text-text-disabled dark:text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Buttons */}
        {!fixtureMode && error ? (
          <div className="flex flex-col gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-3 border border-red-100 dark:border-red-800">
              <p className="text-body text-error">{error.userMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-button font-medium text-white"
                style={{ backgroundColor: "#E57373" }}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-button font-medium text-white"
                style={{ backgroundColor: "#E8A050" }}
                onClick={handleCancel}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full py-4 rounded-2xl text-button font-medium text-white uppercase tracking-wide dark:bg-[#7B1D1D] bg-[#E57373]"
            onClick={() => { if (!displayIsDone) handleCancel() }}
            disabled={displayIsDone}
          >
            {displayIsDone ? "Complete! Taking you to results..." : "Cancel"}
          </button>
        )}

      </div>
    </div>
  )
}

function StepIcon({ status }) {
  if (status === "complete") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#00d66b" }}>
        <Check size={11} color="white" strokeWidth={3} />
      </div>
    )
  }
  if (status === "active") {
    return (
      <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: "#99f6e4", borderTopColor: "transparent" }} />
    )
  }
  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#ff3b30" }}>
        <X size={11} color="white" strokeWidth={3} />
      </div>
    )
  }
  return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
}

export default LoadingPage
