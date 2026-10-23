// The line on the commit screen that reflects how consistent you have been. "This week" is the last 7 days, the same
// window as Home's Last 7 Days card, and the workout you are about to do counts as one of them.
import { fromDbTime } from "../services/workoutService"

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const startedAt = (w) => fromDbTime(w.started_at || w.created_at)

const ordinal = (n) => {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`
}

// rows: workouts from the server plus ones waiting on the device. known: whether the server answered at all
// (if it did not, an empty list tells us nothing, so no message is better than a wrong one).
export function consistencyMessage(rows, known = true, now = new Date()) {
  if (rows.length === 0) {
    return known ? { icon: "spark", text: "Welcome! Your first workout starts here. We're glad you're here, let's make it a good one." } : null
  }
  const today = startOfDay(now).getTime()
  const weekStart = today - 6 * 24 * 60 * 60 * 1000
  const days = rows.map((w) => startedAt(w)).filter(Boolean).map((d) => startOfDay(d).getTime())
  const doneToday = days.filter((d) => d === today).length
  const doneThisWeek = days.filter((d) => d >= weekStart && d <= today).length

  if (doneToday > 0) return { icon: "flame", text: "Back for another session today. That's dedication." }
  const n = doneThisWeek + 1 // this one
  if (n === 1) return { icon: "spark", text: doneThisWeek === 0 && rows.length > 0 ? "Your first workout this week. Welcome back, let's get the week started." : "Let's get the week started." }
  if (n === 2) return { icon: "flame", text: "Good job clocking your 2nd workout this week. Keep the momentum going." }
  if (n === 3) return { icon: "flame", text: "Good job clocking your 3rd workout this week. That's real consistency." }
  return { icon: "flame", text: `Good job clocking your ${ordinal(n)} workout this week. You're on fire.` }
}
