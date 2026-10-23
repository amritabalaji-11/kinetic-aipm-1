// Starting a workout is two steps: "confirm" (the plan is chosen; the commit screen opens) and "begin" (START WORKOUT is
// pressed; the logging screen opens and the workout clock starts).
const FOCUS_LABEL = {
  chest: "Chest", back: "Back", legs: "Legs",
  shoulders: "Shoulders", arms: "Arms", core: "Core", full_body: "Full Body",
}

// blocks: from blocksFromPlanner() or blocksFromBuilder() in ./workoutModel
export function buildActiveWorkout({ blocks, muscles = [], presetTitle = null }) {
  const now = Date.now()
  return {
    id: now,
    startDate: new Date().toLocaleDateString(),
    startTime: new Date().toLocaleTimeString(),
    muscles,
    presetTitle,
    blocks,
    focusLabel: muscles.length === 1 ? FOCUS_LABEL[muscles[0]] ?? "Mixed" : muscles.length > 1 ? "Mixed" : "General",
    status: "active",
  }
}

// Step 1: keep the chosen workout as a draft and open the commit screen. `minutes` is only shown on that screen.
export function confirmWorkout(navigate, { minutes = null, ...options }) {
  const draft = { ...buildActiveWorkout(options), minutes }
  localStorage.setItem("draftWorkout", JSON.stringify(draft))
  navigate("/workout/commit")
}

export function readDraftWorkout() {
  try {
    return JSON.parse(localStorage.getItem("draftWorkout") || "null")
  } catch {
    return null
  }
}

// Step 2: the draft becomes the active workout. The clock starts now, and any note is saved with the workout.
export function beginWorkout(navigate, notes = "") {
  const draft = readDraftWorkout()
  if (!draft) return false
  const { minutes, ...workout } = draft // eslint-disable-line no-unused-vars
  const now = new Date()
  localStorage.setItem("activeWorkout", JSON.stringify({
    ...workout,
    notes: notes.trim() || null,
    startedAtMs: now.getTime(),
    startDate: now.toLocaleDateString(),
    startTime: now.toLocaleTimeString(),
  }))
  localStorage.removeItem("draftWorkout")
  navigate("/workout/active", { state: { workoutId: workout.id } })
  return true
}
