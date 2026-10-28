// Small helpers for the Upload screen's time estimates.
export const MB = 1024 * 1024
export const BIG_UNSHRUNK_BYTES = 40 * MB // above this, a video that could not be shrunk gets a warning

// A rough guess of how long sending `bytes` will take. Upload is usually slower than download, so assume about a third
// of the download speed the browser reports (Chrome and Android only). When it will not say, assume about 4 Mbps.
export function guessUploadSeconds(bytes) {
  const downlink = typeof navigator !== "undefined" ? navigator.connection?.downlink : undefined
  const mbps = downlink ? Math.min(Math.max(downlink / 3, 1), 25) : 4
  return (bytes * 8) / (mbps * 1e6)
}

export function durationText(seconds) {
  if (seconds < 10) return "a few seconds"
  if (seconds < 90) return `about ${Math.round(seconds / 5) * 5} seconds`
  const minutes = Math.round(seconds / 60)
  return `about ${minutes} minute${minutes === 1 ? "" : "s"}`
}

// The filming tips start open; once someone has uploaded a video they start folded down to one line
const TIPS_SEEN_KEY = "uploadTipsSeen"
export const hasSeenTips = () => { try { return localStorage.getItem(TIPS_SEEN_KEY) === "1" } catch { return false } }
export const markTipsSeen = () => { try { localStorage.setItem(TIPS_SEEN_KEY, "1") } catch { /* private mode: skip */ } }
