import { describe, expect, it } from "vitest"
import { TYPE_META, followedVideo, workoutType } from "./workoutType"

const w = (...ids) => ({ exercises: ids.map((id) => ({ exercise_id: id })) })

describe("workoutType and videos", () => {
  it("shows a video icon when a video routine was followed", () => {
    expect(workoutType(w("routine:GViX8riaHX4"))).toBe("video")
    expect(workoutType({ exercises: [{ id: "routine:abc" }] })).toBe("video") // a workout still waiting on the device uses `id`
  })
  it("counts a routine from Instagram or TikTok too (it has no YouTube id)", () => expect(workoutType(w("routine:link"))).toBe("video"))
  it("does not count a routine that did not come from a video", () => {
    expect(followedVideo(w("routine:mine"))).toBe(false)
    expect(workoutType(w("routine:mine"))).toBe("other")
  })
  it("wins over the muscles when a session had both", () => expect(workoutType(w("ex_001", "routine:GViX8riaHX4"))).toBe("video"))
  it("leaves other workouts as they were", () => {
    expect(workoutType(w("ex_001"))).toBe("legs")
    expect(workoutType({ exercises: [], name: "Cardio blast" })).toBe("cardio")
  })
  it("has an icon and a label for the video type", () => {
    expect(TYPE_META.video.label).toMatch(/video/i)
    expect(TYPE_META.video.Icon).toBeTruthy()
  })
})
