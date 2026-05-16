const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

async function uploadVideo(videoFile, exerciseId, weightValue, weightUnit) {
  const formData = new FormData()

  formData.append("file", videoFile)
  formData.append("exercise_id", exerciseId)
  formData.append("weight_value", String(weightValue))
  formData.append("weight_unit", weightUnit === "lbs" ? "lb" : "kg")

  let userId = sessionStorage.getItem("kinetic_user_id")
  if (!userId) {
    userId = crypto.randomUUID()
    sessionStorage.setItem("kinetic_user_id", userId)
  }
  formData.append("user_id", userId)
  formData.append("session_id", crypto.randomUUID())

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.detail || errorData.message || "Upload failed"

    throw new Error(typeof message === "string" ? message : JSON.stringify(message))
  }

  const data = await response.json()

  return data.analysis_id
}

export { uploadVideo }
