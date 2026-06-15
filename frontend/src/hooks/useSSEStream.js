import { useState, useEffect, useRef } from "react"

const PIPELINE_STEPS = [
  {
    label: "Deconstructing your video into frames.",
    activeOn: ["upload_received", "mediapipe_started"],
    completeOn: "mediapipe_complete",
  },
  {

    label: "Extracting joint angles & movement patterns",
    activeOn: ["biomechanics_complete"],
    completeOn: "haiku_started",
  },
  {
    label: "Analysing your movements & posture in detail.",
    activeOn: ["haiku_started"],
    completeOn: "analysis_ready",
  },
  {
    label: "Generating your coaching report",
    activeOn: ["analysis_ready"],
    completeOn: "progression_ready",
  },
]

// const DONE_EVENTS = new Set(["analysis_complete", "analysis_ready", "progression_ready"])
const DONE_EVENTS = new Set(["analysis_complete", "analysis_ready"])


const ERROR_USER_COPY = {
  occlusion_left_side: "Part of your left side was hidden from view. Rather than switching sides, rotate your camera slightly toward the front of your body.",
  occlusion_right_side: "Part of your right side was hidden from view. Rather than switching sides, rotate your camera slightly toward the front of your body.",
  occlusion_both_sides: "We couldn't see your lower body clearly. Try angling your camera slightly toward the front so both legs are fully in view.",
  out_of_frame_left: "Your left side kept moving out of frame. Move the camera back slightly so your full body stays visible throughout the squat.",
  out_of_frame_right: "Your right side kept moving out of frame. Move the camera back slightly so your full body stays visible throughout the squat.",
  poor_video_quality: "We couldn't read your body position clearly. Film from your side with good lighting and a clear background.",
  no_reps_detected: "We couldn't detect any squats in your video. Make sure you're doing goblet squats and your full body is in frame from the start.",
  insufficient_reps: "Film a full set to get your analysis. We need at least 3 complete reps — squat all the way down and all the way back up for each one.",
  VIDEO_TOO_SHORT: "We didn't catch a complete rep. Record at least one full squat and try again.",
  NO_MOVEMENT_DETECTED: "The video looks still. Make sure the camera is filming your full movement.",
  NO_REPS_DETECTED: "We couldn't detect a full squat rep. Make sure your full body is visible and complete at least one rep.",
  BIOMECHANICS_COMPUTE_ERROR: "Something went wrong reading your movement data. Try re-uploading.",
  HAIKU_TIMEOUT: "Form analysis is taking longer than expected. We'll retry automatically — hang tight.",
  HAIKU_NO_OUTPUT: "The AI couldn't interpret your movement data. Try re-uploading — if it persists, let us know.",
  HAIKU_CONTEXT_OVERFLOW: "That video is too long for detailed analysis. Try uploading a 30–60 second clip.",
  FRAME_EXTRACTION_FAILED: "We identified form issues but couldn't extract the frames to show you. Your text coaching is still available below.",
  PROGRESSION_UNAVAILABLE: "Your form analysis is ready, but we couldn't generate your progression data this time.",
  PIPELINE_TIMEOUT: "Your analysis is taking unusually long. We've flagged it — try again and your previous data is saved.",
  SYSTEM_ERROR: "Something went wrong on our end. Your video is saved — try again in a moment.",
}

function useSSEStream(analysisId) {
  const [steps, setSteps] = useState(
    PIPELINE_STEPS.map(step => ({ label: step.label, status: "pending" }))
  )
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)
  const [partialWarning, setPartialWarning] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)

  const eventSourceRef = useRef(null)
  const doneRef = useRef(false)
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  function updateStep(index, newStatus) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status: newStatus } : s))
  }

  function cancel() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  useEffect(() => {
    if (!analysisId) return
    if (isDone) return


    const es = new EventSource(`${BASE_URL}/analysis/${analysisId}/stream`)
    eventSourceRef.current = es

    es.onmessage = function(e) {
      let parsed
      try {
        parsed = JSON.parse(e.data)
        console.log("SSE EVENT:", parsed)
      } catch {
        return
      }

      const eventName = parsed.event
      if (!eventName) return

      if (eventName === "error") {
        const code = parsed.error_code || "SYSTEM_ERROR"
        const retryable = parsed.retryable 
        const userMessage = ERROR_USER_COPY[code] || "Something went wrong. Please try again."

     
        setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s))
        setError({ userMessage })
        es.close()
        return
      }

      if (DONE_EVENTS.has(eventName)) {
        const lastIndex = PIPELINE_STEPS.findIndex(s =>
          s.completeOn === eventName || s.completeOn === "analysis_complete"
        )
        if (lastIndex !== -1 && !doneRef.current) updateStep(lastIndex, "complete")
        return
      }

      // --- Final event ---
      if (eventName === "progression_ready" || eventName === "haiku_call_2_no_history" || eventName === "haiku_call_2_complete") {
        const lastIndex = PIPELINE_STEPS.findIndex(s => s.completeOn === "progression_ready")
        if (lastIndex !== -1) updateStep(lastIndex, "complete")
        
        // Add this guard:
        if (!doneRef.current) {  // <-- ADD THIS
          setAnalysisData(parsed)
        }

        if (!doneRef.current) {
          doneRef.current = true
          setIsDone(true)
          setResultUrl(parsed.full_result_url || null)

        }

        es.close()
        return
      }


      PIPELINE_STEPS.forEach((stepDef, index) => {
        if (stepDef.completeOn === eventName) {
          updateStep(index, "complete")
        } else if (stepDef.activeOn.includes(eventName)) {
          updateStep(index, "active")
        }
      })
    }

    es.onerror = function() {
      if (!doneRef.current) {
        setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s))
        setError({ userMessage: "Connection lost. Check your internet and try again." })
      }
      es.close()
    }

    return function() {
      es.close()
    }
  }, [analysisId])

  return { steps, isDone, error, partialWarning, cancel, resultUrl, analysisData }
}

export { useSSEStream, PIPELINE_STEPS }