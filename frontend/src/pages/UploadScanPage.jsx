import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, CheckCircle, AlertCircle, RotateCw, Check, ChevronDown, Play } from "lucide-react"
import { uploadVideo } from "../services/uploadService"

// ─── W5 NOTE ─────────────────────────────────────────────────────────────────
// queueAnalysisUpload removed — no API calls in W5.
// handleSubmit navigates to LoadingPage in fixtureMode.
// Real /upload wiring comes in W6.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Muscle groups ────────────────────────────────────────────────────────────
// Hit zones are invisible overlays — positioned to match the anatomy image.
// Labels, SVG lines, and glow positions are untouched from original.
const MUSCLE_GROUPS = [
  {
    id: "shoulders",
    label: "SHOULDERS",
    zone: { top: "19%", left: "29%", width: "10%", height: "7%" },
    glow: { top: "23%", left: "31%", translateX: "0", w: "w-6", h: "h-6" },
    marker: { x: 120, y: 60 },
    exercises: [
      { id: "ohp",           name: "OVERHEAD PRESS",  enabled: false },
      { id: "lateral-raise", name: "LATERAL RAISE",   enabled: false },
    ],
  },
  {
    id: "biceps",
    label: "BICEPS",
    zone: { top: "26%", left: "20%", width: "22%", height: "14%" },
    glow: { top: "28%", left: "29%", translateX: "0", w: "w-5", h: "h-12", rotate: "10deg" },
    marker: { x: 28, y: 100 },
    exercises: [
      { id: "barbell-curl",  name: "BARBELL CURL",    enabled: false },
      { id: "hammer-curl",   name: "HAMMER CURL",     enabled: false },
    ],
  },
  {
    id: "forearms",
    label: "FOREARMS",
    zone: { top: "33%", left: "16%", width: "22%", height: "14%" },
    glow: { top: "35%", left: "27%", translateX: "0", w: "w-5", h: "h-12", rotate: "10deg" },
    marker: { x: 36, y: 140 },
    exercises: [
      { id: "wrist-curl",    name: "WRIST CURL",      enabled: false },
      { id: "reverse-curl",  name: "REVERSE CURL",    enabled: false },
    ],
  },
  {
    id: "chest",
    label: "CHEST",
    zone: { top: "22%", left: "32%", width: "28%", height: "13%" },
    glow: { top: "26%", left: "48%", translateX: "-50%", w: "w-14", h: "h-10" },
    marker: { x: 152, y: 120 },
    exercises: [
      { id: "bench-press",   name: "BENCH PRESS",     enabled: false },
      { id: "incline-press", name: "INCLINE PRESS",   enabled: false },
    ],
  },
  {
    id: "abs",
    label: "ABS/CORE",
    zone: { top: "33%", left: "28%", width: "40%", height: "14%" },
    glow: { top: "34%", left: "48%", translateX: "-50%", w: "w-16", h: "h-12" },
    marker: { x: 152, y: 130 },
    exercises: [
      { id: "plank",         name: "PLANK",           enabled: false },
      { id: "crunch",        name: "CRUNCH",          enabled: false },
      { id: "hanging-raise", name: "HANGING LEG RAISE", enabled: false },
    ],
  },
  {
    id: "legs",
    label: "QUADS",
    zone: { top: "45%", left: "25%", width: "44%", height: "19%" },
    glow: { top: "47%", left: "47%", translateX: "-50%", w: "w-20", h: "h-16" },
    marker: { x: 132, y: 182 },
    exercises: [
      { id: "goblet-squat",  name: "GOBLET SQUAT",   enabled: true  },
      { id: "barbell-squat", name: "BARBELL SQUAT",  enabled: false },
      { id: "leg-press",     name: "LEG PRESS",      enabled: false },
    ],
  },
]

const MAX_FILE_SIZE_MB    = 500
const ACCEPTED_FORMATS    = ["video/mp4", "video/quicktime", "video/webm"]
const ACCEPTED_EXTENSIONS = ".mp4, .mov, .webm"
const MIN_WEIGHT          = 0
const MAX_WEIGHT          = 200
const WEIGHT_STEP         = 0.5

