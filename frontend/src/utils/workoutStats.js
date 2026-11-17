// The two numbers under a person's name on the Profile page, worked out from their logged workouts.
import { fromDbTime } from "../services/workoutService"

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const whenOf = (w) => fromDbTime(w.started_at || w.created_at)

// How many workouts they have logged in all (including any still waiting to reach the server)
export const totalWorkouts = (rows = []) => rows.length

// Days in a row with at least one workout, counting back from today. If they have not trained yet today the streak is still alive
// (it counts back from yesterday), so it only breaks once a whole day has gone by without a workout.
export function dayStreak(rows = [], now = new Date()) {
  const days = new Set(rows.map(whenOf).filter((d) => d && !Number.isNaN(d.getTime())).map(dayKey))
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1) // calendar days, so a clock change cannot skip or repeat one
  }
  return streak
}
