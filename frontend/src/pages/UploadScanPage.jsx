import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { uploadVideo } from "../services/uploadService"


const EXERCISES = {
  QUADS: [
    { id: "goblet-squat",  name: "GOBLET SQUAT"  },
    { id: "barbell-squat", name: "BARBELL SQUAT"  },
    { id: "deadlift",      name: "DEADLIFT"       },
  ],
  SHOULDERS: [], BICEPS: [], FOREARMS: [], CHEST: [], "ABS/CORE": [],
}

const TIPS_TITLE = {
  "goblet-squat":  "LET'S CRUSH YOUR GOBLET SQUATS TODAY",
  "barbell-squat": "LET'S CRUSH YOUR BARBELL SQUATS TODAY",
  "deadlift":      "LET'S CRUSH YOUR DEADLIFTS TODAY",
}

const CAMERA_TIPS = [
  { label: "Angle",    text: "Record directly from the side. The AI needs to see your spine and joint angles clearly." },
  { label: "Distance", text: "Stand about 6–8 feet away so your entire body remains in the frame at the bottom of the squat." },
  { label: "Height",   text: "Place the phone at hip/waist height. Floor angles distort the AI's depth perception." },
  { label: "Contrast", text: "Wear clothes that contrast with your background (e.g., don't wear black leggings against a black wall)." },
]

const MAX_FILE_SIZE_MB = 500
const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm"]

