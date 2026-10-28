import { apiFetch } from "./api"

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

    let userId = localStorage.getItem('active_user_id')
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem('active_user_id', userId)
       // localStorage.setItem('user_id', userId)
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

    try {
        const response = await apiFetch(`${BASE_URL}/upload`, {
            method: "POST",
            body: formData,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.status === 413) throw new Error("That video is too big to send. Try a shorter clip.")
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

// ---------------------------------------------------------------------------
// Big videos: straight to storage
// ---------------------------------------------------------------------------
// The server hands out a one-use upload address; the browser sends the file there in pieces (so a dropped
// connection only repeats one piece), then tells the server it is done. This avoids Cloud Run's 32 MB request
// limit and its timeouts.

const CHUNK_BYTES = 8 * 1024 * 1024 // must be a multiple of 256 KiB
const LEGACY_LIMIT_BYTES = 30 * 1024 * 1024 // what the old one-request upload can still carry
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function userIdForUpload() {
    let userId = localStorage.getItem("active_user_id")
    if (!userId) {
        userId = generateUUID()
        localStorage.setItem("active_user_id", userId)
    }
    return userId
}

async function jsonOrNull(response) {
    return response.json().catch(() => null)
}

function errorFrom(data, fallback) {
    const detail = data?.detail
    return new Error((typeof detail === "string" ? detail : null) || data?.message || fallback)
}

// Bytes the bucket already has for this upload, or null when it can't be read
async function committedBytes(url, total, signal) {
    try {
        const res = await fetch(url, { method: "PUT", headers: { "Content-Range": `bytes */${total}` }, signal })
        if (res.ok) return total
        const range = res.headers.get("Range") // "bytes=0-8388607"
        if (res.status === 308) return range ? Number(range.split("-")[1]) + 1 : 0
    } catch { /* fall through */ }
    return null
}

async function sendInPieces(url, file, onProgress, signal) {
    let offset = 0
    while (offset < file.size) {
        const end = Math.min(offset + CHUNK_BYTES, file.size)
        for (let attempt = 0; ; attempt++) {
            try {
                const res = await fetch(url, {
                    method: "PUT",
                    body: file.slice(offset, end),
                    headers: { "Content-Range": `bytes ${offset}-${end - 1}/${file.size}` },
                    signal,
                })
                if (res.status === 308 || res.ok) break // 308 = send the next piece, 200/201 = that was the last one
                throw Object.assign(new Error("Upload failed"), { retryable: res.status >= 500 || res.status === 429 })
            } catch (err) {
                if (signal?.aborted || err.retryable === false || attempt >= 4) throw err
                await sleep(1000 * (attempt + 1))
                const stored = await committedBytes(url, file.size, signal)
                if (stored !== null && stored > offset) { offset = Math.min(stored, end); if (offset === end) break }
            }
        }
        offset = end
        onProgress(offset / file.size)
    }
}

// onProgress(fraction 0..1) while the file is being sent. Resolves with the analysis id, like uploadVideo.
async function uploadVideoDirect(videoFile, exercise, weight, weightUnit = "kg", { onProgress = () => {}, signal } = {}) {
    const response = await apiFetch(`${BASE_URL}/upload/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: userIdForUpload(),
            filename: videoFile.name,
            content_type: videoFile.type || "video/mp4",
            size_bytes: videoFile.size,
            exercise_name: exercise,
            weight_value: weight,
            weight_unit: weightUnit === "lbs" ? "lb" : weightUnit,
            session_id: generateUUID(),
        }),
        signal,
    })
    // The server does not have the big-video upload yet (the website can be updated a few minutes before it):
    // send small files the old way, and say so plainly for big ones.
    if (response.status === 404 || response.status === 405) {
        if (videoFile.size <= LEGACY_LIMIT_BYTES) return uploadVideo(videoFile, exercise, weight, weightUnit)
        throw new Error("Large video uploads are being switched on. Please try again in a few minutes, or use a shorter clip.")
    }
    if (!response.ok) throw errorFrom(await jsonOrNull(response), "Upload failed")
    const { analysis_id: analysisId, upload_url: uploadUrl } = await response.json()

    try {
        await sendInPieces(uploadUrl, videoFile, onProgress, signal)
    } catch (err) {
        if (signal?.aborted) throw err
        // storage could not be reached from this browser at all: a small file can still go the old way
        if (err instanceof TypeError && videoFile.size <= LEGACY_LIMIT_BYTES) {
            return uploadVideo(videoFile, exercise, weight, weightUnit)
        }
        const e = new Error("The upload was interrupted. Check your connection and try again.")
        e.code = "UPLOAD_TIMEOUT"
        throw e
    }

    const done = await apiFetch(`${BASE_URL}/upload/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId }),
        signal,
    })
    if (!done.ok) throw errorFrom(await jsonOrNull(done), "Could not start the analysis")
    return analysisId
}

export { uploadVideo, uploadVideoDirect }

