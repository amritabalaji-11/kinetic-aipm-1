/**
 * LoadingPage — W5 fixture build
 *
 * Reads `fixtureMode: true` from route state (set by UploadScanPage).
 * Runs a fake timed pipeline progress animation, then navigates to
 * ResultsPage passing the fixture JSON directly — zero network calls.
 *
 * W6: replace the fake pipeline block with real SSE stream + upload call.
 */

import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Lightbulb, Check, X } from "lucide-react"

// ─── Fixture data ─────────────────────────────────────────────────────────────
// W5: results come from this file. W6: swap for real API response.
import FIXTURE_CLEAN      from "../../../fixtures/form-analysis.clean.json"
import FIXTURE_WITH_ISSUES from "../../../fixtures/form-analysis.with-issues.json"

// ─── Fake pipeline steps ──────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { label: "Lock onto your posture…" },
  { label: "Check your barbell depth…" },
  { label: "Mapping bar path and stability…" },
  { label: "Calculating force and rhythm…" },
]

const STEP_DELAY_MS = 900  // how long each step takes in the fake pipeline
const DONE_HOLD_MS  = 1200 // brief pause before navigating to results

// ─────────────────────────────────────────────────────────────────────────────

function initialSteps() {
  return PIPELINE_STEPS.map((s) => ({ label: s.label, status: "pending" }))
}

function LoadingShell({ children }) {
  return (
    <div className="min-h-screen bg-[#ececef] flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-3 pt-4 pb-6">
        <div className="bg-white rounded-[1.35rem] shadow border border-gray-200/70 overflow-hidden flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function LoadingPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const state     = location.state || {}

  const videoPreviewUrl = state.videoPreviewUrl ?? null
  const exercise        = state.exercise ?? ""

  // Pick fixture based on exercise — clean for now; swap logic as needed
  // You can also toggle this to FIXTURE_WITH_ISSUES to test the issues view
  const fixture = FIXTURE_CLEAN

  const [steps,   setSteps]   = useState(initialSteps)
  const [isDone,  setIsDone]  = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)

  const abortRef = useRef(null)

  // ─── Fake pipeline runner ──────────────────────────────────────────────────
  useEffect(() => {
    const ac = new AbortController()
    abortRef.current = ac

    const sleep = (ms) =>
      new Promise((res, rej) => {
        const t = setTimeout(res, ms)
        ac.signal.addEventListener("abort", () => { clearTimeout(t); rej(new Error("aborted")) })
      })

    ;(async () => {
      try {
        for (let i = 0; i < PIPELINE_STEPS.length; i++) {
          await sleep(STEP_DELAY_MS)
          setSteps(PIPELINE_STEPS.map((s, idx) => ({
            label: s.label,
            status: idx < i  ? "complete"
                  : idx === i ? "active"
                  : "pending",
          })))
        }

        await sleep(STEP_DELAY_MS)
        // Mark all complete
        setSteps(PIPELINE_STEPS.map((s) => ({ label: s.label, status: "complete" })))
        await sleep(DONE_HOLD_MS)

        setIsDone(true)
      } catch {
        // aborted — user cancelled
      }
    })()

    return () => ac.abort()
  }, [])

  // ─── Navigate to results once done ────────────────────────────────────────
  useEffect(() => {
    if (!isDone) return
    navigate("/upload/results", {
      state: {
        analysisResult: fixture,
        videoPreviewUrl,
        exercise,
      },
    })
  }, [isDone])

  // ─── Cancel handler ────────────────────────────────────────────────────────
  function handleCancel() {
    abortRef.current?.abort()
    setIsCancelled(true)
    navigate("/upload")
  }

  if (isCancelled) return null

  return (
    <LoadingShell>
      {/* Video preview strip */}
      <div
        className="w-full shrink-0 bg-gray-100"
        style={{ maxHeight: 280, aspectRatio: "4 / 3" }}
      >
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            className="w-full h-full max-h-[280px] object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="w-full h-full min-h-[160px] flex items-center justify-center">
            <p className="text-gray-400 text-sm">Video preview</p>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 px-5 pt-5 pb-6 gap-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-semibold text-[17px] leading-snug mb-1 text-gray-900">
            Form Check in Progress
          </h1>
          <p className="text-gray-500 text-[15px] leading-snug">
            Kinetic is analyzing your {exercise.replace(/-/g, " ") || "video"}…
          </p>
        </div>

        {/* Tip */}
        <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100 flex items-start gap-3">
          <Lightbulb size={18} className="text-teal-500 mt-0.5 shrink-0" strokeWidth={1.75} />
          <p className="text-[14px] leading-relaxed text-gray-600">
            <span className="text-gray-900 font-semibold">Tip: </span>
            Take a 45-second breather between sets — your muscles need the reset.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <StepIcon status={step.status} />
              <span
                className={`text-[15px] leading-snug ${
                  step.status === "complete" ? "text-gray-900 font-medium"
                : step.status === "active"   ? "text-gray-900 font-medium"
                : step.status === "error"    ? "text-red-500 font-medium"
                : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-2" />

        {/* Cancel button — disabled once done */}
        <button
          type="button"
          disabled={isDone}
          onClick={handleCancel}
          className="w-full py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wide bg-[#FF9B9B] text-[#2d3436] disabled:opacity-50 disabled:cursor-default"
        >
          {isDone ? "Complete — opening results…" : "Cancel"}
        </button>
      </div>
    </LoadingShell>
  )
}

function StepIcon({ status }) {
  if (status === "complete") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-teal-400">
        <Check size={11} color="white" strokeWidth={3} />
      </div>
    )
  }
  if (status === "active") {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin shrink-0" />
    )
  }
  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-red-500">
        <X size={11} color="white" strokeWidth={3} />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
  )
}