export default function UploadScanPage() {
  const navigate     = useNavigate()
  const videoRef     = useRef(null)
  const fileInputRef = useRef(null)

  const [selectedMuscle,    setSelectedMuscle]    = useState(null)
  const [selectedExercise,  setSelectedExercise]  = useState(null)
  const [videoFile,         setVideoFile]         = useState(null)
  const [videoPreviewUrl,   setVideoPreviewUrl]   = useState(null)
  const [isPlaying,         setIsPlaying]         = useState(false)
  const [weight,            setWeight]            = useState(0)
  const [unit,              setUnit]              = useState("kg")
  const [fileError,         setFileError]         = useState("")
  const [isUploading,       setIsUploading]       = useState(false)
  const [uploadError,       setUploadError]       = useState("")
  const [showSuccessToast,  setShowSuccessToast]  = useState(false)

  const maxWeight    = unit === "kg" ? 200 : 440
  const isFormValid  = selectedExercise && videoFile && !fileError && weight > 0
  const exerciseList = selectedMuscle ? (EXERCISES[selectedMuscle] || []) : []
  const tipsTitle    = selectedExercise ? TIPS_TITLE[selectedExercise] : null

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
  }

  async function handleSubmit() {
    if (!isFormValid) return
    setUploadError(""); setIsUploading(true)
    try {
      const analysisId = await uploadVideo(videoFile, selectedExercise, weight, unit)
      navigate("/upload/loading", { state: { analysisId, videoPreviewUrl } })
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.")
      setIsUploading(false)
    }
  }

  const NAV_ITEMS = [
    { label: "Home",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", path: "/" },
    { label: "Plan",     icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", path: "/plan" },
    { label: "Anaylsis", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", path: "/upload", active: true },
    { label: "Timeline", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", path: "/timeline" },
    { label: "Profile",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", path: "/profile" },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>
      <div className="max-w-sm mx-auto px-4 pt-6">

        <h1 className="text-xl font-bold text-gray-900 mb-4">Select Target Muscle</h1>

        {/* Body diagram + Exercise Module */}
        <div className="rounded-2xl mb-4 overflow-hidden" style={{ border: "1.5px dashed #93c5fd", background: "white" }}>

          <div className="relative p-4 pb-8">
            {selectedMuscle && (
              <div className="absolute top-6 left-4 z-10">
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-widest"
                  style={{ background: "linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)" }}>
                  {selectedMuscle} SELECTED
                </span>
              </div>
            )}
            <div style={{
              position: "relative",
              padding: "4px",
              borderRadius: "12px",
              border: selectedMuscle ? "3px solid #7C3AED" : "3px solid transparent",
              background: selectedMuscle ? "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(147, 71, 255, 0.1) 100%)" : "transparent",
              transition: "all 0.3s ease",
            }}>
              <img
                src="/muscular_model2.png"
                alt="Body diagram"
                className="w-full object-contain"
                style={{
                  maxHeight: 300,
                  filter: selectedMuscle === "QUADS" ? "none" : "saturate(0)",
                  transition: "filter 0.3s ease",
                  borderRadius: "8px",
                }}
                onError={e => { e.currentTarget.src = "/muscular_model2.png" }}
              />
            </div>
            <button type="button" aria-label="SHOULDERS" className="absolute" style={{ left: "2%", top: "8%",    width: "38%", height: "14%", opacity: 0 }} onClick={() => { setSelectedMuscle(selectedMuscle === "SHOULDERS" ? null : "SHOULDERS"); setSelectedExercise(null) }} />
            <button type="button" aria-label="BICEPS"    className="absolute" style={{ left: "2%", top: "24%",   width: "30%", height: "12%", opacity: 0 }} onClick={() => { setSelectedMuscle(m => m === "BICEPS"    ? null : "BICEPS");    setSelectedExercise(null) }} />
            <button type="button" aria-label="FOREARMS"  className="absolute" style={{ left: "2%", top: "38%",   width: "34%", height: "12%", opacity: 0 }} onClick={() => { setSelectedMuscle(m => m === "FOREARMS"  ? null : "FOREARMS");  setSelectedExercise(null) }} />
            <button type="button" aria-label="QUADS"     className="absolute" style={{ left: "2%", bottom: "20%", width: "46%", height: "22%", opacity: 0 }} onClick={() => { setSelectedMuscle(m => m === "QUADS"     ? null : "QUADS");     setSelectedExercise(null) }} />
            <button type="button" aria-label="CHEST"     className="absolute" style={{ right: "2%", top: "14%",  width: "32%", height: "14%", opacity: 0 }} onClick={() => { setSelectedMuscle(m => m === "CHEST"     ? null : "CHEST");     setSelectedExercise(null) }} />
            <button type="button" aria-label="ABS/CORE"  className="absolute" style={{ right: "2%", top: "30%",  width: "36%", height: "14%", opacity: 0 }} onClick={() => { setSelectedMuscle(m => m === "ABS/CORE"  ? null : "ABS/CORE");  setSelectedExercise(null) }} />
            <button type="button" className="absolute bottom-1 right-4 text-gray-400" aria-label="Rotate">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)" }} className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-600 tracking-widest uppercase">Exercise Module</span>
                {selectedMuscle && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white tracking-wide"
                    style={{ background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)" }}>
                    {selectedMuscle}
                  </span>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            {exerciseList.length === 0 ? (
              <div className="bg-white rounded-xl px-4 py-3">
                <span className="text-sm text-gray-400">Select Target Muscle</span>
              </div>
            ) : (
              <div className="space-y-2">
                {exerciseList.map(ex => {
                  const sel = selectedExercise === ex.id
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setSelectedExercise(ex.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide bg-white transition-all"
                      style={{ border: sel ? "2px solid #3b82f6" : "2px solid transparent" }}
                    >
                      <span className="flex items-center gap-3 text-gray-900">
                        <span>🏋️</span>
                        <span>{ex.name}</span>
                      </span>
                      {sel && (
                        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#3b82f6" }}>
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
                <button type="button" className="w-full px-4 py-3 rounded-xl bg-white text-sm text-gray-400 font-medium">
                  VIEW MORE
                </button>
              </div>
            )}
          </div>
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
                setVideoFile(null)
                setVideoPreviewUrl(null)
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

        {/* Load Parameters */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
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
        </div>

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
              Uploading...
            </span>
          ) : "START ANALYSIS →"}
        </button>

        {!isFormValid && !isUploading && (
          <p className="text-xs text-gray-400 text-center mb-2">Choose exercise, set load (&gt; 0), and attach a video — then tap start.</p>
        )}
        {uploadError && <p className="text-xs text-red-500 text-center mb-2">{uploadError}</p>}

        {import.meta.env.DEV && (
          <button type="button" className="w-full py-2 text-xs text-indigo-400 underline text-center"
            onClick={() => navigate("/upload/loading", { state: { fixtureMode: true, videoPreviewUrl, analysisId: "dev-test" } })}>
            Dev: skip to loading screen
          </button>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-2 px-4">
        {NAV_ITEMS.map(({ label, icon, path, active }) => (
          <button key={label} type="button" onClick={() => navigate(path)} className="flex flex-col items-center gap-0.5">
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
