import { EXERCISES, MUSCLE_GROUPS } from "../data/dummyData"

export const GROUP_LABEL = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.id, g.name]))
export const EQUIPMENT_LABEL = {
  barbell: "Barbell", dumbbell: "Dumbbell", kettlebell: "Kettlebell",
  bodyweight: "Bodyweight", cable: "Cable", machine: "Machine", other: "Other",
}

export const getExercise = (id) => EXERCISES.find((e) => e.id === id) ?? null
export const equipmentLabel = (ex) => EQUIPMENT_LABEL[ex.equipment] ?? ex.equipment

// Everything the swap sheet can offer for an exercise
export function swapChoices(currentId, planAlternativeIds = []) {
  const current = getExercise(currentId)
  if (!current) return { inPlan: [], sameMovement: [], sameGroup: [] }
  const used = new Set([currentId])
  const take = (list) => list.filter((e) => e && !used.has(e.id) && (used.add(e.id), true))
  const inPlan = take(planAlternativeIds.map(getExercise))
  const sameMovement = take(EXERCISES.filter((e) => e.movement === current.movement))
  const sameGroup = take(EXERCISES.filter((e) => e.muscleGroup === current.muscleGroup))
  return { current, inPlan, sameMovement, sameGroup }
}
