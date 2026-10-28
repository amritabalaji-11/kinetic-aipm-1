import { useState } from "react"
import { ArrowUpDown, ChevronDown, Contrast, Lightbulb, MoveHorizontal, PersonStanding } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"
import { hasSeenTips } from "../utils/uploadHelp"

// Four quick checks for filming, as tiles you can take in at a glance. Tap a tile to see why it matters.
// Once someone has uploaded a video, the section folds down to a single line (they know the drill) but stays one tap away.
const TIPS = [
  { Icon: PersonStanding, label: "Angle", value: "Side-on", why: "The AI needs to see your spine and joint angles clearly." },
  { Icon: MoveHorizontal, label: "Distance", value: "6–8 ft away", why: "Keep your whole body in the frame, even at the bottom of the squat." },
  { Icon: ArrowUpDown, label: "Phone height", value: "Hip height", why: "A phone on the floor distorts how deep the squat looks." },
  { Icon: Contrast, label: "Clothes", value: "Stand out", why: "Wear something that contrasts with the wall, for example not black leggings on a black wall." },
]

export default function FilmingTips({ exerciseName }) {
  const [open, setOpen] = useState(() => !hasSeenTips())
  const [picked, setPicked] = useState(null)
  const [example, setExample] = useState(false)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded="false" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", marginBottom: 16, borderRadius: 16, border: "1px solid #E5E7EB", background: "#FFFFFF", cursor: "pointer", textAlign: "left" }}>
        <Lightbulb size={16} color={PURPLE} />
        <span style={{ flex: 1, fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, color: INK }}>Filming tips <span style={{ fontWeight: 400, color: GRAY }}>· side-on, 6–8 ft, hip height</span></span>
        <ChevronDown size={16} color={GRAY} />
      </button>
    )
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>Film it like this</p>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: 0 }}>4 quick checks for your {exerciseName}</p>
        </div>
        {hasSeenTips() && (
          <button type="button" onClick={() => setOpen(false)} style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, background: "none", border: "none", cursor: "pointer" }}>Hide</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {TIPS.map((t, i) => {
          const on = picked === i
          return (
            <button key={t.label} type="button" aria-pressed={on} onClick={() => setPicked(on ? null : i)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", textAlign: "left", borderRadius: 14, cursor: "pointer", background: on ? "rgba(129,51,255,0.08)" : "#F8F7FD", border: on ? `1.5px solid ${PURPLE}` : "1.5px solid transparent" }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <t.Icon size={18} color="#FFFFFF" />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.label}</span>
                <span style={{ display: "block", fontFamily: BRICOLAGE, fontSize: 14, fontWeight: 700, color: INK, lineHeight: 1.2 }}>{t.value}</span>
              </span>
            </button>
          )
        })}
      </div>

      <p style={{ fontFamily: DM_SANS, fontSize: 12, color: picked === null ? GRAY : INK, lineHeight: 1.45, margin: "10px 2px 0", minHeight: 18 }}>
        {picked === null ? "Tap a tile to see why it matters." : TIPS[picked].why}
      </p>

      <button type="button" onClick={() => setExample(!example)} style={{ marginTop: 6, fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        {example ? "Hide example" : "See a good vs bad example"}
      </button>
      {example && <img src="/angle.png" alt="Good versus bad squat form" style={{ width: "100%", borderRadius: 10, marginTop: 8, objectFit: "contain", maxHeight: 190 }} onError={(e) => { e.currentTarget.style.display = "none" }} />}
    </div>
  )
}
