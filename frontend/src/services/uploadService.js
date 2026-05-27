const BASE_URL = import.meta.env.VITE_API_URL || "/api"

const sleep = (ms) => new Promise(res => setTimeout(res, ms))

function buildFormData(videoFile, exercise, weight, unit) {
  const formData = new FormData()
  formData.append("file", videoFile)
  formData.append("exercise_id", exercise)
  formData.append("weight_value", String(weight))
  formData.append("weight_unit", unit)
  formData.append("user_id", "dev-user")
  formData.append("session_id", crypto.randomUUID())
  return formData
}

async function uploadVideo(videoFile, exercise, weight, unit = "kg") {
  const MAX_RETRIES = 3
  const RETRY_DELAYS = [2000, 4000, 6000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      body: buildFormData(videoFile, exercise, weight, unit),
    })

    if (response.ok) {
      const data = await response.json()
      return data.analysis_id
    }

    if (response.status === 503 && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[attempt])
      continue
    }

    const errorData = await response.json().catch(() => ({}))
    const message = errorData.detail || errorData.message || "Upload failed"
    throw new Error(message)
  }
}

export { uploadVideo }