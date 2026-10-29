// The clock logic for timed sections (EMOM, AMRAP, Tabata). Everything is worked out from how many seconds have passed,
// so the timer stays right when the phone sleeps or the screen is reloaded.
//
//   parseTimedBlock(block) -> spec, or null when the section isn't one of these or can't be read
//   stateAt(spec, elapsedSec) -> where you are: minute / round, work or rest, seconds left, what is next
import { isActionable } from "./workoutModel"

const secsIn = (sub = "") => {
  const m = /(\d+)\s*(?:secs?|seconds?)\b/i.exec(sub)
  return m ? Number(m[1]) : null
}

// Which of EMOM / AMRAP / TABATA a block is, reading its label and note ("4 Minute EMOM, into a 2 min AMRAP" is an EMOM first)
function kindOf(block) {
  const text = `${block.tag || ""} ${block.note || ""}`
  const hits = [["tabata", text.search(/TABATA/i)], ["emom", text.search(/\bEMOM\b/i)], ["amrap", text.search(/\bAMRAP\b/i)]].filter(([, i]) => i >= 0)
  if (!hits.length) return null
  hits.sort((a, b) => a[1] - b[1])
  return hits[0][0]
}

const minutesIn = (block) => {
  const m = /(\d+)\s*min(?:ute)?s?\b/i.exec(block.tag || "") || /(\d+)\s*min(?:ute)?s?\b/i.exec(block.note || "")
  return m ? Number(m[1]) : null
}

export function parseTimedBlock(block) {
  const kind = kindOf(block)
  if (!kind || block.section === "warmup") return null
  const real = block.items.filter(isActionable)
  if (!real.length) return null
  const name = (it) => it.name

  if (kind === "amrap") {
    const minutes = minutesIn(block)
    return minutes ? { kind, totalSec: minutes * 60, minutes, items: real.map((it) => ({ name: name(it), sub: it.sub })) } : null
  }

  if (kind === "tabata") {
    const note = block.note || ""
    const rounds = Number(/(\d+)\s*rounds?/i.exec(note)?.[1]) || 8
    const work = Number(/(?:\d+:)?(\d+)\s*secs?\s*(?:of\s*)?work/i.exec(note)?.[1]) || 20
    const rest = Number(/(?:\d+:)?(\d+)\s*secs?\s*(?:off|rest)/i.exec(note)?.[1]) || 10
    // "Movement 1" / "Movement 2" in an exercise's line say which turn it belongs to; otherwise they take turns one by one
    const groups = new Map()
    real.forEach((it, i) => {
      const g = /movement\s*(\d+)/i.exec(it.sub || "")?.[1] ?? String(i + 1)
      groups.set(g, [...(groups.get(g) || []), { name: name(it), sub: it.sub }])
    })
    const turns = [...groups.values()]
    return { kind, rounds, work, rest, turns, totalSec: rounds * (work + rest) - rest }
  }

  // EMOM
  const minutes = minutesIn(block)
  if (!minutes) return null
  const alternate = real.some((it) => /\b(odd|even)\s*min/i.test(it.sub || ""))
  const stepsFor = (m) => {
    let list
    if (alternate) {
      const want = m % 2 === 1 ? "odd" : "even"
      list = block.items.filter((it) => !it.rest && (!/\b(odd|even)\s*min/i.test(it.sub || "") || new RegExp(`\\b${want}\\s*min`, "i").test(it.sub || "")))
    } else {
      list = block.items
    }
    const steps = list.map((it) => ({ name: name(it), sub: it.sub, secs: secsIn(it.sub), rest: !!it.rest }))
    const timed = steps.every((s) => s.secs != null)
    if (!timed) {
      // some step has no time (a rep target): that part runs until you finish, so the whole minute is one step
      const first = steps.find((s) => s.secs == null)
      return [{ name: steps.filter((s) => !s.rest).map((s) => s.name).join(" + ") || first.name, sub: steps[0]?.sub, secs: 60, untimed: true }]
    }
    const sum = steps.reduce((n, s) => n + s.secs, 0)
    return sum < 60 ? [...steps, { name: "Rest", secs: 60 - sum, rest: true }] : steps
  }
  return { kind, minutes, totalSec: minutes * 60, stepsFor, alternate }
}

export function stateAt(spec, elapsed) {
  const e = Math.max(0, Math.floor(elapsed))
  if (spec.kind === "amrap") {
    const left = Math.max(0, spec.totalSec - e)
    return { kind: "amrap", done: left === 0, left, elapsed: e, total: spec.totalSec, phase: left === 0 ? "done" : "work", phaseLeft: left, key: left === 0 ? "done" : "work" }
  }
  if (spec.kind === "tabata") {
    const cycle = spec.work + spec.rest
    const round = Math.floor(e / cycle) + 1
    if (e >= spec.totalSec) return { kind: "tabata", done: true, round: spec.rounds, rounds: spec.rounds, phase: "done", phaseLeft: 0, key: "done", elapsed: e, total: spec.totalSec }
    const t = e % cycle
    const phase = t < spec.work ? "work" : "rest"
    const phaseLeft = phase === "work" ? spec.work - t : cycle - t
    const turn = spec.turns[(round - 1) % spec.turns.length]
    const nextTurn = spec.turns[round % spec.turns.length]
    return { kind: "tabata", done: false, round, rounds: spec.rounds, phase, phaseLeft, now: phase === "work" ? turn : null, next: phase === "work" ? null : round >= spec.rounds ? null : nextTurn, key: `${round}-${phase}`, elapsed: e, total: spec.totalSec }
  }
  // EMOM
  if (e >= spec.totalSec) return { kind: "emom", done: true, minute: spec.minutes, minutes: spec.minutes, phase: "done", phaseLeft: 0, key: "done", elapsed: e, total: spec.totalSec }
  const minute = Math.floor(e / 60) + 1
  let t = e % 60
  const steps = spec.stepsFor(minute)
  let idx = 0
  while (idx < steps.length - 1 && t >= steps[idx].secs) { t -= steps[idx].secs; idx++ }
  const step = steps[idx]
  const nextStep = steps[idx + 1] ?? (minute < spec.minutes ? spec.stepsFor(minute + 1)[0] : null)
  return { kind: "emom", done: false, minute, minutes: spec.minutes, steps, stepIndex: idx, step, nextStep, phase: step.rest ? "rest" : "work", phaseLeft: Math.max(0, step.secs - t), key: `${minute}-${idx}`, elapsed: e, total: spec.totalSec }
}

// What is left of an exercise's line once the timing words are taken out:
// "Odd min · 10-12 reps" -> "10-12 reps", "20 secs · alternate legs every round" -> "alternate legs every round", "Movement 2 · 3 reps" -> "3 reps"
export const cleanSub = (sub = "") =>
  sub.replace(/\bmovement\s*\d+\s*·?\s*/i, "").replace(/\b(odd|even)\s*min\s*·?\s*/i, "").replace(/^\s*\d+\s*secs?\s*·?\s*/i, "").trim()

export const clockText = (secs) => `${Math.floor(secs / 60)}:${String(Math.max(0, secs) % 60).padStart(2, "0")}`
