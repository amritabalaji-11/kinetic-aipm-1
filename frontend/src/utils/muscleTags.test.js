import { describe, expect, it } from "vitest"
import { isPowerSection, muscleTag } from "./muscleTags"
import { amountFrom, whyReps } from "./whyReps"
import { sectionGuidance } from "./setTypes"

const item = (exerciseId, extra = {}) => ({ key: exerciseId, exerciseId, name: exerciseId, rest: false, ...extra })

describe("muscleTag", () => {
  it("calls a compound lift big muscles", () => expect(muscleTag("ex_001")).toMatchObject({ kind: "big", group: "Legs", label: "Legs · big muscles" }))
  it("calls an isolation move a small muscle", () => expect(muscleTag("ex_012")).toMatchObject({ kind: "small", label: "Shoulders · small muscle" }))
  it("calls the hand-picked explosive moves power, even a conditioning one", () => {
    expect(muscleTag("ex_042")).toMatchObject({ kind: "power", label: "Legs · power" }) // KB Swing
    expect(muscleTag("ex_086")).toMatchObject({ kind: "power" }) // Jump Squat
  })
  it("gives no tag to conditioning, mobility, a missing exercise or an unknown id", () => {
    expect(muscleTag(null)).toBeNull()
    expect(muscleTag("ex_nope")).toBeNull()
  })
})

describe("isPowerSection", () => {
  it("is true when half or more of the tagged moves are power", () => expect(isPowerSection([item("ex_042"), item("ex_086")])).toBe(true))
  it("is false for a normal strength section", () => expect(isPowerSection([item("ex_001"), item("ex_006")])).toBe(false))
  it("is false for an empty section", () => expect(isPowerSection([])).toBe(false))
})

describe("whyReps", () => {
  it("reads the reps or seconds from the plan's own line", () => {
    expect(amountFrom("10-12 reps · DB")).toBe("10–12 reps")
    expect(amountFrom("8 reps")).toBe("8 reps")
    expect(amountFrom("30 secs")).toBe("30 secs")
    expect(amountFrom("")).toBeNull()
  })
  it("explains a big-muscle exercise with heavier weight and a longer rest", () => {
    const w = whyReps("ex_001", "DB Goblet Squat", "10-12 reps · DB")
    expect(w.title).toBe("Why 10–12 reps here?")
    expect(w).toMatchObject({ weight: "Heavier", rest: "90 s–2 min" })
    expect(w.text).toMatch(/^This move uses several big muscles/) // not the name: many names are plural, so "uses" would read wrong
  })
  it("explains a power move by speed, with the plain rest line", () => {
    const w = whyReps("ex_086", "Jump Squat", "30 secs")
    expect(w.title).toBe("Why 30 secs here?")
    expect(w.rest).toBe("Until you feel ready to go again")
  })
  it("says nothing for an exercise with no tag", () => expect(whyReps("ex_nope", "X", "10 reps")).toBeNull())
  it("still has a title when the plan gives no reps", () => expect(whyReps("ex_001", "Squat", "DB").title).toBe("Why this range?"))
})

describe("section goal notes", () => {
  const block = (tag, items, extra = {}) => ({ id: "b1", tag, section: "workout", note: "3 Rounds", items, ...extra })
  it("a power section gets the power note, with the plain rest line", () => {
    const g = sectionGuidance(block("SUPERSET 2", [item("ex_042"), item("ex_086")]))
    expect(g.objective).toBe("Build explosive power.")
    expect(g.expect).toMatch(/Take your time between sets/)
  })
  it("a strength section keeps its rep range and points to the tags", () => {
    const g = sectionGuidance(block("SUPERSET 1", [item("ex_001", { reps: "10-12" })]))
    expect(g.objective).toBe("Build muscle and strength.")
    expect(g.expect).toMatch(/Tap a muscle tag to see why/)
  })
  it("warm-ups and cool-downs ask not to skip them", () => {
    expect(sectionGuidance(block("WARM UP", [], { section: "warmup" })).objective).toMatch(/don't skip/i)
    expect(sectionGuidance(block("COOL DOWN", [])).objective).toMatch(/don't cut this short/i)
  })
  it("EMOM, AMRAP and Tabata have their own plain notes", () => {
    expect(sectionGuidance(block("5 MIN EMOM", [], { section: "conditioning" })).objective).toMatch(/first part of each minute/)
    expect(sectionGuidance(block("8 MIN AMRAP", [], { section: "conditioning" })).objective).toMatch(/as many rounds as you can/i)
    expect(sectionGuidance(block("ALTERNATING TABATA", [], { section: "conditioning" })).objective).toMatch(/20 seconds hard/)
  })
})
