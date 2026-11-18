import { describe, expect, it } from "vitest"
import { lastTimeHints, lastTimeText } from "./lastTime"

describe("lastTimeText", () => {
  it("shows the last weight and reps, and the best when it was heavier", () => {
    expect(lastTimeText({ weight_kg: 20.41, reps: 10, best_weight_kg: 24.95 }, "lbs")).toBe("Last time: 45 lb × 10 · Best: 55 lb")
    expect(lastTimeText({ weight_kg: 20, reps: 10, best_weight_kg: 25 }, "kg")).toBe("Last time: 20 kg × 10 · Best: 25 kg")
  })
  it("says so when the last time was the best", () => {
    expect(lastTimeText({ weight_kg: 20, reps: 10, best_weight_kg: 20 }, "kg")).toBe("Last time: 20 kg × 10 · your best")
  })
  it("copes with sets that have only a weight or only reps (bodyweight)", () => {
    expect(lastTimeText({ weight_kg: 20, reps: null, best_weight_kg: 20 }, "kg")).toBe("Last time: 20 kg · your best")
    expect(lastTimeText({ weight_kg: null, reps: 15, best_weight_kg: null }, "kg")).toBe("Last time: 15 reps")
  })
  it("shows nothing when there is nothing", () => {
    expect(lastTimeText(undefined, "kg")).toBeNull()
    expect(lastTimeText({ weight_kg: null, reps: null, best_weight_kg: null }, "kg")).toBeNull()
  })
})

describe("lastTimeHints", () => {
  it("gives the numbers for the empty boxes, in the person's unit", () => {
    expect(lastTimeHints({ weight_kg: 20.41, reps: 10 }, "lbs")).toEqual({ weight: "45", reps: "10" })
    expect(lastTimeHints({ weight_kg: null, reps: 15 }, "kg")).toEqual({ reps: "15" })
    expect(lastTimeHints(undefined, "kg")).toBeNull()
  })
})
