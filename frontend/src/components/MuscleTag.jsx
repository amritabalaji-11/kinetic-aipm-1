import { Lightbulb, Zap } from "lucide-react"
import { DM_SANS, PURPLE } from "./planUi"

// The tag after an exercise's name. It looks like a button because it is one: tapping it opens "Why these reps?" under the exercise.
export function Dots({ kind, color }) {
  if (kind === "power") return <Zap size={12} color={color} fill={color} />
  const lit = kind === "big" ? 3 : 1
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
      {[0, 1, 2].map((i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 3, background: color, opacity: i < lit ? 1 : 0.25, display: "block" }} />)}
    </span>
  )
}

export default function MuscleTag({ tag, open, onClick, leftGap = 6 }) {
  const fg = open ? "#fff" : "#4C1D95"
  return (
    <button type="button" aria-expanded={open} onClick={onClick} aria-label={`${tag.label}. Tap to see why these reps.`}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap", marginLeft: leftGap, verticalAlign: "middle", padding: "3px 9px 3px 4px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 11.5, color: fg,
        background: open ? PURPLE : "#fff", border: `1.2px solid ${open ? PURPLE : "rgba(129,51,255,0.45)"}`, boxShadow: open ? "none" : "0 1px 2px rgba(129,51,255,0.18)" }}>
      <span style={{ width: 17, height: 17, borderRadius: 9, background: open ? "#fff" : PURPLE, color: open ? PURPLE : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Lightbulb size={10} strokeWidth={2.6} /></span>
      <Dots kind={tag.kind} color={fg} />
      {tag.label}
    </button>
  )
}
