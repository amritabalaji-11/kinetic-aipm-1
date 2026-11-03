import { useState } from "react"
import { ExternalLink, Play } from "lucide-react"
import { BottomSheet, DM_SANS, GRAY, PURPLE } from "./planUi"
import ExpandableVideo from "./ExpandableVideo"

// On a section that came from a video: a button that plays it inside the app (so you stay in Kinetic), and a credit to its creator.
// A creator can switch off playing inside other apps; then the button opens YouTube instead and says so.
export default function RoutineSource({ source }) {
  const [open, setOpen] = useState(false)
  if (!source?.url) return null
  const inApp = source.embeddable && source.video_id
  const who = [source.title && `“${source.title}”`, source.author && `by ${source.author}`].filter(Boolean).join(" ")
  return (
    <div style={{ marginBottom: 10 }}>
      {inApp ? (
        <button type="button" onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 44, padding: "0 14px", borderRadius: 12, border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          <Play size={16} fill={PURPLE} /> Watch the video
        </button>
      ) : (
        <a href={source.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 44, padding: "0 14px", borderRadius: 12, border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, textDecoration: "none", boxSizing: "border-box" }}>
          <ExternalLink size={16} /> Open on YouTube <span style={{ fontWeight: 500, fontSize: 11, color: GRAY }}>(leaves Kinetic)</span>
        </a>
      )}
      {who && (
        <a href={source.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6, fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, textDecoration: "none" }}>
          From {who} ↗
        </a>
      )}
      {open && (
        <BottomSheet title={source.title || "Video"} onClose={() => setOpen(false)}>
          <ExpandableVideo youtubeId={source.video_id} title={source.title || "Workout video"} />
          {who && <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "10px 0 0" }}>{who}</p>}
        </BottomSheet>
      )}
    </div>
  )
}
