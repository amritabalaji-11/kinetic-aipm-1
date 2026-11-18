import { describe, expect, it } from "vitest"
import { ROWS, rowSummary } from "./aboutYou"

describe("rowSummary", () => {
  const about = { experience: "1-2", workouts_per_week: "3-4", training_types: ["strength", "group_classes"], age_range: "30-39", gender: "woman", has_injury: true, injury_details: "left knee" }
  it("shows the answer for the everyday questions", () => {
    expect(rowSummary("experience", about)).toBe("1–2 years")
    expect(rowSummary("workouts_per_week", about)).toBe("3–4")
    expect(rowSummary("age_range", about)).toBe("30–39")
    expect(rowSummary("training_types", about)).toBe("Strength training, Group classes")
  })
  it("never shows gender or the injury details on the list", () => {
    expect(rowSummary("gender", about)).toBe("Set")
    expect(rowSummary("injuries", about)).toBe("Yes")
    for (const row of ROWS) expect(rowSummary(row.key, about)).not.toMatch(/woman|knee/i)
  })
  it("says Not set for anything unanswered", () => {
    for (const row of ROWS) expect(rowSummary(row.key, {})).toBe("Not set")
    expect(rowSummary("training_types", { training_types: [] })).toBe("Not set")
  })
  it("tells a No from not set for injuries", () => {
    expect(rowSummary("injuries", { has_injury: false })).toBe("No")
    expect(rowSummary("injuries", { has_injury: null })).toBe("Not set")
  })
  it("lists every onboarding question once, with gender and injuries last", () => {
    expect(ROWS.map((r) => r.key)).toEqual(["experience", "workouts_per_week", "training_types", "age_range", "gender", "injuries"])
  })
})
