import { describe, expect, it } from "vitest"
import { convertUnit, fromKg, isUnit, normaliseUnit, regionDefaultUnit } from "./units"

describe("regionDefaultUnit", () => {
  it("uses pounds in the US, Liberia and Myanmar", () => {
    expect(regionDefaultUnit("en-US")).toBe("lbs")
    expect(regionDefaultUnit("en_US")).toBe("lbs")
    expect(regionDefaultUnit(["en-LR"])).toBe("lbs")
    expect(regionDefaultUnit("my-MM")).toBe("lbs")
  })
  it("uses kilograms everywhere else", () => {
    for (const tag of ["en-GB", "en-IN", "de-DE", "fr-CA", "en-AU", "hi-IN"]) expect(regionDefaultUnit(tag)).toBe("kg")
  })
  it("always gives an answer, even with no region or no language", () => {
    expect(regionDefaultUnit("en")).toBe("kg")
    expect(regionDefaultUnit("")).toBe("kg")
    expect(regionDefaultUnit(undefined)).toBe("kg")
    expect(regionDefaultUnit([])).toBe("kg")
  })
  it("reads the first language that names a region", () => expect(regionDefaultUnit(["en", "en-US"])).toBe("lbs"))
})

describe("conversion", () => {
  it("shows kg in pounds to the nearest half pound", () => {
    expect(fromKg(20, "lbs")).toBe(44)
    expect(fromKg(12, "lbs")).toBe(26.5)
  })
  it("keeps kg to one decimal", () => expect(fromKg(12.345, "kg")).toBe(12.3))
  it("leaves nothing as nothing", () => {
    expect(fromKg(null, "lbs")).toBeNull()
    expect(convertUnit("", "kg", "lbs")).toBe("")
  })
  it("converts a logged weight from its own unit", () => {
    expect(convertUnit(45, "lbs", "kg")).toBe(20.4)
    expect(convertUnit(20, "kg", "lbs")).toBe(44)
    expect(convertUnit(20, "kg", "kg")).toBe(20)
    expect(convertUnit(45, "lb", "kg")).toBe(20.4)
  })
  it("treats a set with no unit as kg, like older sets", () => expect(normaliseUnit(undefined)).toBe("kg"))
  it("normalises the spellings of pounds", () => ["lb", "lbs", "LBS"].forEach((u) => expect(normaliseUnit(u)).toBe("lbs")))
  it("knows which values are units", () => {
    expect(isUnit("kg")).toBe(true)
    expect(isUnit("lbs")).toBe(true)
    expect(isUnit("lb")).toBe(false)
  })
})
