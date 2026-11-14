import Model from "react-body-highlighter"
import { CircleDot, Dumbbell, PersonStanding, Settings2 } from "lucide-react"

const PURPLE = "#8133ff"
const BODY = "#D6D3E8"

// The little body diagram from the muscle map, with just this group lit up
const GROUP_VIEW = {
  legs: ["anterior", ["quadriceps", "adductor", "calves"]],
  back: ["posterior", ["upper-back", "lower-back", "trapezius"]],
  shoulders: ["anterior", ["front-deltoids", "trapezius"]],
  chest: ["anterior", ["chest"]],
  arms: ["anterior", ["biceps", "forearm"]],
  core: ["anterior", ["abs", "obliques"]],
  full_body: ["anterior", ["chest", "abs", "quadriceps", "front-deltoids", "biceps"]],
}

export function MuscleIcon({ group, active, height = 30 }) {
  const [type, muscles] = GROUP_VIEW[group] ?? GROUP_VIEW.full_body
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", width: Math.round(height * 0.5), height, flexShrink: 0 }}>
      <Model type={type} data={[{ name: group, muscles }]} bodyColor={active ? "rgba(255,255,255,0.45)" : BODY} highlightedColors={[active ? "#FFFFFF" : PURPLE]} style={{ width: "100%" }} svgStyle={{ width: "100%", height: "100%" }} />
    </span>
  )
}

const Kettlebell = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 7.5C8.5 3.5 15.5 3.5 15.5 7.5" /><path d="M6 20a7 7 0 1 1 12 0z" transform="translate(0 -1)" />
  </svg>
)
const Barbell = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12h20M5 7v10M8 9v6M16 9v6M19 7v10" />
  </svg>
)

export function EquipmentIcon({ equipment, size = 20 }) {
  switch (equipment) {
    case "dumbbell": return <Dumbbell size={size} aria-hidden="true" />
    case "kettlebell": return <Kettlebell size={size} />
    case "barbell": return <Barbell size={size} />
    case "bodyweight": return <PersonStanding size={size} aria-hidden="true" />
    case "machine": case "cable": return <Settings2 size={size} aria-hidden="true" />
    default: return <CircleDot size={size} aria-hidden="true" />
  }
}
