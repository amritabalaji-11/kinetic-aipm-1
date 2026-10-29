import { Check } from "lucide-react"

const PURPLE = "#8133FF"
const DM_SANS = "'DM Sans', sans-serif"
const FIELDS = [["weight", "Weight"], ["reps", "Reps"], ["time", "Time"]]

// Tick what to log for an exercise: weight, reps, time, in any mix. At least one stays ticked.
export default function TrackChips({ track, onChange, locked = false }) {
  const count = FIELDS.filter(([k]) => track[k]).length
  return (
    <div role="group" aria-label="What to log" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 2px" }}>
      {FIELDS.map(([key, label]) => {
        const on = !!track[key]
        const lastOne = on && count === 1
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-label={`${label}${lastOne ? " (keep at least one)" : ""}`}
            onClick={() => !lastOne && !locked && onChange({ ...track, [key]: !on })}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: "0 10px", borderRadius: 13, cursor: lastOne || locked ? "default" : "pointer",
              fontFamily: DM_SANS, fontWeight: 600, fontSize: 12,
              color: on ? PURPLE : "#64748B", background: on ? "rgba(129,51,255,0.1)" : "#fff",
              border: `1.2px solid ${on ? PURPLE : "rgba(100,116,139,0.25)"}`,
            }}
          >
            <span style={{ width: 13, height: 13, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: on ? PURPLE : "transparent", border: on ? "none" : "1.5px solid #B6BFCC" }}>
              {on && <Check size={9} color="#fff" strokeWidth={4} />}
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
