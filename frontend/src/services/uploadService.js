const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

async function uploadVideo(videoFile, exercise, weight){
    const formData = new FormData()

    formData.append("file", videoFile)
    formData.append("exercise", exercise)
    formData.append("weight", String(weight))

    const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    })

    if(!response.ok){
        const errorData = await response.json().catch(() => ({}))
        const message = errorData.detail || errorData.message || "Upload failed"

        throw new Error(message)
    }


    const data = await response.json()

    return data.analysis_id
}

export { uploadVideo }