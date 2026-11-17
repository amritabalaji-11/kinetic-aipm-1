import { describe, expect, it } from "vitest"
import { previewOf, youtubeIdFrom } from "./videoLink"

describe("youtubeIdFrom", () => {
  it.each([
    ["https://youtu.be/GViX8riaHX4?is=aN7b77RMjrd2Hmdv", "GViX8riaHX4"],
    ["https://www.youtube.com/watch?v=GViX8riaHX4&t=10", "GViX8riaHX4"],
    ["https://m.youtube.com/watch?v=GViX8riaHX4", "GViX8riaHX4"],
    ["https://www.youtube.com/shorts/GViX8riaHX4", "GViX8riaHX4"],
    ["youtu.be/GViX8riaHX4", "GViX8riaHX4"],
  ])("finds the id in %s", (link, id) => expect(youtubeIdFrom(link)).toBe(id))

  it.each(["", "not a link", "https://example.com/watch?v=GViX8riaHX4", "https://youtu.be/short", null])("finds nothing in %s", (link) => expect(youtubeIdFrom(link)).toBeNull())
})

describe("previewOf", () => {
  it("gives YouTube two big pictures to try and a small one", () => {
    const p = previewOf("https://youtu.be/GViX8riaHX4")
    expect(p.site).toBe("youtube")
    expect(p.pictures).toHaveLength(2)
    expect(p.small[0]).toContain("mqdefault")
  })
  it("knows Instagram and TikTok but has no picture for them", () => {
    expect(previewOf("https://www.instagram.com/reel/abc123/")).toMatchObject({ site: "instagram", name: "Instagram", pictures: [] })
    expect(previewOf("https://vm.tiktok.com/ZMabc/")).toMatchObject({ site: "tiktok", pictures: [] })
  })
  it("returns null for anything else", () => {
    expect(previewOf("https://example.com/video")).toBeNull()
    expect(previewOf("hello")).toBeNull()
  })
})
