import { describe, expect, it } from "vitest"
import { isChangeable, isFromVideo, sectionGuidance, typeOfBlock } from "./setTypes"

const planned = (tag, section = "workout", extra = {}) => ({ id: "b1", tag, section, note: "3 Rounds", items: [], ...extra })
const imported = (tag, section = "workout") => ({ id: "routine-123-1", fromVideo: true, tag, section, note: "9 moves", items: [] })

describe("sections made from a pasted video", () => {
  it("get no goal note, whatever the model guessed the video to be", () => {
    expect(sectionGuidance(imported("30 MIN FULL BODY DUMBBELL WORKOUT", "warmup"))).toBeNull()
    expect(sectionGuidance(imported("HIIT CARDIO BLAST", "conditioning"))).toBeNull()
    expect(sectionGuidance(imported("BEGINNER STRENGTH", "workout"))).toBeNull()
  })

  it("are not given a set type from words in the video's title", () => {
    for (const title of ["TABATA FAT BURNER", "20 MIN EMOM WORKOUT", "FULL BODY SUPERSET WORKOUT", "5K RUN PLAN", "AMRAP ARMS"]) {
      expect(typeOfBlock(imported(title))).toBeNull()
    }
    expect(isChangeable(imported("FULL BODY SUPERSET WORKOUT"))).toBe(false)
  })

  it("are recognised even when only the id says so (a workout saved before the flag existed)", () => {
    expect(isFromVideo({ id: "routine-1730000000000-1", tag: "X", items: [] })).toBe(true)
    expect(isFromVideo(planned("SUPERSET 1"))).toBe(false)
  })
})

describe("planned sections keep their notes", () => {
  it("a warm-up still gets its goal", () => expect(sectionGuidance(planned("WARM UP", "warmup"))?.objective).toMatch(/ready for the work/i))
  it("a superset still gets the strength goal", () => expect(sectionGuidance(planned("SUPERSET 1"))?.objective).toMatch(/muscle/i))
  it("a superset is still a superset", () => expect(typeOfBlock(planned("SUPERSET 1"))).toBe("superset"))
})
