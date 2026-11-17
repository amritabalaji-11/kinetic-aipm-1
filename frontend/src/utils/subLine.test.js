import { describe, expect, it } from "vitest"
import { splitSub } from "./subLine"

describe("splitSub", () => {
  it("keeps just the amount", () => expect(splitSub("10-12 reps")).toEqual({ main: "10-12 reps", note: "" }))
  it("keeps a short word with the amount", () => expect(splitSub("10-12 reps · each leg")).toEqual({ main: "10-12 reps · each leg", note: "" }))
  it("moves a long note to its own line", () => expect(splitSub("10-12 reps · KB, you can use DB or Barbell as well")).toEqual({ main: "10-12 reps", note: "KB, you can use DB or Barbell as well" }))
  it("copes with nothing", () => {
    expect(splitSub("")).toEqual({ main: "", note: "" })
    expect(splitSub(undefined)).toEqual({ main: "", note: "" })
  })
})
