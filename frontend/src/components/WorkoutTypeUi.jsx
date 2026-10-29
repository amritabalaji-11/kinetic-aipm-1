import { Dumbbell, HeartPulse, Repeat } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK } from "./planUi"
import { WORKOUT_TYPES, workoutType } from "../utils/planProfile"

// One colour and icon per type of workout, used the same way everywhere: the filter, the plan cards and the plan itself
const TYPE_STYLE = {
  strength: { color: "#8133FF", tint: "rgba(129,51,255,0.12)", Icon: Dumbbell },
  endurance: { color: "#0891B2", tint: "rgba(8,145,178,0.13)", Icon: Repeat },
  cardio: { color: "#E11D48", tint: "rgba(225,29,72,0.11)", Icon: HeartPulse },
}

// The three cards above the body-area chips. Tap one to filter, tap it again to clear.
export function TypeFilter({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Type of workout" style={{ display: "flex", gap: 8 }}>
      {Object.entries(WORKOUT_TYPES).map(([id, t]) => {
        const { color, tint, Icon } = TYPE_STYLE[id]
        const on = value === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : id)}
            style={{
              flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left", cursor: "pointer", padding: "9px 9px 10px", borderRadius: 14,
              border: on ? `2px solid ${color}` : "1.2px solid rgba(100,116,139,0.18)",
              background: on ? `linear-gradient(${tint}, ${tint}), #fff` : "#fff",
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: 10, background: tint, color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 5, flexShrink: 0 }}>
              <Icon size={17} strokeWidth={2.2} />
            </span>
            <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 14, color: INK }}>{t.label}</span>
            <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 10.5, color: GRAY, lineHeight: 1.3, marginTop: 2 }}>{t.snippet}</span>
          </button>
        )
      })}
    </div>
  )
}

// Small round badge for the corner of a plan's picture
export function TypeBadge({ plan }) {
  const id = workoutType(plan)
  const { color, Icon } = TYPE_STYLE[id]
  return (
    <span aria-hidden="true" style={{ position: "absolute", left: -6, top: -6, width: 24, height: 24, borderRadius: 12, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
      <Icon size={13} strokeWidth={2.4} />
    </span>
  )
}

// Icon plus the type's name, e.g. "Strength"
export function TypePill({ plan, size = 11 }) {
  const id = workoutType(plan)
  const { color, tint, Icon } = TYPE_STYLE[id]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 6px", borderRadius: 10, background: tint, color, fontFamily: DM_SANS, fontSize: size, fontWeight: 700 }}>
      <Icon size={size + 1} strokeWidth={2.4} /> {WORKOUT_TYPES[id].label}
    </span>
  )
}
