import { useState } from "react"
import { ChevronDown, Target } from "lucide-react"
import { sectionGuidance } from "../utils/setTypes"

const PURPLE = "#8133FF"
const DM_SANS = "'DM Sans', sans-serif"

// What a section is for and what is expected of you. On the logging screen it is shown in full;
// on the planner screen (`collapsible`) it is one line that opens to the rest, since a plan has many sections.
export default function GoalNote({ block, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible)
  const g = sectionGuidance(block)
  if (!g) return null
  const body = (
    <div style={{ fontFamily: DM_SANS, fontSize: collapsible ? 12 : 13, lineHeight: 1.45, color: "#0F172A", flex: 1, minWidth: 0, textAlign: "left" }}>
      <div><b>Goal:</b> {g.objective}</div>
      {open && <div style={{ marginTop: 3 }}>{g.expect}</div>}
    </div>
  )
  const box = { display: "flex", gap: 10, padding: collapsible ? "8px 10px" : "10px 12px", marginBottom: collapsible ? 6 : 10, borderRadius: 12, background: "#F5F3FF", border: "1px solid rgba(129,51,255,0.25)" }
  if (!collapsible) {
    return <div style={box}><Target size={18} color={PURPLE} style={{ flexShrink: 0, marginTop: 1 }} />{body}</div>
  }
  return (
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ ...box, width: "100%", cursor: "pointer", alignItems: "flex-start" }}>
      <Target size={16} color={PURPLE} style={{ flexShrink: 0, marginTop: 1 }} />
      {body}
      <ChevronDown size={16} color={PURPLE} style={{ flexShrink: 0, marginTop: 1, transform: open ? "rotate(180deg)" : "none" }} />
    </button>
  )
}
