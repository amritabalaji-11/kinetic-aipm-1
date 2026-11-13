// The server keeps dates as UTC text ("2026-11-12 09:00:00"). These turn them into "2 hours ago" and a readable date.
const parse = (text) => (text ? new Date(`${String(text).replace(" ", "T")}Z`) : null)

export function timeAgo(text, now = Date.now()) {
  const date = parse(text)
  if (!date || Number.isNaN(date.getTime())) return "never"
  const secs = Math.max(0, Math.round((now - date.getTime()) / 1000))
  if (secs < 60) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`
  return formatDate(text)
}

export function formatDate(text) {
  const date = parse(text)
  return !date || Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}
