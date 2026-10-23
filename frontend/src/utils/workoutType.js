// What kind of session was a workout? Used for the little icons on Home's calendar.
// Worked out from the exercises that were logged (each exercise in the catalogue has a muscle group), falling back to
// the workout's name or focus label. Works on workouts from the server and on ones still waiting on the device.

import { BicepsFlexed, Dumbbell, HeartPulse } from "lucide-react"
import LegIcon from "../components/LegIcon"
import PlankIcon from "../components/PlankIcon"
import { EXERCISES } from "../data/dummyData"

const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
const UPPER = new Set(["chest", "back", "shoulders", "arms"])

export const TYPE_META = {
  upper: { label: "Upper body", Icon: BicepsFlexed, color: "#7C5CE7", tint: "rgba(124, 92, 231, 0.16)" },
  legs: { label: "Legs", Icon: LegIcon, color: "#0284C7", tint: "rgba(2, 132, 199, 0.16)" },
  full: { label: "Full body", Icon: PlankIcon, color: "#0D9488", tint: "rgba(13, 148, 136, 0.16)" },
  cardio: { label: "Cardio", Icon: HeartPulse, color: "#E11D48", tint: "rgba(225, 29, 72, 0.14)" },
  other: { label: "Workout", Icon: Dumbbell, color: "#64748B", tint: "rgba(100, 116, 139, 0.16)" },
}

const fromText = (text) => {
  const t = (text || "").toLowerCase()
  if (/cardio|run|hiit|sweat|metcon/.test(t)) return "cardio"
  if (/full[ -]?body/.test(t)) return "full"
  if (/leg|lower|squat|glute/.test(t)) return "legs"
  if (/upper|chest|back|shoulder|arm|push|pull|press|row/.test(t)) return "upper"
  return null
}

export function workoutType(workout) {
  let legs = 0, upper = 0, conditioning = 0, total = 0
  for (const ex of workout.exercises || []) {
    const e = EX[ex.exercise_id || ex.id]
    if (!e || e.category === "Mobility") continue
    total += 1
    if (e.category === "Conditioning") conditioning += 1
    if (e.muscleGroup === "legs" || e.muscleGroup === "full_body") legs += 1
    if (UPPER.has(e.muscleGroup) || e.muscleGroup === "full_body") upper += 1
  }
  if (/cardio/i.test(workout.name || "") || (total > 0 && conditioning / total >= 0.7)) return "cardio"
  if (legs + upper > 0) {
    const share = legs / (legs + upper) // 1 = all legs, 0 = all upper
    return share >= 0.7 ? "legs" : share <= 0.3 ? "upper" : "full"
  }
  return fromText(workout.name) || fromText(workout.focus_label) || fromText(workout.focusLabel) || "other"
}
