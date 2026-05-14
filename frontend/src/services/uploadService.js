const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// Generate a UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

async function uploadVideo(videoFile, exercise, weight){
    const formData = new FormData()

    // Generate or retrieve user_id and session_id from localStorage
    let userId = localStorage.getItem('user_id')
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem('user_id', userId)
    }

    const sessionId = generateUUID()

    formData.append("file", videoFile)
    formData.append("exercise_id", exercise)
    formData.append("weight_value", String(weight))
    formData.append("weight_unit", "lb")
    formData.append("user_id", userId)
    formData.append("session_id", sessionId)

    const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    })

    if(!response.ok){
        const errorData = await response.json().catch(()=>{})

        const message = errorData.detail || errorData.message || "Upload failed"

        throw new Error(message)
    }


    const data = await response.json()

    return data.analysis_id
}

export {uploadVideo}