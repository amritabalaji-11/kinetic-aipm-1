import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, CheckCircle, AlertCircle, RotateCw, Check, ChevronDown, Play, X } from "lucide-react"
import { uploadVideo } from "../services/uploadService"
import { validateVideoFile } from "../utils/validateVideo"

const EXERCISES = [
  { id: "goblet-squat",  name: "GOBLET SQUAT",  enabled: true  },
  { id: "barbell-squat", name: "BARBELL SQUAT",  enabled: false },
  { id: "deadlift",      name: "DEADLIFT",       enabled: false },
]

const MAX_FILE_SIZE_MB    = 500
const ACCEPTED_FORMATS    = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/avi", "video/msvideo"]
const ACCEPTED_EXTENSIONS = ".mp4, .mov, .avi"

const MIN_WEIGHT  = 0
const MAX_WEIGHT  = 200
const WEIGHT_STEP = 0.5

function UploadScanPage() {
  const navigate = useNavigate()

  const [exercise,        setExercise]        = useState("")
  const [weight,          setWeight]          = useState(0)
  const [videoFile,       setVideoFile]       = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null)
  const [weightTouched,   setWeightTouched]   = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [isValidating,    setIsValidating]    = useState(false)
  const [tipsExpanded,    setTipsExpanded]    = useState(true)
  const [unit,            setUnit]            = useState("kg")
  const [formAlert,       setFormAlert]       = useState("")
  const [isUploading,     setIsUploading]     = useState(false)
  const [uploadError,     setUploadError]     = useState(null)

  const maxWeightForUnit  = unit === "kg" ? MAX_WEIGHT : 440
  const isWeightValid     = weight > 0
  const isFormValid       = exercise && isWeightValid && videoFile && !validationError && !isValidating
  const showWeightError   = weightTouched && !isWeightValid
  const highlightedMuscle = exercise === "goblet-squat" || exercise === "barbell-squat" ? "quads" : null

  useEffect(() => {
    if (isFormValid) setFormAlert("")
  }, [isFormValid])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setValidationError(null)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setIsValidating(true)

    const error = await validateVideoFile(file)

    setIsValidating(false)

    if (error) {
      setValidationError(error)
      return
    }

    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
  }

  function handleWeightSliderChange(e) {
    setWeight(Number(e.target.value))
    setWeightTouched(true)
  }

  function handleWeightInputChange(e) {
    const val = e.target.value
    if (val === "") { setWeight(0); return }
    const num = Number(val)
    if (!isNaN(num) && num >= MIN_WEIGHT && num <= maxWeightForUnit) setWeight(num)
  }

  async function handleSubmit() {
    if (!isFormValid) {
      const parts = []
      if (!exercise)        parts.push("select an exercise")
      if (!videoFile)       parts.push("upload a video")
      if (!isWeightValid)   parts.push("set weight greater than 0")
      if (validationError)  parts.push("fix the file error above")
      setFormAlert(`Before starting: ${parts.join(", ")}.`)
      setWeightTouched(true)
      return
    }

    setFormAlert("")
    setUploadError(null)
    setIsUploading(true)

    try {
      const analysisId = await uploadVideo(videoFile, exercise, weight, unit)
      navigate("/upload/loading", {
        state: { analysisId, videoPreviewUrl },
      })
    } catch (err) {
      setUploadError({
        type: err.code === "UPLOAD_TIMEOUT" ? "UPLOAD_TIMEOUT" : "UPLOAD_FAILED",
        message: err.message || "Upload failed. Please try again.",
      })
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-bg text-text-primary p-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* ───────── Anatomy + Exercise Module ───────── */}
        <section className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-4 bg-light-card shadow-sm">

          <div className="relative flex justify-center mb-6">
            <div className="relative w-64 h-84">
              <img
                src="/muscular_light.png"
                alt="Anatomy diagram"
                className="w-full h-full object-cover rounded-lg"
              />

              {highlightedMuscle === "quads" && (
                <div className="absolute left-1/2 top-[48%] -translate-x-1/2 w-20 h-16 bg-cyan-glow/40 blur-sm rounded-full pointer-events-none" />
              )}

              <span className="absolute top-10 left-[155px] text-[10px] text-text-teritary tracking-wide">SHOULDERS</span>
              <span className="absolute top-[60px] left-[50px] text-[10px] text-text-teritary tracking-wide">BICEPS</span>
              <span className="absolute top-[95px] left-[12px] text-[10px] text-text-teritary tracking-wide">FOREARMS</span>
              <span
                className={`absolute top-[192px] left-[55px] text-[10px] tracking-wide ${
                  highlightedMuscle === "quads" ? "text-cyan-glow font-semibold" : "text-text-teritary"
                }`}
                style={{ pointerEvents: "none" }}
              >
                QUADS
              </span>
              <span className="absolute top-[140px] right-[60px] text-[10px] text-text-teritary tracking-wide">CHEST</span>
              <span className="absolute bottom-[180px] right-[160px] text-[10px] text-text-teritary tracking-wide">ABS/CORE</span>
            </div>

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 192 288"
              preserveAspectRatio="none"
            >
              <line x1="109" y1="55" x2="112" y2="45" stroke="#1d2d3e" strokeOpacity="0.4" strokeWidth="1" />
              <line x1="69" y1="62" x2="75" y2="80" stroke="#1d2d3e" strokeOpacity="0.4" strokeWidth="1" />
              <line x1="57" y1="92" x2="57" y2="112" stroke="#1d2d3e" strokeOpacity="0.4" strokeWidth="1" />
              <line
                x1="80" y1="167" x2="87" y2="167"
                stroke={highlightedMuscle === "quads" ? "#00ffc2" : "#1d2d3e"}
                strokeOpacity={highlightedMuscle === "quads" ? "0.9" : "0.4"}
                strokeWidth="1"
              />
              <line x1="115" y1="118" x2="105" y2="84" stroke="#1d2d3e" strokeOpacity="0.4" strokeWidth="1" />
              <line x1="81" y1="130" x2="95" y2="120" stroke="#1d2d3e" strokeOpacity="0.4" strokeWidth="1" />
            </svg>

            <button
              type="button"
              className="absolute bottom-0 right-0 text-text-teritary hover:text-text-primary"
              aria-label="Rotate view"
            >
              <RotateCw size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-text-teritary">Exercise Module</h2>
            <button type="button" className="text-text-disabled hover:text-text-teritary" aria-label="View options">
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {EXERCISES.map((ex) => {
              const isSelected = exercise === ex.id
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => ex.enabled && setExercise(ex.id)}
                  disabled={!ex.enabled}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium tracking-wide transition-colors ${
                    isSelected
                      ? "border-cyan-glow text-text-primary bg-cyan-glow/15"
                      : ex.enabled
                      ? "border-gray-200 text-text-primary hover:border-gray-300 bg-white"
                      : "border-gray-100 text-text-disabled cursor-not-allowed bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-sm bg-gray-100" />
                    {ex.name}
                  </span>
                  {!ex.enabled && (
                    <span className="text-[10px] text-text-disabled uppercase tracking-wider">Soon</span>
                  )}
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-cyan-glow flex items-center justify-center">
                      <Check size={14} className="text-text-primary" />
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-text-teritary hover:text-text-primary hover:border-gray-300 transition-colors"
            >
              VIEW MORE
            </button>
          </div>
        </section>

        {/* ───────── Filming Tips (collapsible) ───────── */}
        <section className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-4 bg-light-card shadow-sm">
          <button
            type="button"
            onClick={() => setTipsExpanded((v) => !v)}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-sm font-semibold text-text-primary">Tips for the video upload</h2>
            <span className="text-error text-lg leading-none">{tipsExpanded ? "—" : "+"}</span>
          </button>

          {tipsExpanded && (
            <>
              <div className="mb-3">
                <img
                  src="/angle.png"
                  alt="Correct vs incorrect squat form reference"
                  className="w-full aspect-video object-contain rounded-md"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              </div>
              <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
                <li><strong>Angle</strong>: Record directly from the side. The AI needs to see your spine and joint angles clearly.</li>
                <li><strong>Distance</strong>: Stand about 6–8 feet away so your entire body stays in frame at the bottom of the squat.</li>
                <li><strong>Height</strong>: Place the phone at hip/waist height. Floor angles distort the AI's depth perception.</li>
                <li><strong>Contrast</strong>: Wear clothes that contrast with your background (e.g., don't wear black leggings against a black wall).</li>
              </ul>
            </>
          )}
        </section>

        {/* ───────── Upload Session Video ───────── */}
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Upload Session Video</h2>

          {videoPreviewUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-light-card border border-gray-200 shadow-sm">
              <video src={videoPreviewUrl} className="w-full aspect-video object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <button
                  type="button"
                  onClick={(e) => {
                    const vid = e.currentTarget.closest("div").querySelector("video")
                    if (vid.paused) vid.play(); else vid.pause()
                  }}
                  className="w-14 h-14 rounded-full bg-cyan-glow flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                  aria-label="Play video preview"
                >
                  <Play size={24} className="text-text-primary ml-1" fill="currentColor" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("video-upload").click()}
                className="absolute top-2 right-2 px-3 py-1 bg-white/90 text-text-primary text-xs rounded-md hover:bg-white shadow"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-6 bg-light-card text-center shadow-sm">
              <Upload size={36} className="text-text-teritary mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">Upload Video</p>
              <p className="text-xs text-text-teritary mb-4">MP4, MOV or AVI · max {MAX_FILE_SIZE_MB} MB</p>
              <button
                type="button"
                onClick={() => document.getElementById("video-upload").click()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary text-sm rounded-lg transition-colors"
              >
                Upload Video
              </button>
            </div>
          )}

          <input
            id="video-upload"
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/avi,.mp4,.mov,.avi"
            onChange={handleFileChange}
            className="hidden"
          />

          {videoFile && !validationError && (
            <p className="text-xs text-text-teritary mt-2 flex items-center gap-1">
              <CheckCircle size={12} className="text-success" />
              {videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}

          {isValidating && (
            <p className="text-xs text-text-teritary mt-2 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-cyan-glow border-t-transparent animate-spin" />
              Checking file…
            </p>
          )}

          {validationError && (
            <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-error" />
                <p className="flex-1 text-xs text-error leading-relaxed">{validationError.message}</p>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => { setValidationError(null); setVideoFile(null); setVideoPreviewUrl(null) }}
                  className="shrink-0 text-error hover:text-red-700"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setValidationError(null); setVideoFile(null); setVideoPreviewUrl(null) }}
                  className="text-xs text-text-teritary underline hover:text-text-primary"
                >
                  Dismiss
                </button>
                {(validationError.type === "FILE_TOO_LARGE" || validationError.type === "FORMAT_UNSUPPORTED") && (
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("video-upload")
                      input.value = ""
                      input.click()
                    }}
                    className="text-xs font-medium text-cyan-glow underline hover:brightness-90"
                  >
                    Re-select file
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ───────── Load Parameters (weight) ───────── */}
        <section className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-4 bg-light-card shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-wider text-text-teritary">Load Parameters</label>
            <div className="flex bg-gray-100 rounded-md p-0.5 text-xs">
              {["kg", "lbs"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setUnit(u); setWeight(0); setWeightTouched(false) }}
                  className={`px-2 py-0.5 rounded transition-colors uppercase ${
                    unit === u ? "bg-cyan-glow text-text-primary font-semibold" : "text-text-teritary"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-primary">Weight</span>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_WEIGHT}
                max={maxWeightForUnit}
                step={WEIGHT_STEP}
                value={weight === 0 ? "" : weight}
                placeholder="0"
                onChange={handleWeightInputChange}
                onBlur={() => setWeightTouched(true)}
                className="w-16 bg-transparent text-right text-2xl text-text-primary font-semibold focus:outline-none"
              />
              <span className="text-sm text-text-teritary uppercase">{unit}</span>
            </div>
          </div>

          <input
            type="range"
            min={MIN_WEIGHT}
            max={maxWeightForUnit}
            step={WEIGHT_STEP}
            value={weight}
            onChange={handleWeightSliderChange}
            className="w-full accent-cyan-glow"
          />

          {showWeightError && (
            <p className="text-xs text-error mt-2 flex items-center gap-1">
              <AlertCircle size={14} />
              Weight must be greater than 0
            </p>
          )}
        </section>

        {/* ───────── Start Analysis Button ───────── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUploading || isValidating}
          className={`w-full h-14 rounded-xl font-semibold tracking-wide transition-all ${
            isFormValid && !isUploading && !isValidating
              ? "bg-gradient-to-r from-teal to-cyan-glow text-text-primary hover:brightness-105 shadow-md"
              : "bg-gray-100 text-text-secondary border border-gray-200"
          }`}
        >
          {isUploading ? "UPLOADING..." : isValidating ? "VALIDATING..." : "START ANALYSIS →"}
        </button>

        {!isFormValid && !isUploading && (
          <p className="text-xs text-text-teritary text-center -mt-2">
            Choose exercise, set load (&gt; 0), and attach a video — then tap start.
          </p>
        )}

        {formAlert && (
          <p className="text-xs text-error text-center flex items-start justify-center gap-1">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{formAlert}</span>
          </p>
        )}

        {uploadError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-error" />
              <p className="flex-1 text-xs text-error leading-relaxed">{uploadError.message}</p>
            </div>
            {uploadError.type === "UPLOAD_TIMEOUT" ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-2 text-xs font-medium text-cyan-glow underline hover:brightness-90"
              >
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="mt-2 text-xs text-text-teritary underline hover:text-text-primary"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Dev shortcut */}
        {import.meta.env.DEV && (
          <button
            type="button"
            className="w-full py-2 text-xs text-teal underline text-center"
            onClick={() =>
              navigate("/upload/loading", {
                state: {
                  fixtureMode:    true,
                  exercise:       exercise || "goblet-squat",
                  weight:         weight || 20,
                  unit,
                  videoPreviewUrl,
                  queuedFileSize: videoFile?.size ?? 55 * 1024 * 1024,
                },
              })
            }
          >
            Dev: preview loading UI (no server)
          </button>
        )}

      </div>
    </div>
  )
}

export default UploadScanPage
