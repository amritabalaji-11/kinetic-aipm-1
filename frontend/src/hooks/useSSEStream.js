import { useState, useEffect, useRef } from "react"

const PIPELINE_STEPS = [
  {
    label: "Lock onto your posture...",
    activeOn: ["upload_received", "mediapipe_started"],
    completeOn: "mediapipe_complete",
  },
  {
    label: "Check your barbell depth...",
    activeOn: ["nemotron_started"],
    completeOn: "nemotron_complete",
  },
  {
    label: "Mapping bar path and stability...",
    activeOn: ["rag_started"],
    completeOn: "rag_complete",
  },
  {
    label: "Calculating force and rhythm...",
    activeOn: ["claude_started", "claude_complete"],
    completeOn: "analysis_complete",
  },
]

function useSSEStream(analysisId) {
  const initialSteps = PIPELINE_STEPS.map(step => ({
    label: step.label,
    status: "pending",
  }))

  const [steps, setSteps] = useState(initialSteps)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)

  const eventSourceRef = useRef(null)
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  function updateStep(stepIndex, newStatus) {
    setSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex ? { ...step, status: newStatus } : step
      )
    )
  }

  function cancel() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  useEffect(() => {
    if (!analysisId) return

    const streamUrl = `${BASE_URL}/analysis/${analysisId}/stream`

    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.onmessage = function(e) {
      let parsed
      try {
        parsed = JSON.parse(e.data)
      } catch {
        return
      }

      const eventName = parsed.event
      if (!eventName) return

      // Backend sends error events through the stream as JSON
      // retryable is a string ("true"/"false"/"partial") not a boolean
      // "false" is truthy in JS so never check it as a boolean
      if (eventName === "error") {
        setSteps(prev =>
          prev.map(step =>
            step.status === "active" ? { ...step, status: "error" } : step
          )
        )
        setError(parsed.error_code || "Something went wrong")
        es.close()
        return
      }

      // Final event — backend tells us exactly where to navigate
      if (eventName === "analysis_complete") {
        const lastStepIndex = PIPELINE_STEPS.findIndex(
          s => s.completeOn === "analysis_complete"
        )
        updateStep(lastStepIndex, "complete")
        setResultUrl(parsed.full_result_url || null)
        setIsDone(true)
        es.close()
        return
      }

      // All other events — check which step they belong to
      PIPELINE_STEPS.forEach((stepDef, index) => {
        if (stepDef.completeOn === eventName) {
          updateStep(index, "complete")
          return
        }
        if (stepDef.activeOn.includes(eventName)) {
          updateStep(index, "active")
        }
      })
    }

    // Connection drop or server error (not a pipeline error event)
    es.onerror = function() {
      setSteps(prev =>
        prev.map(step =>
          step.status === "active" ? { ...step, status: "error" } : step
        )
      )
      setError("Connection lost. Please try again.")
      es.close()
    }

    return function cleanup() {
      es.close()
    }
  }, [analysisId])

  return { steps, isDone, error, cancel, resultUrl }
}

export { useSSEStream, PIPELINE_STEPS }