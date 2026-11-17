import { DM_SANS, GRAY } from "./planUi"
import { Dots } from "./MuscleTag"
import { muscleTag } from "../utils/muscleTags"

const LINES = { big: "Big muscle group: go heavier, rest longer", small: "Small muscle: moderate weight, more reps", power: "Power: speed over load" }

// The key under a section: only the kinds of tag that appear in it
export default function TagLegend({ items }) {
  const kinds = ["big", "small", "power"].filter((k) => items.some((it) => !it.rest && muscleTag(it.exerciseId)?.kind === k))
  if (kinds.length === 0) return null
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(100,116,139,0.18)", display: "flex", flexDirection: "column", gap: 4 }}>
      {kinds.map((k) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: DM_SANS, fontSize: 11.5, color: GRAY }}><Dots kind={k} color="#8133FF" /> {LINES[k]}</span>
      ))}
    </div>
  )
}
