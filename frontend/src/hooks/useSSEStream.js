import { useState, useEffect, useRef } from "react"

// Backend events from `pipeline/process_video.py` + `sse_manager.send_event`; labels match product loading UI.
const PIPELINE_STEPS = [
  {
    label: "Lock onto your posture…",
    activeOn: ["download_started"],
    completeOn: "mediapipe_started",
  },
  {
    label: "Check your barbell depth…",
    activeOn: ["mediapipe_started"],
    completeOn: "mediapipe_completed",
  },
  {
    label: "Mapping bar path and stability…",
    activeOn: ["mediapipe_completed"],
    completeOn: null,
  },
  {
    label: "Calculating force and rhythm…",
    activeOn: [],
    completeOn: "analysis_complete",
  },
]

function useSSEStream(analysisId) {
  const initialSteps = PIPELINE_STEPS.map((step) => ({
    label: step.label,
    status: "pending",
  }))

  const [steps, setSteps] = useState(initialSteps)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)

  const eventSourceRef = useRef(null)
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  function updateStep(stepIndex, newStatus) {
    setSteps((prev) =>
      prev.map((step, i) => (i === stepIndex ? { ...step, status: newStatus } : step))
    )
  }

  function cancel() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  useEffect(() => {
    if (!analysisId || isDone) return

    const poll = async () => {
      try {
        const r = await fetch(
          `${BASE_URL}/result?analysis_id=${encodeURIComponent(analysisId)}`
        )
        if (!r.ok) return
        const data = await r.json()
        setAnalysisResult(data)
        setSteps((prev) => prev.map((s) => ({ ...s, status: "complete" })))
        setIsDone(true)
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      } catch {
        /* ignore */
      }
    }

    const id = window.setInterval(poll, 3000)
    poll()
    return () => window.clearInterval(id)
  }, [analysisId, isDone])

  useEffect(() => {
    if (!analysisId) return

    const streamUrl = `${BASE_URL}/analysis/${encodeURIComponent(analysisId)}/stream`

    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.onmessage = function (e) {
      let parsed
      try {
        parsed = JSON.parse(e.data)
      } catch {
        return
      }

      const eventName = parsed.event
      if (!eventName) return

      if (eventName === "error" || parsed.status === "error") {
        setSteps((prev) =>
          prev.map((step) => (step.status === "active" ? { ...step, status: "error" } : step))
        )
        setError(parsed.error_code || parsed.message || "Something went wrong")
        es.close()
        return
      }

      if (eventName === "analysis_failed") {
        setError("Analysis failed")
        es.close()
        return
      }

      if (eventName === "analysis_complete") {
        setSteps((prev) =>
          prev.map((step, i) => (i >= 2 ? { ...step, status: "complete" } : step))
        )
        setAnalysisResult(parsed.result ?? null)
        setIsDone(true)
        es.close()
        return
      }

      PIPELINE_STEPS.forEach((stepDef, index) => {
        if (stepDef.completeOn && stepDef.completeOn === eventName) {
          updateStep(index, "complete")
          return
        }
        if (stepDef.activeOn.includes(eventName)) {
          updateStep(index, "active")
        }
      })
    }

    es.onerror = function () {
      // EventSource often errors once on cross-origin setups; do not block the flow —
      // we poll `GET /result` as a fallback until the pipeline writes the JSON file.
      if (es.readyState === EventSource.CLOSED) {
        es.close()
      }
    }

    return function cleanup() {
      es.close()
    }
  }, [analysisId])

  return { steps, isDone, error, cancel, analysisResult }
}

export { useSSEStream, PIPELINE_STEPS }
