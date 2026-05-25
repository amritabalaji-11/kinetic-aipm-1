const BASE_URL = import.meta.env.VITE_API_URL || "/api"

async function uploadVideo(videoFile, exercise, weight, unit = "kg") {
  const formData = new FormData()
  formData.append("file", videoFile)
  formData.append("exercise_id", exercise)
  formData.append("weight_value", String(weight))
  formData.append("weight_unit", unit)
  formData.append("user_id", "dev-user")
  formData.append("session_id", crypto.randomUUID())

  
  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",          
    body: formData,          
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.detail || errorData.message || "Upload failed"
    throw new Error(message)
  }

  const data = await response.json()
  return data.analysis_id
}

export { uploadVideo }