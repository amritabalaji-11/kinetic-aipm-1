import { describe, expect, it } from "vitest"
import { toApiWorkout } from "./workoutService"

// the service reads the signed-in user from localStorage, which the test environment does not have
globalThis.localStorage = { getItem: () => "user-a", setItem() {}, removeItem() {} }

const workout = (extra = {}) => ({ id: 1763400000000, startedAtMs: 1763400000000, presetTitle: "Leg Day", focusLabel: "Legs", muscles: ["legs"], exercises: [{ id: "ex_001", name: "Goblet Squat", sets: [{ weight: "45", reps: "10", seconds: "" }, { weight: "", reps: "", seconds: "" }] }], ...extra })
const unitsOf = (w) => toApiWorkout(w).exercises.flatMap((e) => e.sets.map((s) => s.weight_unit))

describe("toApiWorkout and the unit", () => {
  it("saves sets in pounds when the workout was logged in pounds", () => expect(unitsOf(workout({ weightUnit: "lbs" }))).toEqual(["lbs"]))
  it("saves sets in kg when logged in kg", () => expect(unitsOf(workout({ weightUnit: "kg" }))).toEqual(["kg"]))
  it("treats a workout with no unit (one finished before this existed) as kg", () => expect(unitsOf(workout())).toEqual(["kg"]))
  it("never saves anything but kg or lbs", () => expect(unitsOf(workout({ weightUnit: "stone" }))).toEqual(["kg"]))
  it("skips empty sets", () => expect(toApiWorkout(workout({ weightUnit: "lbs" })).exercises[0].sets).toHaveLength(1))
})
