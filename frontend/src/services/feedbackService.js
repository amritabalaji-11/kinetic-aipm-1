import { BASE_URL, apiFetch } from "./api"
import { sendInPieces } from "./uploadService"

export const TOPICS = [
  { id: "bug", label: "Bug" },
  { id: "idea", label: "Idea" },
  { id: "form", label: "Form feedback" },
  { id: "other", label: "Other" },
]
export const MAX_FILES = 3
export const MAX_IMAGE_MB = 10
export const MAX_VIDEO_MB = 100
export const MAX_MESSAGE = 2000

const mb = (bytes) => bytes / (1024 * 1024)

// Says what is wrong with a chosen file, or null when it is fine (the server checks again)
export function fileProblem(file) {
  const image = /^image\/(jpeg|png|webp|heic)$/.test(file.type)
  const video = /^video\/(mp4|quicktime|webm)$/.test(file.type)
  if (!image && !video) return `${file.name} can't be attached. Photos (JPEG, PNG, WebP, HEIC) and videos (MP4, MOV, WebM) only.`
  if (image && mb(file.size) > MAX_IMAGE_MB) return `${file.name} is too big. Photos can be up to ${MAX_IMAGE_MB} MB.`
  if (video && mb(file.size) > MAX_VIDEO_MB) return `${file.name} is too big. Videos can be up to ${MAX_VIDEO_MB} MB.`
  return null
}

async function post(path, body) {
  let res
  try {
    res = await apiFetch(`${BASE_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.detail
    throw new Error(typeof detail === "string" ? detail : res.status === 429 ? "Demo accounts can't send feedback. Sign in with your own account." : `Something went wrong (${res.status}). Please try again.`)
  }
  return data
}

// topic, message, files (File objects), includeAnalysis, onProgress(fraction 0..1) while files are sent
export async function sendFeedback({ topic, message, files = [], includeAnalysis = false, onProgress = () => {} }) {
  let feedbackId = crypto.randomUUID()
  let uploaded = []
  if (files.length) {
    const start = await post("/feedback/start", { files: files.map((f) => ({ filename: f.name, content_type: f.type, size_bytes: f.size })) })
    feedbackId = start.feedback_id
    const total = files.reduce((n, f) => n + f.size, 0)
    let done = 0
    for (let i = 0; i < files.length; i++) {
      await sendInPieces(start.uploads[i].upload_url, files[i], (fraction) => onProgress((done + files[i].size * fraction) / total))
      done += files[i].size
      uploaded.push({ path: start.uploads[i].path, content_type: files[i].type })
    }
  }
  await post("/feedback", {
    feedback_id: feedbackId, topic, message, files: uploaded, include_latest_analysis: includeAnalysis,
    app_info: { page: window.location.pathname, device: navigator.userAgent.slice(0, 150), screen: `${window.innerWidth}x${window.innerHeight}` },
  })
}

// How many messages this person has sent, or null when we can't tell (the Home card then stays quiet)
export async function myFeedbackCount() {
  try {
    const res = await apiFetch(`${BASE_URL}/feedback/mine`)
    return res.ok ? (await res.json()).count : null
  } catch {
    return null
  }
}
