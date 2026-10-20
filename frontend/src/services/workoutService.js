// Talks to the backend /workouts routes. Workouts used to live only in localStorage.

import { apiFetch, BASE_URL } from "./api"

export const getUserId = () => localStorage.getItem("active_user_id") || "user_001"

async function request(path, options = {}) {
  const res = await apiFetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

// "2026-10-19 10:40:00" (UTC) — same format the database already uses
const toDbTime = (date) => date.toISOString().slice(0, 19).replace("T", " ")

// Database times are UTC; turn one back into a Date for display
export const fromDbTime = (value) => (value ? new Date(value.replace(" ", "T") + "Z") : null)

const num = (v) => (v === "" || v == null ? null : Number(v))

// Turns the workout kept in the browser (activeWorkout) into what the backend expects.
// Sets with neither weight nor reps are skipped. Older workouts saved on this device
// have no end time (endedAtMs), so they are sent without a duration.
export function toApiWorkout(workout, extra = {}) {
  const started = new Date(workout.id) // id was created with Date.now() when the workout began
  const ended = workout.endedAtMs ? new Date(workout.endedAtMs) : null
  return {
    user_id: getUserId(),
    name: workout.presetTitle || null, // plan name, or what the user called a custom workout
    focus_label: workout.focusLabel,
    muscles: workout.muscles || [],
    notes: workout.notes || null,
    started_at: toDbTime(started),
    ended_at: ended ? toDbTime(ended) : null,
    duration_min: ended ? Math.max(1, Math.round((ended - started) / 60000)) : null,
    exercises: workout.exercises.map((ex) => ({
      exercise_id: ex.id,
      exercise_name: ex.name,
      notes: ex.notes || null,
      sets: ex.sets
        .filter((s) => s.weight !== "" || s.reps !== "")
        .map((s, i) => ({
          set_number: i + 1,
          weight: num(s.weight),
          weight_unit: "kg",
          reps: num(s.reps),
          notes: s.notes || null,
        })),
    })),
    ...extra,
  }
}

// Saving a workout that just finished (end time = now)
export const saveWorkout = (workout) =>
  request("/workouts", {
    method: "POST",
    body: JSON.stringify(toApiWorkout({ ...workout, endedAtMs: workout.endedAtMs ?? Date.now() })),
  })

// Uploading a workout that was kept on this device (keeps its own end time, if it has one)
export const syncLocalWorkout = (workout) =>
  request("/workouts", { method: "POST", body: JSON.stringify(toApiWorkout(workout)) })

export const listWorkouts = () => request("/workouts")

export const updateWorkout = (workoutId, apiWorkout) =>
  request(`/workouts/${workoutId}`, { method: "PUT", body: JSON.stringify(apiWorkout) })

export const deleteWorkout = (workoutId) =>
  request(`/workouts/${workoutId}`, { method: "DELETE" })

export const getExerciseProgress = (exerciseName) =>
  request(`/workouts/progress?exercise_name=${encodeURIComponent(exerciseName)}`)
