import { describe, expect, it } from "vitest"
import { HEADLINES, greetingLine, headlineFor, } from "./homeLines"

const noon = (y, m, d) => new Date(y, m - 1, d, 12)
const NOW = noon(2026, 11, 17)
const ago = (n) => noon(2026, 11, 17 - n)

describe("headlineFor", () => {
  it("is the same all day, whatever the time", () => {
    expect(headlineFor(new Date(2026, 10, 17, 0, 1))).toBe(headlineFor(new Date(2026, 10, 17, 23, 59)))
  })
  it("moves to the next one each day and comes back round", () => {
    const three = [0, 1, 2].map((n) => headlineFor(noon(2026, 11, 17 + n)))
    expect(new Set(three).size).toBe(3)
    expect(headlineFor(noon(2026, 11, 20))).toBe(three[0])
  })
  it("only ever gives one of the three", () => expect(HEADLINES).toContain(headlineFor(new Date())))
})

describe("greetingLine", () => {
  const line = (dates, loaded = true) => greetingLine({ loaded, dates, now: NOW })
  it("stays neutral until the workouts have loaded", () => expect(line([], false)).toBe("Ready when you are."))
  it("welcomes someone with no workouts", () => expect(line([])).toMatch(/first one/))
  it("says done for today when one was logged today", () => expect(line([ago(0), ago(3)])).toBe("Done for today! Nice work."))
  it("counts the days after a long break", () => expect(line([ago(5), ago(9)])).toMatch(/been 5 days/))
  it("does not call 3 days off a long break", () => expect(line([ago(3)])).not.toMatch(/been/))
  it("counts one workout in the last 7 days", () => expect(line([ago(2), ago(20)])).toMatch(/One down/))
  it("counts several", () => expect(line([ago(1), ago(2), ago(3)])).toMatch(/^3 workouts in the last 7 days/))
  it("ignores bad dates", () => expect(line([new Date("nope"), ago(2)])).toMatch(/One down/))
})
