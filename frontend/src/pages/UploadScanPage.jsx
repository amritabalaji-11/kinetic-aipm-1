import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { uploadVideoDirect } from "../services/uploadService"
import { startVideoPreparation } from "../utils/prepareVideo"
import { BIG_UNSHRUNK_BYTES, durationText, guessUploadSeconds, hasSeenTips, markTipsSeen } from "../utils/uploadHelp"
import { useWakeLock } from "../utils/useWakeLock"
import FilmingTips from "../components/FilmingTips"
import LoadCard from "../components/LoadCard"
import { convertWeight, readLastLoad, saveLastLoad } from "../utils/weightInput"
import UploadExercisePicker from "../components/UploadExercisePicker"
import { BRICOLAGE, DM_SANS, GRAY, INK } from "../components/planUi"
import { FLAT_LILAC } from "../utils/pageBackground"

const sentence = (text) => text[0].toUpperCase() + text.slice(1)
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)

const MAX_FILE_SIZE_MB = 500
const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm"]

export default function UploadScanPage() {
  const navigate     = useNavigate()
  const videoRef     = useRef(null)
  const fileInputRef = useRef(null)
  const prepRef      = useRef(null)  // the video is shrunk in the background as soon as it is chosen
  const uploadStartedAt = useRef(0)  // when the upload itself began, to work out how long is left
  const prepFraction = useRef(0)     // how far along that is, readable from inside the Start handler

  const [exercise,          setExercise]          = useState(null)
  const [videoFile,         setVideoFile]         = useState(null)
  const [videoPreviewUrl,   setVideoPreviewUrl]   = useState(null)
  const [isPlaying,         setIsPlaying]         = useState(false)
  const [weight,            setWeight]            = useState(0)
  const [unit,              setUnit]              = useState("kg")
  const [tipsChecked,       setTipsChecked]       = useState(hasSeenTips)  // ticked "I've got the tips" (remembered on this phone)
  const [tipsNudge,         setTipsNudge]         = useState(0)            // goes up each time Start is pressed without ticking
  const [lastLoad,          setLastLoad]          = useState(null)   // weight used last time for the chosen exercise
  const [fileError,         setFileError]         = useState("")
  const [isUploading,       setIsUploading]       = useState(false)
  const [phase,             setPhase]             = useState("")     // "" | "preparing" | "uploading" while Start is running
  const [progress,          setProgress]          = useState(0)      // 0..1 for the current phase
  const [prep,              setPrep]              = useState(null)   // how shrinking the chosen video is going
  const [uploadBytes,       setUploadBytes]       = useState(0)      // size of the file being sent
  const [uploadError,       setUploadError]       = useState("")
  const [showSuccessToast,  setShowSuccessToast]  = useState(false)

  useWakeLock(isUploading) // keep the screen on while preparing and uploading

  // Choosing an exercise pre-fills the weight used last time for it (still easy to change)
  useEffect(() => {
    const last = exercise ? readLastLoad(exercise.movement) : null
    setLastLoad(last)
    if (last) { setUnit(last.unit); setWeight(last.value) }
  }, [exercise])

  // Switching kg/lbs keeps the same load (12 kg -> 26.5 lbs). A chosen value ("last time") is used as it is.
  const changeUnit = (next, exactValue) => {
    if (next === unit) return
    setWeight(exactValue ?? convertWeight(weight, unit, next))
    setUnit(next)
  }

  const needsWeight  = exercise ? exercise.equipment !== "bodyweight" : true  // a plank or push-up has no load to enter
  const isFormValid  = exercise && videoFile && !fileError && (!needsWeight || weight > 0)

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
    if (!tipsChecked) {
      // the tips are one tick away: take them there and say so, rather than starting
      setTipsNudge((n) => n + 1)
      document.getElementById("filming-tips")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setUploadError(""); setIsUploading(true); setPhase("preparing"); setProgress(0)
    try {
      // wait for the shrinking to finish (usually already has); if it can't shrink, this is the original file
      const job = prepRef.current
      const stopWatching = job && setInterval(() => setProgress(prepFraction.current), 250)
      const prepared = job ? await job.promise : { file: videoFile }
      clearInterval(stopWatching)

      setPhase("uploading"); setProgress(0); setUploadBytes(prepared.file.size); uploadStartedAt.current = Date.now()
      const analysisId = await uploadVideoDirect(prepared.file, exercise.movement, needsWeight ? weight : 0, unit, { onProgress: setProgress })
      if (needsWeight && weight > 0) saveLastLoad(exercise.movement, weight, unit) // so next time it is already filled in
      markTipsSeen() // next time the filming tips start folded
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

        {/* Filming tips */}
        {exercise && <FilmingTips checked={tipsChecked} nudge={tipsNudge} onCheck={() => { markTipsSeen(); setTipsChecked(true) }} />}

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
              : `${prep.shrunk ? `Video ready: ${mb(prep.from)} MB made smaller, now ${mb(prep.to)} MB.` : `Video ready (${mb(prep.from)} MB).`} ${sentence(durationText(guessUploadSeconds(prep.to)))} to upload.`}
          </p>
        )}
        {videoFile && prep && !prep.working && !prep.shrunk && prep.from > BIG_UNSHRUNK_BYTES && (
          <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12, color: "#92580A", background: "#FFF7E6", border: "1px solid #F5D08A", borderRadius: 10, padding: "8px 12px", margin: "-6px 0 14px", lineHeight: 1.45 }}>
            ⚠ This video is big ({mb(prep.from)} MB) and may take several minutes to upload. If you can, trim it to just your working set.
          </p>
        )}

        {/* Weight */}
        {needsWeight && (
          <LoadCard value={weight} unit={unit} equipment={exercise?.equipment} last={lastLoad} onChange={setWeight} onUnitChange={changeUnit} />
        )}

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
        {isUploading && (
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, textAlign: "center", margin: "0 0 8px", lineHeight: 1.5 }}>
            {phase === "uploading" && (() => {
              const elapsed = (Date.now() - uploadStartedAt.current) / 1000
              // once a good part has gone, the time left follows the real speed; until then it is the rough guess
              const left = progress >= 0.1 && elapsed > 3 ? (elapsed * (1 - progress)) / progress : guessUploadSeconds(uploadBytes) * (1 - progress)
              return <>{durationText(left)} left<br /></>
            })()}
            Keep this screen open until it&apos;s done.
          </p>
        )}
        {tipsNudge > 0 && !tipsChecked && !isUploading && (
          <p role="alert" className="text-xs text-red-500 text-center mb-2">Tick “I&apos;ve got the tips” above first.</p>
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
