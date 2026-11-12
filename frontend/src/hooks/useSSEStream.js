import { useState, useEffect, useRef } from "react"
import { apiFetch } from "../services/api"

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
  occlusion_left_side: "Part of your left side was hidden from me. Could you turn the camera slightly toward the front of your body, rather than switching sides?",
  occlusion_right_side: "Part of your right side was hidden from me. Could you turn the camera slightly toward the front of your body, rather than switching sides?",
  occlusion_both_sides: "I couldn't see your lower body clearly. Could you angle the camera slightly toward the front, so both legs are in view?",
  out_of_frame_left: "Your left side kept moving out of frame. Could you move the camera back a little, so your whole body stays in view through the squat?",
  out_of_frame_right: "Your right side kept moving out of frame. Could you move the camera back a little, so your whole body stays in view through the squat?",
  poor_video_quality: "I couldn't read your body position clearly. Could you film from your side, in good light, with a clear background?",
  no_reps_detected: "I couldn't spot any squats in that video. Please check you're doing goblet squats, with your full body in frame from the start.",
  insufficient_reps: "I couldn't count enough reps to work with. Could you film at least 5, going all the way down and all the way back up each time?",
  VIDEO_TOO_SHORT: "That video was too short for me to catch a full rep. Could you film a full set of at least 5 reps and try again?",
  NO_MOVEMENT_DETECTED: "The video looks still to me. Could you check the camera is filming your whole movement?",
  NO_REPS_DETECTED: "I couldn't make out a full squat. Could you make sure your whole body is visible, and film at least 5 reps?",
  BIOMECHANICS_COMPUTE_ERROR: "Sorry, something went wrong while I was reading your movement. Could you try uploading again?",
  HAIKU_TIMEOUT: "I'm taking longer than expected on your analysis. I'll try again automatically, so hang tight.",
  HAIKU_NO_OUTPUT: "I couldn't make sense of your movement data this time. Could you try uploading again? If it keeps happening, please let us know.",
  HAIKU_CONTEXT_OVERFLOW: "That video is too long for me to look at in detail. Could you upload a shorter clip, around 30 to 60 seconds?",
  FRAME_EXTRACTION_FAILED: "I found things to work on, but couldn't pull out the frames to show you. Your written coaching is still below.",
  PROGRESSION_UNAVAILABLE: "Your form analysis is ready, but I couldn't put your progression together this time.",
  PIPELINE_TIMEOUT: "This is taking much longer than it should. I've flagged it. Please try again, and your earlier data is safe.",
  SYSTEM_ERROR: "Sorry, something went wrong on our end. Your video is saved, so please try again in a moment.",
}

// If the connection drops (a phone locking its screen, a weak signal), try again instead of giving up: ask the server
// whether the analysis already finished, then reconnect. Only after this many tries is it called an error.
const MAX_RECONNECTS = 12
const reconnectDelayMs = (attempt) => Math.min(2000 + attempt * 1000, 6000)

function useSSEStream(analysisId) {
  const [steps, setSteps] = useState(
    PIPELINE_STEPS.map(step => ({ label: step.label, status: "pending" }))
  )
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)
  const [partialWarning, setPartialWarning] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [frameProgress, setFrameProgress] = useState(null) // { fraction 0..1, since: when the first progress arrived }
  const [reconnecting, setReconnecting] = useState(false)

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


    let es = null
    let retryTimer = null
    let attempts = 0
    let disposed = false

    const connect = () => {
    es = new EventSource(`${BASE_URL}/analysis/${analysisId}/stream`)
    eventSourceRef.current = es

    es.onopen = function() {
      attempts = 0
      setReconnecting(false)
    }

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
      setLastEvent(eventName)

      // How far through the frame-by-frame step it is (sent about every 5% of the video)
      if (eventName === "mediapipe_progress") {
        setFrameProgress(prev => ({ fraction: parsed.fraction ?? 0, since: prev?.since ?? Date.now() }))
        updateStep(0, "active")
        return
      }

      if (eventName === "error") {
        const code = parsed.error_code || "SYSTEM_ERROR"
        const retryable = parsed.retryable 
        const userMessage = ERROR_USER_COPY[code] || "Sorry, something went wrong. Could you try again?"

     
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
      es.close()
      if (!doneRef.current && !disposed) recover()
    }
    }

    // The connection dropped. Ask the server whether the analysis already finished; if not, reconnect (the server
    // replays the latest event). Give up with an error only after several tries.
    const recover = () => {
      if (retryTimer || disposed) return
      attempts += 1
      if (attempts > MAX_RECONNECTS) {
        setReconnecting(false)
        setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s))
        setError({ userMessage: "Connection lost. Check your internet and try again." })
        return
      }
      setReconnecting(true)
      retryTimer = setTimeout(async () => {
        retryTimer = null
        if (disposed || doneRef.current) return
        try {
          const res = await apiFetch(`${BASE_URL}/analysis/${analysisId}`)
          if (res.ok) {
            const body = await res.json()
            const status = (body.analysis || body).status
            if (status === "completed" || status === "complete") {
              // finished while we were away
              setSteps(prev => prev.map(s => ({ ...s, status: "complete" })))
              doneRef.current = true
              setReconnecting(false)
              setIsDone(true)
              return
            }
            if (status === "failed") {
              setReconnecting(false)
              setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s))
              setError({ userMessage: ERROR_USER_COPY.SYSTEM_ERROR })
              return
            }
          }
        } catch { /* still offline: fall through and try the stream again */ }
        connect()
      }, reconnectDelayMs(attempts))
    }

    // Back on the screen after the phone was locked or switched away: do not wait for the next timer
    const onVisible = () => {
      if (document.visibilityState !== "visible" || doneRef.current || disposed) return
      if (!es || es.readyState === 2) { clearTimeout(retryTimer); retryTimer = null; attempts = Math.max(0, attempts - 1); recover() }
    }
    document.addEventListener("visibilitychange", onVisible)

    connect()

    return function() {
      disposed = true
      clearTimeout(retryTimer)
      document.removeEventListener("visibilitychange", onVisible)
      if (es) es.close()
    }
  }, [analysisId])

  return { steps, isDone, error, partialWarning, cancel, resultUrl, analysisData, lastEvent, frameProgress, reconnecting }
}

export { useSSEStream, PIPELINE_STEPS }