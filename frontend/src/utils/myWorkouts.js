// "My workouts": workouts a user built with "Create your own" and chose to save.
// Kept in this browser for now (same as the active workout); move to the backend later.
const KEY = "myWorkouts"

export function getMyWorkouts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}

// workout: { id, name, items: [{ id, sets, reps, linkNext }] }
export function saveMyWorkout(workout) {
  try {
    const rest = getMyWorkouts().filter((w) => w.id !== workout.id)
    localStorage.setItem(KEY, JSON.stringify([workout, ...rest]))
  } catch {
    // storage unavailable: the workout still starts, it just isn't remembered
  }
}
