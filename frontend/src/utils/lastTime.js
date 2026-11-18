// "Last time" on the workout screen: what you did on this exercise before, so you are never guessing the weight.
// The server sends weights in kg; they are shown in the person's own unit.
import { getExercise } from "./exerciseCatalog"
import { fromKg } from "./units"

// The name history is saved and looked up under: the catalog name of the exercise, not the spelling a plan happens to use
// (one plan says "DB Bent Over Row", another "DB Bent Over Rows"). This matches what flattenForSave stores.
export const historyName = (item) => getExercise(item.exerciseId)?.name || item.name

const unitLabel = (unit) => (unit === "lbs" ? "lb" : "kg")

// { weight_kg, reps, best_weight_kg } -> "Last time: 45 lb × 10 · Best: 55 lb", or null when there is nothing to show
export function lastTimeText(entry, unit) {
  if (!entry) return null
  const w = fromKg(entry.weight_kg, unit)
  const reps = entry.reps
  const best = fromKg(entry.best_weight_kg, unit)
  const u = unitLabel(unit)
  let text
  if (w && reps) text = `Last time: ${w} ${u} × ${reps}`
  else if (w) text = `Last time: ${w} ${u}`
  else if (reps) text = `Last time: ${reps} reps`
  else return null
  if (w && best) text += best > w ? ` · Best: ${best} ${u}` : " · your best"
  return text
}

// The light grey numbers shown inside the empty weight and reps boxes
export function lastTimeHints(entry, unit) {
  if (!entry) return null
  const w = fromKg(entry.weight_kg, unit)
  const hints = {}
  if (w) hints.weight = String(w)
  if (entry.reps) hints.reps = String(entry.reps)
  return Object.keys(hints).length ? hints : null
}
