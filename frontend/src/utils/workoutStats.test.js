import { describe, expect, it } from "vitest"
import { dayStreak, totalWorkouts } from "./workoutStats"

const NOW = new Date(2026, 10, 17, 15, 0) // 17 Nov 2026, mid afternoon
// a workout row the way the server gives it (UTC text), on the local day `ago` days before NOW at 10:00
const row = (ago, hour = 10) => { const d = new Date(2026, 10, 17 - ago, hour); const z = (n) => String(n).padStart(2, "0"); return { started_at: `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}:00` } }

describe("totalWorkouts", () => {
  it("counts every workout", () => expect(totalWorkouts([row(0), row(3), row(9)])).toBe(3))
  it("is 0 with none", () => expect(totalWorkouts([])).toBe(0))
})

describe("dayStreak", () => {
  it("is 0 with no workouts", () => expect(dayStreak([], NOW)).toBe(0))
  it("is 1 for a workout today", () => expect(dayStreak([row(0)], NOW)).toBe(1))
  it("counts days in a row back from today", () => expect(dayStreak([row(0), row(1), row(2), row(4)], NOW)).toBe(3))
  it("is still alive when you have not trained yet today", () => expect(dayStreak([row(1), row(2)], NOW)).toBe(2))
  it("breaks after a whole day without a workout", () => expect(dayStreak([row(2), row(3)], NOW)).toBe(0))
  it("counts a day once however many workouts it had", () => expect(dayStreak([row(0, 7), row(0, 18), row(1)], NOW)).toBe(2))
  it("ignores rows with a bad date", () => expect(dayStreak([{ started_at: "nope" }, {}, row(0)], NOW)).toBe(1))
  it("a late-evening workout counts for that local day", () => expect(dayStreak([row(0, 23), row(1, 23)], NOW)).toBe(2))
})
