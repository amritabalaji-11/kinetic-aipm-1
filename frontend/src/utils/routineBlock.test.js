import { describe, expect, it } from "vitest"
import { buildSequence } from "./routineBlock"

const step = (name) => ({ name, phase: "main", seconds: null, reps: null })
const routine = (structure) => ({ steps: [step("Squat"), step("Lunge"), step("Row")], structure })
const names = (seq) => seq.filter((x) => !x.rest).map((x) => x.name)

describe("buildSequence", () => {
  it("repeats the whole list when the video does rounds", () => {
    const seq = buildSequence(routine({ sets: 2, set_order: "whole_round", work_seconds: 30, rest_seconds: 30 }))
    expect(names(seq)).toEqual(["Squat", "Lunge", "Row", "Squat", "Lunge", "Row"])
  })

  it("keeps the old behaviour when the video does not say", () => {
    const seq = buildSequence(routine({ sets: 2, set_order: null, work_seconds: 30, rest_seconds: 30 }))
    expect(names(seq)).toEqual(["Squat", "Lunge", "Row", "Squat", "Lunge", "Row"])
  })

  it("does all sets of one move before the next when the video does that", () => {
    const seq = buildSequence(routine({ sets: 3, set_order: "all_sets_first", work_seconds: 30, rest_seconds: 30 }))
    expect(names(seq)).toEqual(["Squat", "Squat", "Squat", "Lunge", "Lunge", "Lunge", "Row", "Row", "Row"])
  })

  it("rests after every set but the very last, and labels the set number", () => {
    const seq = buildSequence(routine({ sets: 3, set_order: "all_sets_first", work_seconds: 30, rest_seconds: 30 }))
    expect(seq.filter((x) => x.rest)).toHaveLength(8) // 9 sets, 8 gaps
    expect(seq[seq.length - 1].rest).toBe(false)
    expect(seq.filter((x) => x.name === "Lunge").map((x) => x.set)).toEqual([1, 2, 3])
  })

  it("a single set is the same either way", () => {
    expect(names(buildSequence(routine({ sets: 1, set_order: "all_sets_first", work_seconds: 30, rest_seconds: 10 })))).toEqual(["Squat", "Lunge", "Row"])
  })
})

import { routineToBlock } from "./routineBlock"
describe("routineToBlock for a video we could not read", () => {
  const followOnly = { title: "30 Min Full Body Dumbbell Workout", follow_only: true, steps: [{ name: "Follow the video", how_to: "Play it, work out with it, then tap Done." }], source: { site: "youtube", video_id: "CKDYo5CeX9E", url: "https://www.youtube.com/watch?v=CKDYo5CeX9E", embeddable: true } }
  it("becomes one 'follow along' section named after the video", () => {
    const b = routineToBlock(followOnly)
    expect(b).toMatchObject({ followOnly: true, tag: "VIDEO WORKOUT", note: "Follow along", title: "30 Min Full Body Dumbbell Workout" })
    expect(b.items).toHaveLength(1)
    expect(b.runner).toBeNull() // no times, so no clock
  })
  it("a normal routine is unchanged", () => {
    const b = routineToBlock({ title: "Leg day", steps: [{ name: "Squat", seconds: 30 }, { name: "Lunge", seconds: 30 }], total_minutes: 30 })
    expect(b.followOnly).toBe(false)
    expect(b.tag).toBe("LEG DAY")
    expect(b.note).toBe("2 moves · about 30 min")
  })
})
