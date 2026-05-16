import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, CheckCircle, AlertCircle } from "lucide-react"
import { uploadVideo } from "../services/uploadService"
// Dummy exercise list — will swap for Rayburn's S1-W5-04 fixtures later.
// Per acceptance criteria: show multiple options but only Goblet Squat is enabled for MVP.
const EXERCISES = [
  { id: "goblet-squat", name: "Goblet Squat", enabled: true },
  { id: "deadlift", name: "Deadlift", enabled: false },
  { id: "bench-press", name: "Bench Press", enabled: false },
  { id: "overhead-press", name: "Overhead Press", enabled: false },
]

// File constraints
const MAX_FILE_SIZE_MB = 100
const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm"]
const ACCEPTED_EXTENSIONS = ".mp4, .mov, .webm"

function UploadScanPage() {
  const navigate = useNavigate()

  // Form state — one piece of state per input field
  const [exercise, setExercise] = useState("")
  const [weight, setWeight] = useState("")
  const [videoFile, setVideoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  // Validation/error state
  const [weightTouched, setWeightTouched] = useState(false)
  const [fileError, setFileError] = useState("")

  // Form is valid only when all three required fields are filled
  const isFormValid = exercise && weight && videoFile && !fileError

  // Show weight error only if user has interacted with the field but it's empty
  const showWeightError = weightTouched && !weight

  // Handle file selection — validates format and size
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    // Reset previous errors
    setFileError("")

    // Format check
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setFileError(
        `Unsupported format. Please upload a video file (${ACCEPTED_EXTENSIONS}).`
      )
      setVideoFile(null)
      return
    }

    // Size check
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(
        `File too large (${fileSizeMB.toFixed(1)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`
      )
      setVideoFile(null)
      return
    }

    setVideoFile(file)
  }

  // Handle submit — currently just logs and navigates to the loading page
  // Real /upload API call will be wired up in W6
  async function handleSubmit() {
  if (!isFormValid || isUploading) return

  setUploadError("")
  setIsUploading(true)

  try {
    // Create a preview URL from the video file so LoadingPage
    // can show the video thumbnail at the top of the screen
    const videoPreviewUrl = URL.createObjectURL(videoFile)

    // Send the video to the backend — get back the tracking ID
    const analysisId = await uploadVideo(videoFile, exercise, Number(weight))

    // Go to loading screen and pass the tracking ID + video preview
    navigate("/upload/loading", {
      state: { analysisId, videoPreviewUrl, exercise }
    })

  } catch (err) {
    setUploadError(err.message || "Upload failed. Please try again.")

  } finally {
    setIsUploading(false)
  }
}

  return (
    <div className="min-h-screen bg-light-bg p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-heading-1 text-text-primary mb-6">New Upload</h1>

        {/* ───────── Exercise Selector ───────── */}
        <section className="mb-6">
          <label className="block text-body font-medium text-text-primary mb-2">
            Exercise
          </label>
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="w-full h-12 px-3 bg-white border border-gray-200 rounded-lg text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Select an exercise...</option>
            {EXERCISES.map((ex) => (
              <option
                key={ex.id}
                value={ex.id}
                disabled={!ex.enabled}
              >
                {ex.name}{!ex.enabled ? " (coming soon)" : ""}
              </option>
            ))}
          </select>
        </section>

        {/* ───────── Weight Input ───────── */}
        <section className="mb-6">
          <label className="block text-body font-medium text-text-primary mb-2">
            Weight (lbs) <span className="text-error">*</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => setWeightTouched(true)}
            placeholder="e.g. 45"
            className={`w-full h-12 px-3 bg-white border rounded-lg text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              showWeightError ? "border-error" : "border-gray-200"
            }`}
          />
          {showWeightError && (
            <p className="text-xs text-error mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              Weight is required
            </p>
          )}
        </section>

        {/* ───────── Filming Tips (inline, not a separate screen) ───────── */}
        <section className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-heading-2 text-text-primary mb-3">
            Filming Tips
          </h2>
          {/* Replace src below with an actual goblet squat reference image */}
          <img
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"
            alt="Goblet squat camera angle reference"
            className="w-full rounded-md mb-3 aspect-video object-cover bg-gray-100"
          />
          <ul className="text-body text-text-teritary space-y-1.5 list-disc list-inside">
            <li>Stand camera <strong>6–8 feet away</strong> from you</li>
            <li>Position camera at <strong>hip height</strong></li>
            <li>Film from the <strong>side angle</strong> (not front or back)</li>
            <li>Make sure your <strong>full body is in frame</strong> at the bottom of the squat</li>
          </ul>
        </section>

        {/* ───────── Video File Picker ───────── */}
        <section className="mb-6">
          <label className="block text-body font-medium text-text-primary mb-2">
            Upload Video <span className="text-error">*</span>
          </label>

          <label
            htmlFor="video-upload"
            className="flex flex-col items-center justify-center w-full min-h-[120px] px-4 py-6 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors"
          >
            {videoFile ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={20} />
                <span className="text-body font-medium text-text-primary truncate max-w-[250px]">
                  {videoFile.name}
                </span>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-gray-400 mb-2" />
                <span className="text-body text-text-teritary">
                  Tap to select a video
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  {ACCEPTED_EXTENSIONS} · max {MAX_FILE_SIZE_MB}MB
                </span>
              </>
            )}
          </label>

          <input
            id="video-upload"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {fileError && (
            <p className="text-xs text-error mt-2 flex items-start gap-1">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </section>

        {/* ───────── Submit Button ───────── */}
        
         {uploadError && (
          <p className="text-xs text-error mb-3 flex items-center gap-1">
            <AlertCircle size={14} />
            {uploadError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || isUploading}
          className={`w-full h-12 rounded-lg text-button transition-colors ${
            isFormValid && !isUploading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isUploading ? "Uploading..." : "Start Analysis →"}
        </button>
      </div>
    </div>
  )
}
export default UploadScanPage