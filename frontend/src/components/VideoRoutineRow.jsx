import { Star } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { previewOf } from "../utils/videoLink"

const minutesText = (r) => [`${r.steps.length} moves`, r.total_minutes ? `${r.total_minutes} min` : null].filter(Boolean).join(" · ")

// One video routine in a list: its picture, name, who made it, and a star to keep it (or take it back out). Tapping the row opens it.
export default function VideoRoutineRow({ routine, saved, onOpen, onToggle }) {
  const picture = previewOf(routine.source?.url)?.small[0]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14, padding: 8, marginBottom: 8 }}>
      <button type="button" onClick={onOpen} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 84, height: 48, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)" }}>
          {picture && <img src={picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none" }} />}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, color: INK }}>{routine.title}</span>
          {routine.follow_only && <span style={{ display: "inline-block", marginTop: 2, padding: "1px 7px", borderRadius: 8, background: "#EDE9FE", color: "#6D28D9", fontFamily: DM_SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.03em" }}>FOLLOW ALONG</span>}
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, marginTop: 2 }}>{[routine.source?.author, routine.follow_only ? "follow along" : minutesText(routine)].filter(Boolean).join(" · ")}</span>
        </span>
      </button>
      <button type="button" onClick={onToggle} aria-pressed={saved} aria-label={saved ? `Take ${routine.title} out of my workouts` : `Save ${routine.title} to my workouts`}
        style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: saved ? PURPLE : "#fff", border: `1.3px solid ${saved ? PURPLE : "rgba(129,51,255,0.45)"}` }}>
        <Star size={17} color={saved ? "#fff" : PURPLE} fill={saved ? "#fff" : "none"} />
      </button>
    </div>
  )
}
