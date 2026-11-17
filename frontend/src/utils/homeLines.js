// The two lines on the Home page that change: a headline that rotates by day, and a line under "Hey Name" that says something true about what you have done.

export const HEADLINES = [
  "Dumbbells won’t lift themselves.",
  "Today’s forecast: a strong chance of reps.",
  "Your future self says thanks in advance.",
]

// Today's headline. It depends only on the calendar date, so everyone sees the same one all day and it changes at midnight.
export function headlineFor(now = new Date()) {
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000)
  return HEADLINES[dayNumber % HEADLINES.length]
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const DAY = 86400000

// `dates`: when each logged workout happened. `loaded`: false until the list has come back, so we never say "no workouts yet" by mistake.
export function greetingLine({ loaded, dates = [], now = new Date() }) {
  if (!loaded) return "Ready when you are."
  const days = dates.filter((d) => d instanceof Date && !Number.isNaN(d.getTime()))
  if (days.length === 0) return "Your first one is one tap away. We’ll keep it simple."
  const today = startOfDay(now)
  const sinceLast = Math.round((today - Math.max(...days.map(startOfDay))) / DAY) // whole days since the latest workout (0 = today)
  if (sinceLast <= 0) return "Done for today! Nice work."
  if (sinceLast >= 4) return `It’s been ${sinceLast} days. Your muscles are rested, so ease back in.`
  const inLastSeven = days.filter((d) => { const ago = Math.round((today - startOfDay(d)) / DAY); return ago >= 0 && ago <= 6 }).length
  return inLastSeven === 1
    ? "One down in the last 7 days. One more makes it a habit."
    : `${inLastSeven} workouts in the last 7 days. You’re on a roll.`
}
