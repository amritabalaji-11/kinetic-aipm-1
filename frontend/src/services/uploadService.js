const BASE_URL = import.meta.env.VITE_API_URL || ""

// Generate a UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

async function uploadVideo(videoFile, exercise, weight, weightUnit = "kg"){
    const formData = new FormData()

    // Generate or retrieve user_id and session_id from localStorage
    let userId = localStorage.getItem('user_id')
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem('user_id', userId)
    }

    const sessionId = generateUUID()

    // Backend expects "lb" (singular) for pounds
    const normalizedUnit = weightUnit === "lbs" ? "lb" : weightUnit

    formData.append("file", videoFile)
    formData.append("exercise_name", exercise)
    formData.append("weight_value", String(weight))
    formData.append("weight_unit", normalizedUnit)
    formData.append("user_id", userId)
    formData.append("session_id", sessionId)


    const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    })

    if(!response.ok){
        const errorData = await response.json().catch(()=>{})
        let message = "Upload failed"
        if (errorData) {
            if (typeof errorData.detail === "string") {
                message = errorData.detail
            } else if (errorData.detail && typeof errorData.detail === "object") {
                message = errorData.detail.error || errorData.detail.message || JSON.stringify(errorData.detail)
            } else if (typeof errorData.message === "string") {
                message = errorData.message
            }
        }
        throw new Error(message)
    }


    const data = await response.json()

    return data.analysis_id
}

export {uploadVideo}