function UploadScanPage() {
  const navigate = useNavigate()

  const [selectedGroup,   setSelectedGroup]   = useState(null)
  const [exercise,        setExercise]        = useState("")
  const [weight,          setWeight]          = useState(0)
  const [videoFile,       setVideoFile]       = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null)
  const [weightTouched,   setWeightTouched]   = useState(false)
  const [fileError,       setFileError]       = useState("")
  const [tipsExpanded,    setTipsExpanded]    = useState(true)
  const [unit,            setUnit]            = useState("kg")
  const [formAlert,       setFormAlert]       = useState("")
  const [isUploading,     setIsUploading]     = useState(false)
  const [uploadError,     setUploadError]     = useState("")

  const maxWeightForUnit = unit === "kg" ? MAX_WEIGHT : 440
  const isWeightValid    = weight > 0
  const isFormValid      = exercise && isWeightValid && videoFile && !fileError
  const showWeightError  = weightTouched && !isWeightValid

  const activeGroup       = MUSCLE_GROUPS.find((g) => g.id === selectedGroup)
  const visibleExercises  = activeGroup?.exercises ?? []

  const highlightedMuscle = selectedGroup === "legs" || exercise === "goblet-squat" || exercise === "barbell-squat"
    ? "quads"
    : selectedGroup ?? null

  useEffect(() => {
    if (isFormValid) setFormAlert("")
  }, [isFormValid])

  useEffect(() => {
    if (!selectedGroup) return
    const ids = activeGroup?.exercises.map((e) => e.id) || []
    if (exercise && !ids.includes(exercise)) setExercise("")
  }, [selectedGroup])

  function handleMuscleGroupClick(groupId) {
    setSelectedGroup((prev) => prev === groupId ? null : groupId)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileError("")
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setFileError(`Unsupported format. Please upload ${ACCEPTED_EXTENSIONS}.`)
      setVideoFile(null); setVideoPreviewUrl(null); return
    }
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`File too large (${fileSizeMB.toFixed(1)} MB). Max ${MAX_FILE_SIZE_MB} MB. Try trimming the clip to the working set only.`)
      setVideoFile(null); setVideoPreviewUrl(null); return
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
      if (!exercise)      parts.push("select an exercise")
      if (!videoFile)     parts.push("upload a video")
      if (!isWeightValid) parts.push("set weight greater than 0")
      if (fileError)      parts.push("fix the file error above")
      setFormAlert(`Before starting: ${parts.join(", ")}.`)
      setWeightTouched(true)
      return
    }

    setFormAlert("")
    setUploadError("")

    setIsUploading(true)
    try {
      const analysisId = await uploadVideo(videoFile, exercise, weight, unit)
      navigate("/upload/loading", { state: { analysisId, videoPreviewUrl } })
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.")
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-bg text-text-primary p-4">
      <div className="max-w-md mx-auto space-y-4">

        <section className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-4 bg-light-card shadow-sm">

          <p className="text-xs text-text-teritary text-center mb-3">
            {selectedGroup
              ? `${activeGroup.label} selected — choose an exercise below`
              : "Tap a muscle group to get started"}
          </p>

          <div className="relative flex justify-center mb-6">
            <div
              className="relative w-80 rounded-lg overflow-hidden"
              style={{
                aspectRatio: '2/3',
                backgroundImage: "url('/muscular_model.png')",
                backgroundSize: '72% auto',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#ffffff',
              }}
            >
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleMuscleGroupClick(group.id)}
                  aria-label={`Select ${group.label}`}
                  style={{
                    position: "absolute",
                    top: group.zone.top,
                    left: group.zone.left,
                    width: group.zone.width,
                    height: group.zone.height,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                />
              ))}

              {/* ── Blur glow — shown for active muscle group ── */}
              {activeGroup && (
                <div
                  className={`absolute ${activeGroup.glow.w} ${activeGroup.glow.h} bg-cyan-glow/40 blur-sm rounded-full pointer-events-none`}
                  style={{
                    top: activeGroup.glow.top,
                    left: activeGroup.glow.left,
                    transform: `translateX(${activeGroup.glow.translateX})${activeGroup.glow.rotate ? ` rotate(${activeGroup.glow.rotate})` : ""}`,
                    zIndex: 5,
                  }}
                />
              )}

              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 192 288"
                preserveAspectRatio="xMidYMid meet"
                style={{ zIndex: 15 }}
              >

                <line x1="65" y1="75" x2="30" y2="63"
                  stroke={selectedGroup === "shoulders" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={selectedGroup === "shoulders" ? "0.9" : "0.4"} strokeWidth="1" />
                <line x1="62" y1="97" x2="36" y2="97"
                  stroke={selectedGroup === "biceps" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={selectedGroup === "biceps" ? "0.9" : "0.4"} strokeWidth="1" />
                <line x1="54" y1="122" x2="36" y2="118"
                  stroke={selectedGroup === "forearms" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={selectedGroup === "forearms" ? "0.9" : "0.4"} strokeWidth="1" />
                <line x1="76" y1="160" x2="26" y2="192"
                  stroke={highlightedMuscle === "quads" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={highlightedMuscle === "quads" ? "0.9" : "0.4"} strokeWidth="1" />
                <line x1="98" y1="82" x2="152" y2="97"
                  stroke={selectedGroup === "chest" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={selectedGroup === "chest" ? "0.9" : "0.4"} strokeWidth="1" />
                <line x1="88" y1="118" x2="138" y2="118"
                  stroke={selectedGroup === "abs" ? "#00ffc2" : "#1d2d3e"}
                  strokeOpacity={selectedGroup === "abs" ? "0.9" : "0.4"} strokeWidth="1" />
                <text x="6" y="60" textAnchor="start" fontSize="8" fill={selectedGroup === "shoulders" ? "#00ffc2" : "#1d2d3e"} fontWeight={selectedGroup === "shoulders" ? 700 : 500}>SHOULDERS</text>
                <text x="6" y="100" textAnchor="start" fontSize="8" fill={selectedGroup === "biceps" ? "#00ffc2" : "#1d2d3e"} fontWeight={selectedGroup === "biceps" ? 700 : 500}>BICEPS</text>
                <text x="6" y="115" textAnchor="start" fontSize="8" fill={selectedGroup === "forearms" ? "#00ffc2" : "#1d2d3e"} fontWeight={selectedGroup === "forearms" ? 700 : 500}>FOREARMS</text>
                <text x="6" y="200" textAnchor="start" fontSize="8" fill={highlightedMuscle === "quads" ? "#00ffc2" : "#1d2d3e"} fontWeight={highlightedMuscle === "quads" ? 700 : 500}>QUADS</text>
                <text x="180" y="100" textAnchor="end" fontSize="8" fill={selectedGroup === "chest" ? "#00ffc2" : "#1d2d3e"} fontWeight={selectedGroup === "chest" ? 700 : 500}>CHEST</text>
                <text x="180" y="120" textAnchor="end" fontSize="8" fill={selectedGroup === "abs" ? "#00ffc2" : "#1d2d3e"} fontWeight={selectedGroup === "abs" ? 700 : 500}>ABS/CORE</text>
              </svg>
            </div>

            <button
              type="button"
              className="absolute bottom-0 right-0 text-text-teritary hover:text-text-primary"
              aria-label="Rotate view"
            >
              <RotateCw size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-text-teritary">
              {selectedGroup ? `${activeGroup.label} — Exercise Module` : "Exercise Module"}
            </h2>
            <button type="button" className="text-text-disabled hover:text-text-teritary" aria-label="View options">
              <ChevronDown size={14} />
            </button>
          </div>

          {!selectedGroup ? (
            <div className="text-xs text-text-teritary text-center py-4 border border-dashed border-gray-200 rounded-lg">
              Select a muscle group above to see exercises
            </div>
          ) : (
            <div className="space-y-2">
              {visibleExercises.map((ex) => {
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
            </div>
          )}
        </section>

        {videoFile && <section className="border-2 border-dashed border-cyan-glow/60 rounded-xl p-4 bg-light-card shadow-sm">
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
        </section>}

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
              <p className="text-xs text-text-teritary mb-4">MP4, MOV or WebM · max {MAX_FILE_SIZE_MB} MB</p>
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
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {videoFile && !fileError && (
            <p className="text-xs text-text-teritary mt-2 flex items-center gap-1">
              <CheckCircle size={12} className="text-success" />
              {videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}
          {fileError && (
            <p className="text-xs text-error mt-2 flex items-start gap-1">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </section>

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

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUploading}
          className={`w-full h-14 rounded-xl font-semibold tracking-wide transition-all ${
            isFormValid && !isUploading
              ? "bg-gradient-to-r from-teal to-cyan-glow text-text-primary hover:brightness-105 shadow-md"
              : "bg-gray-100 text-text-secondary border border-gray-200"
          }`}
        >
          {isUploading ? "UPLOADING..." : "START ANALYSIS →"}
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
          <p className="text-xs text-error text-center flex items-start justify-center gap-1">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{uploadError}</span>
          </p>
        )}

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
