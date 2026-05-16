import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Lightbulb, Check, X } from "lucide-react"
import { useSSEStream } from "../hooks/useSSEStream"

function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const { analysisId, videoPreviewUrl } = location.state || {}

  const { steps, isDone, error, cancel, resultUrl } = useSSEStream(analysisId)

  useEffect(() => {
    if (!isDone) return
    const timer = setTimeout(() => {
      navigate(resultUrl || "/upload/results", { state: { analysisId } })
    }, 1500)
    return () => clearTimeout(timer)
  }, [isDone, analysisId, navigate, resultUrl])

  if (!analysisId) {
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

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">

      {/* Video thumbnail at the top */}
      <div className="pt-3 px-4">
        <div className="w-full rounded-2xl overflow-hidden" style={{ height: "380px" }}>
          {videoPreviewUrl ? (
            <video
              src={videoPreviewUrl}
              className="w-full h-full object-cover object-center"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <div className="w-full h-full bg-dark-card flex items-center justify-center">
              <p className="text-gray-600 text-body">Preview unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 px-5 pt-5 pb-8 gap-4">

        {/* Title and subtitle */}
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

        {/* Tips card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-transparent flex items-start gap-3">
          <Lightbulb
            size={18}
            className="text-text-tertiary dark:text-gray-400 mt-0.5 shrink-0"
          />
          <p className="text-body text-text-tertiary dark:text-gray-400 leading-relaxed">
            <span className="text-text-primary dark:text-white font-medium">
              Tips:{" "}
            </span>
            Take a 45-second breather. Your muscles need this reset for the next set.
          </p>
        </div>

        {/* Steps card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl px-4 py-3 border border-gray-100 dark:border-transparent flex flex-col gap-3">
          {steps.map((step, index) => (
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
        {error ? (
          <div className="flex gap-3">
            <button
              className="flex-1 py-4 rounded-2xl text-button font-medium text-white"
              style={{ backgroundColor: "#E57373" }}
              onClick={() => {
                cancel()
                navigate("/upload")
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-4 rounded-2xl text-button font-medium text-white"
              style={{ backgroundColor: "#E8A050" }}
              onClick={() => navigate("/upload")}
            >
              Try Again
            </button>
          </div>
        ) : (
          <button
            className="w-full py-4 rounded-2xl text-button font-medium text-white uppercase tracking-wide dark:bg-[#7B1D1D] bg-[#E57373]"
            onClick={() => {
              if (!isDone) {
                cancel()
                navigate("/upload")
              }
            }}
            disabled={isDone}
          >
            {isDone ? "Complete! Taking you to results..." : "Cancel"}
          </button>
        )}

      </div>
    </div>
  )
}

function StepIcon({ status }) {
  if (status === "complete") {
    return (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: "#00d66b" }}
      >
        <Check size={11} color="white" strokeWidth={3} />
      </div>
    )
  }

  if (status === "active") {
    return (
      <div
        className="w-5 h-5 rounded-full border-2 animate-spin shrink-0"
        style={{
          borderColor: "#99f6e4",
          borderTopColor: "transparent",
        }}
      />
    )
  }

  if (status === "error") {
    return (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: "#ff3b30" }}
      >
        <X size={11} color="white" strokeWidth={3} />
      </div>
    )
  }

  return (
    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
  )
}

export default LoadingPage
