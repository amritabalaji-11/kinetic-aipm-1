import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { uploadVideoDirect } from "../services/uploadService"
import { startVideoPreparation } from "../utils/prepareVideo"
import UploadExercisePicker from "../components/UploadExercisePicker"
import { BRICOLAGE, DM_SANS, GRAY, INK } from "../components/planUi"
import { FLAT_LILAC } from "../utils/pageBackground"

const CAMERA_TIPS = [
  { label: "Angle",    text: "Record directly from the side. The AI needs to see your spine and joint angles clearly." },
  { label: "Distance", text: "Stand about 6–8 feet away so your entire body remains in the frame at the bottom of the squat." },
  { label: "Height",   text: "Place the phone at hip/waist height. Floor angles distort the AI's depth perception." },
  { label: "Contrast", text: "Wear clothes that contrast with your background (e.g., don't wear black leggings against a black wall)." },
]

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)

const MAX_FILE_SIZE_MB = 500
const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm"]

export default function UploadScanPage() {
  const navigate     = useNavigate()
  const videoRef     = useRef(null)
  const fileInputRef = useRef(null)
  const prepRef      = useRef(null)  // the video is shrunk in the background as soon as it is chosen
  const prepFraction = useRef(0)     // how far along that is, readable from inside the Start handler

  const [exercise,          setExercise]          = useState(null)
  const [videoFile,         setVideoFile]         = useState(null)
  const [videoPreviewUrl,   setVideoPreviewUrl]   = useState(null)
  const [isPlaying,         setIsPlaying]         = useState(false)
  const [weight,            setWeight]            = useState(0)
  const [unit,              setUnit]              = useState("kg")
  const [fileError,         setFileError]         = useState("")
  const [isUploading,       setIsUploading]       = useState(false)
  const [phase,             setPhase]             = useState("")     // "" | "preparing" | "uploading" while Start is running
  const [progress,          setProgress]          = useState(0)      // 0..1 for the current phase
  const [prep,              setPrep]              = useState(null)   // how shrinking the chosen video is going
  const [uploadError,       setUploadError]       = useState("")
  const [showSuccessToast,  setShowSuccessToast]  = useState(false)

  const maxWeight    = unit === "kg" ? 200 : 440
  const needsWeight  = exercise ? exercise.equipment !== "bodyweight" : true  // a plank or push-up has no load to enter
  const isFormValid  = exercise && videoFile && !fileError && (!needsWeight || weight > 0)
  const tipsTitle    = exercise ? `LET'S CRUSH YOUR ${exercise.name.toUpperCase()} TODAY` : null

  // Shrink in the background so it is usually done by the time the person taps Start
  function beginPreparing(file) {
    prepRef.current?.cancel()
    setPrep(null)
    const job = startVideoPreparation(file, (p) => { prepFraction.current = p; setPrep({ working: true, progress: p }) })
    prepRef.current = job
    job.promise.then((result) => {
      if (prepRef.current === job) setPrep({ working: false, shrunk: result.shrunk, from: result.originalBytes, to: result.finalBytes })
    })
  }

  function clearVideo() {
    prepRef.current?.cancel(); prepRef.current = null
    setPrep(null)
    setVideoFile(null); setVideoPreviewUrl(null)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError("")
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setFileError("Unsupported format. Please upload MP4, MOV or WebM.")
      setVideoFile(null); setVideoPreviewUrl(null); return
    }
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      setFileError("File too large. Max " + MAX_FILE_SIZE_MB + " MB.")
      setVideoFile(null); setVideoPreviewUrl(null); return
    }
    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
    setShowSuccessToast(true)
    beginPreparing(file)
  }

  async function handleSubmit() {
    if (!isFormValid) return
    setUploadError(""); setIsUploading(true); setPhase("preparing"); setProgress(0)
    try {
      // wait for the shrinking to finish (usually already has); if it can't shrink, this is the original file
      const job = prepRef.current
      const stopWatching = job && setInterval(() => setProgress(prepFraction.current), 250)
      const prepared = job ? await job.promise : { file: videoFile }
      clearInterval(stopWatching)

      setPhase("uploading"); setProgress(0)
      const analysisId = await uploadVideoDirect(prepared.file, exercise.movement, needsWeight ? weight : 0, unit, { onProgress: setProgress })
      navigate("/upload/loading", { state: { analysisId, videoPreviewUrl } })
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.")
      setIsUploading(false); setPhase("")
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: FLAT_LILAC, colorScheme: "light" }}>
      <div className="max-w-sm mx-auto px-4 pt-6">

        <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, color: INK, margin: "0 0 2px" }}>Check your form</h1>
        <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: "0 0 14px" }}>
          What did you film? Pick a body area, then the exercise.
        </p>
        <div className="mb-4">
          <UploadExercisePicker exercise={exercise} onPick={setExercise} onClear={() => setExercise(null)} />
        </div>

        {/* Tips */}
        {tipsTitle && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-900">Tips for the video upload</span>
              <div className="w-6 h-0.5 bg-blue-400" />
            </div>
            <p className="text-[11px] font-bold text-gray-700 tracking-wide text-center mb-3">{tipsTitle}</p>
            <img src="/angle.png" alt="Form reference" className="w-full rounded-lg mb-3 object-contain max-h-44" onError={e => { e.currentTarget.style.display = "none" }} />
            <ul className="space-y-1.5">
              {CAMERA_TIPS.map(tip => (
                <li key={tip.label} className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold">{tip.label}: </span>{tip.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload Session Video */}
        <h2 className="text-xl font-bold text-gray-900 mb-3">Upload Session Video</h2>
        {videoPreviewUrl ? (
          <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: "1.5px dashed #93c5fd" }}>
            <video
              ref={videoRef}
              src={videoPreviewUrl}
              className="w-full cursor-pointer"
              style={{ display: "block" }}
              muted
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onClick={() => {
                if (!videoRef.current) return
                videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && (
                <button
                  type="button"
                  className="w-14 h-14 rounded-full flex items-center justify-center pointer-events-auto"
                  style={{ background: "rgba(0,0,0,0.45)", border: "2px solid #14b8a6" }}
                  onClick={() => { if (videoRef.current) videoRef.current.play() }}
                >
                  <svg className="w-6 h-6 ml-1" fill="#14b8a6" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </button>
              )}
            </div>
            {showSuccessToast && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-2 rounded-full"
                style={{ background: "rgba(20,20,20,0.85)" }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22c55e" }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-white text-sm font-semibold">Successful</span>
                <button type="button" onClick={() => setShowSuccessToast(false)} className="text-gray-400 text-sm ml-1">✕</button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                clearVideo()
                setIsPlaying(false)
                setShowSuccessToast(false)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >✕</button>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center mb-4" style={{ background: "linear-gradient(135deg, #ddd6fe 0%, #e0e7ff 100%)", border: "1.5px dashed #93c5fd" }}>
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">Upload Video</p>
            <p className="text-xs text-gray-500 mb-4">Supports high-quality files.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 mx-auto px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#1f2937" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Video
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleFileChange} className="hidden" />
        {fileError && <p className="text-xs text-red-500 mb-3">{fileError}</p>}
        {videoFile && prep && (
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "-6px 2px 14px" }}>
            {prep.working
              ? `Getting your video ready to upload… ${Math.round(prep.progress * 100)}%`
              : prep.shrunk
                ? `Video ready: ${mb(prep.from)} MB made smaller, now ${mb(prep.to)} MB.`
                : `Video ready (${mb(prep.from)} MB).`}
          </p>
        )}

        {/* Load Parameters */}
        {needsWeight && <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Load Parameters</span>
            <div className="flex rounded-full overflow-hidden border border-indigo-200 text-xs font-semibold">
              {[["Kg","kg"],["Lbs","lbs"]].map(([label, val]) => (
                <button key={val} type="button" onClick={() => { setUnit(val); setWeight(0) }}
                  className="px-3 py-1 transition-colors"
                  style={{ background: unit === val ? "#3b82f6" : "white", color: unit === val ? "white" : "#6b7280" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Weight</span>
            <span className="text-2xl font-bold text-gray-900">
              {weight} <span className="text-sm font-semibold text-gray-500 uppercase">{unit}</span>
            </span>
          </div>
          <input type="range" min={0} max={maxWeight} step={0.5} value={weight}
            onChange={e => setWeight(Number(e.target.value))} className="w-full" style={{ accentColor: "#6366f1" }} />
          <div className="flex justify-between mt-1 px-1">
            {[0,1,2,3,4].map(i => <div key={i} className="w-px h-1.5 bg-gray-300" />)}
          </div>
        </div>}

        {/* Start Analysis */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUploading}
          className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase mb-2"
          style={{
            background: isFormValid ? "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" : "#e5e7eb",
            color: isFormValid ? "white" : "#9ca3af",
          }}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {phase === "preparing" ? `Preparing video… ${Math.round(progress * 100)}%` : `Uploading… ${Math.round(progress * 100)}%`}
            </span>
          ) : "START ANALYSIS →"}
        </button>

        {!isFormValid && !isUploading && (
          <p className="text-xs text-gray-400 text-center mb-2">{needsWeight ? "Choose an exercise, set the load (> 0) and attach a video — then tap start." : "Choose an exercise and attach a video — then tap start."}</p>
        )}
        {uploadError && <p className="text-xs text-red-500 text-center mb-2">{uploadError}</p>}

        {import.meta.env.DEV && (
          <button type="button" className="w-full py-2 text-xs text-indigo-400 underline text-center"
            onClick={() => navigate("/upload/loading", { state: { fixtureMode: true, videoPreviewUrl, analysisId: "dev-test" } })}>
            Dev: skip to loading screen
          </button>
        )}
      </div>

    </div>
  )
}
