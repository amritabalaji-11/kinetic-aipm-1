import { BASE_URL, apiFetch } from "./api"

// The admin pages' data. The server refuses anyone who is not an admin (403), whatever the app shows.
async function call(path) {
  let res
  try {
    res = await apiFetch(`${BASE_URL}/admin${path}`)
  } catch {
    throw Object.assign(new Error("We couldn't reach the server. Try again in a moment."), { status: 0 })
  }
  if (!res.ok) throw Object.assign(new Error(res.status === 403 ? "Admins only." : `Something went wrong (${res.status}).`), { status: res.status })
  return res.json()
}

export const getSummary = () => call("/summary")
export const getUsers = ({ q = "", limit = 30, offset = 0 } = {}) => call(`/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
export const getUser = (id) => call(`/users/${encodeURIComponent(id)}`)
export const revealEmail = (id) => call(`/users/${encodeURIComponent(id)}/email`)

export const getFeedback = ({ topic = "", status = "all", limit = 30, offset = 0 } = {}) => call(`/feedback?topic=${topic}&status=${status}&limit=${limit}&offset=${offset}`)
export const getFeedbackItem = (id) => call(`/feedback/${encodeURIComponent(id)}`)

export async function reviewFeedback(id, { reviewed = true, note = "" } = {}) {
  const res = await apiFetch(`${BASE_URL}/admin/feedback/${encodeURIComponent(id)}/review`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewed, note }),
  })
  if (!res.ok) throw Object.assign(new Error(`Something went wrong (${res.status}).`), { status: res.status })
  return res.json()
}

export const getVideos = ({ status = "all", limit = 30, offset = 0 } = {}) => call(`/videos?status=${status}&limit=${limit}&offset=${offset}`)
export const getVideoItem = (id) => call(`/videos/${encodeURIComponent(id)}`)

export async function reviewVideo(id, { verdict, note = "" }) {
  const res = await apiFetch(`${BASE_URL}/admin/videos/${encodeURIComponent(id)}/review`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict, note }),
  })
  if (!res.ok) throw Object.assign(new Error(res.status === 404 ? "This video is no longer shared." : `Something went wrong (${res.status}).`), { status: res.status })
  return res.json()
}
