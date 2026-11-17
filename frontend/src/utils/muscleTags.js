// The little tag on each exercise: how big the muscles are (so how heavy and how many reps make sense), or "power" for explosive moves.
// Worked out from the catalogue: a compound lift is "big muscles", an isolation move is "small muscle", and a short hand-picked list is "power".
// Conditioning and mobility moves get no tag.
import { getExercise } from "./exerciseCatalog"

// KB Swing, the three push presses, Jump Squat, Box Jump, Vertical Jump, Lateral Bound and the three Pogo Jumps
export const POWER_IDS = new Set(["ex_042", "ex_043", "ex_164", "ex_183", "ex_086", "ex_104", "ex_140", "ex_151", "ex_063", "ex_084", "ex_137"])

const GROUP = { legs: "Legs", chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", core: "Core", full_body: "Full body" }
const WORDS = { big: "big muscles", small: "small muscle", power: "power" }

// { kind: "big" | "small" | "power", group, label } or null when the exercise gets no tag
export function muscleTag(exerciseId) {
  const ex = exerciseId ? getExercise(exerciseId) : null
  if (!ex) return null
  const kind = POWER_IDS.has(ex.id) ? "power" : ex.category === "Compound" ? "big" : ex.category === "Isolation" ? "small" : null
  if (!kind) return null
  const group = GROUP[ex.muscleGroup] ?? "Body"
  return { kind, group, label: `${group} · ${WORDS[kind]}` }
}

// Is this section mostly power moves? (half or more of its tagged exercises)
export function isPowerSection(items = []) {
  const tags = items.filter((it) => !it.rest).map((it) => muscleTag(it.exerciseId)).filter(Boolean)
  return tags.length > 0 && tags.filter((t) => t.kind === "power").length / tags.length >= 0.5
}

export const hasAnyTag = (items = []) => items.some((it) => !it.rest && muscleTag(it.exerciseId))
