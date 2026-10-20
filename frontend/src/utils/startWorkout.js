// Starts a workout: stores it as the "activeWorkout" the logging screen reads, then opens that screen.
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

export function startWorkout(navigate, options) {
  const workout = buildActiveWorkout(options)
  localStorage.setItem("activeWorkout", JSON.stringify(workout))
  navigate("/workout/active", { state: { workoutId: workout.id } })
}
