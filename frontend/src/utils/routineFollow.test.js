import { describe, expect, it } from "vitest"
import { canFollow, currentMove, tickAll, tickBefore } from "./routineFollow"

const mv = (name, at, done = false) => ({ name, at, done, rest: false })
const items = [mv("Arm circles", 17), mv("Side bends", 54), mv("Twists", 86), mv("Front bend", 112)]

describe("currentMove", () => {
  it("is -1 during the intro", () => expect(currentMove(items, 5)).toBe(-1))
  it("is the move that has started, up to the next one", () => {
    expect(currentMove(items, 17)).toBe(0)
    expect(currentMove(items, 53)).toBe(0)
    expect(currentMove(items, 54)).toBe(1)
    expect(currentMove(items, 9999)).toBe(3)
  })
  it("ignores moves with no start time", () => expect(currentMove([mv("A", 10), mv("B", null), mv("C", 40)], 30)).toBe(0))
})

describe("tickBefore", () => {
  it("ticks the moves before the current one, not the current one", () => {
    expect(tickBefore(items, 2).map((i) => i.done)).toEqual([true, true, false, false])
  })
  it("returns the same list when nothing is new, so nothing is saved again", () => {
    const ticked = tickBefore(items, 2)
    expect(tickBefore(ticked, 2)).toBe(ticked)
    expect(tickBefore(items, -1)).toBe(items)
  })
  it("ticks a move with no start time once a later move has started", () => {
    const mixed = [mv("A", 10), mv("B", null), mv("C", 40)]
    expect(tickBefore(mixed, 2).map((i) => i.done)).toEqual([true, true, false])
  })
  it("never un-ticks, and leaves a manual tick alone when the video goes back", () => {
    const manual = [mv("A", 10, true), mv("B", 50, true), mv("C", 90)]
    expect(tickBefore(manual, 0)).toBe(manual)
  })
  it("does not touch rests", () => {
    const withRest = [mv("A", 10), { name: "Rest", rest: true, done: false }, mv("C", 40)]
    expect(tickBefore(withRest, 3).map((i) => i.done)).toEqual([true, false, true])
  })
})

describe("tickAll and canFollow", () => {
  it("ticks everything when the video ends", () => expect(tickAll(items).every((i) => i.done)).toBe(true))
  it("needs two moves with a start time to follow", () => {
    expect(canFollow(items)).toBe(true)
    expect(canFollow([mv("A", 10), mv("B", null)])).toBe(false)
  })
})
