import { BASE_URL, apiFetch } from "./api"

// What the server says is wrong comes back as { code, message }; the screens pick the wording from the code.
async function call(path, options = {}) {
  let res
  try {
    res = await apiFetch(`${BASE_URL}${path}`, { headers: { "Content-Type": "application/json" }, ...options })
  } catch {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false
    throw Object.assign(new Error(offline ? "You're offline. Connect to read a video." : "We couldn't reach the server. Try again in a moment."), { code: offline ? "offline" : "network" })
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const d = body.detail
    throw Object.assign(new Error((d && d.message) || (typeof d === "string" ? d : `Something went wrong (${res.status})`)), { code: (d && d.code) || `http_${res.status}` })
  }
  return res.json()
}

// Reads a video's words and builds a routine. Slow (a few seconds to a minute), so it gets a long time limit.
export const readVideo = (url, signal) => call("/routines/from-video", { method: "POST", body: JSON.stringify({ url }), timeoutMs: 120000, signal })

export const listRoutines = () => call("/routines")
export const saveRoutine = (routine) => call("/routines", { method: "POST", body: JSON.stringify({ routine }) })
export const deleteRoutine = (id) => call(`/routines/${id}`, { method: "DELETE" })
