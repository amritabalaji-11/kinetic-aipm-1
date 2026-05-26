const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
const UPLOAD_TIMEOUT_MS = 60_000

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

async function uploadVideo(videoFile, exercise, weight, weightUnit = "kg") {
    const formData = new FormData()

    let userId = localStorage.getItem('user_id')
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem('user_id', userId)
    }

    const sessionId = generateUUID()

    // Backend expects "lb" (singular) for pounds
    const normalizedUnit = weightUnit === "lbs" ? "lb" : weightUnit

    formData.append("file", videoFile)
    formData.append("exercise_id", exercise)
    formData.append("weight_value", String(weight))
    formData.append("weight_unit", normalizedUnit)
    formData.append("user_id", userId)
    formData.append("session_id", sessionId)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

    try {
        const response = await fetch(`${BASE_URL}/upload`, {
            method: "POST",
            body: formData,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            const errorData = await response.json().catch(() => {})
            const message = errorData?.detail || errorData?.message || "Upload failed"
            throw new Error(message)
        }

        const data = await response.json()
        return data.analysis_id
    } catch (err) {
        clearTimeout(timeoutId)
        if (err.name === "AbortError" || err instanceof TypeError) {
            const e = new Error("Upload timed out. Check your connection and try again.")
            e.code = "UPLOAD_TIMEOUT"
            throw e
        }
        throw err
    }
}

export { uploadVideo }

