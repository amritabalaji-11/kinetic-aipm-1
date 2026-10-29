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
  const started = new Date(workout.startedAtMs ?? workout.id) // START WORKOUT time (older workouts: when they were created)
  const ended = workout.endedAtMs ? new Date(workout.endedAtMs) : null
  return {
    user_id: getUserId(),
    name: workout.presetTitle || null, // plan name, or what the user called a custom workout
    focus_label: workout.focusLabel,
    muscles: workout.muscles || [],
    notes: workout.notes || null,
    started_at: toDbTime(started),
    ended_at: ended ? toDbTime(ended) : null,
    duration_min: ended ? Math.max(1, Math.round((ended - started - (workout.pausedTotalMs || 0)) / 60000)) : null, // minus any time paused
    exercises: workout.exercises.map((ex) => ({
      exercise_id: ex.id,
      exercise_name: ex.name,
      notes: ex.notes || null,
      sets: ex.sets
        .filter((s) => s.weight !== "" || s.reps !== "" || (s.seconds !== "" && s.seconds != null))
        .map((s, i) => ({
          set_number: i + 1,
          weight: num(s.weight),
          weight_unit: "kg",
          reps: num(s.reps),
          duration_sec: num(s.seconds),
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

// ---- workouts that have not reached the server yet ----
// A finished workout is written here first, then sent, and only removed once the server has it. So a slow or failed
// save (for example while the server is waking up) can never lose it, and it is retried later.
const PENDING_KEY = "workouts"

export function getPendingWorkouts() {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]")
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
const setPending = (list) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)) } catch { /* storage full or blocked */ }
}
export const addPendingWorkout = (workout) => setPending([...getPendingWorkouts().filter((w) => w.id !== workout.id), workout])
export const removePendingWorkout = (id) => setPending(getPendingWorkouts().filter((w) => w.id !== id))

// Pending workouts in the same shape as the server's rows, so a screen can list and count them together
export const pendingAsRows = () =>
  getPendingWorkouts().map((w) => ({
    workout_id: `pending-${w.id}`,
    name: w.presetTitle || null,
    focus_label: w.focusLabel || null,
    started_at: toDbTime(new Date(w.startedAtMs ?? w.id)),
    exercises: w.exercises || [],
    pending: true,
  }))

// Send every pending workout; the ones that still fail stay for next time. Only one run at a time.
let syncing = null
export function syncPendingWorkouts() {
  if (!syncing) {
    syncing = (async () => {
      let sent = 0
      for (const w of getPendingWorkouts()) {
        try {
          await syncLocalWorkout(w)
          removePendingWorkout(w.id)
          sent += 1
        } catch { /* the server may still be waking up; try again next time */ }
      }
      return { sent, left: getPendingWorkouts().length }
    })().finally(() => { syncing = null })
  }
  return syncing
}

export const listWorkouts = () => request("/workouts")

export const updateWorkout = (workoutId, apiWorkout) =>
  request(`/workouts/${workoutId}`, { method: "PUT", body: JSON.stringify(apiWorkout) })

export const deleteWorkout = (workoutId) =>
  request(`/workouts/${workoutId}`, { method: "DELETE" })

export const getExerciseProgress = (exerciseName) =>
  request(`/workouts/progress?exercise_name=${encodeURIComponent(exerciseName)}`)
