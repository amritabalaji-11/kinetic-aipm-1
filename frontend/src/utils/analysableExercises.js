import { EXERCISES, MUSCLE_GROUPS } from "../data/dummyData"
import { equipmentLabel } from "./exerciseCatalog"

// Movements the AI form check is built for. The backend prompts, joint angles and scoring are written per movement
// (today only the goblet squat), so a video of anything else would be judged against the wrong movement.
// Add a movement id here only once the backend can analyse it.
export const AI_READY_MOVEMENTS = new Set(["goblet-squat"])

export const isAiReady = (exercise) => AI_READY_MOVEMENTS.has(exercise.movement)

// Body areas for the picker. Counts come from the catalogue (an exercise counts for every area it works).
export const BODY_AREAS = MUSCLE_GROUPS.map((g) => ({
  id: g.id,
  name: g.name,
  count: EXERCISES.filter((e) => e.groups.includes(g.id)).length,
}))

// Exercises to show for the picker: the chosen area (or the whole catalogue while searching), narrowed by the
// search text and the equipment chip. Ready-to-analyse ones come first, then A to Z.
export function pickerExercises({ area, query, equipment }) {
  const q = query.trim().toLowerCase()
  return EXERCISES
    .filter((e) => (q ? true : area ? e.groups.includes(area) : false))
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.movement.replace(/-/g, " ").includes(q))
    .filter((e) => equipment === "all" || e.equipment === equipment)
    .sort((a, b) => Number(isAiReady(b)) - Number(isAiReady(a)) || a.name.localeCompare(b.name))
}

// Equipment chips that actually have exercises in the current list, e.g. ["dumbbell", "bodyweight"]
export function equipmentOptions({ area, query }) {
  const present = new Set(pickerExercises({ area, query, equipment: "all" }).map((e) => e.equipment))
  return [...present].sort((a, b) => equipmentLabel({ equipment: a }).localeCompare(equipmentLabel({ equipment: b })))
}
