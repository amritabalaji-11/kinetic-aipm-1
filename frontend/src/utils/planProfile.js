// Plain-language description of each preset plan, worked out from the plan itself (not typed by hand),
// plus the "what should I train today" suggestion used by the hero card on the Plan screen.

import { EXERCISES } from "../data/dummyData"

const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
const DAY = 24 * 60 * 60 * 1000

// ---------- words shown to users ----------
// Goal: the PDF titles use gym jargon, so each one gets a plain name and a one-line meaning.
export const GOALS = {
  build: { label: "Build muscle & strength", short: "Build muscle", hint: "Moderate to heavy weights, around 8-12 reps, with a short break between rounds." },
  stamina: { label: "Stamina", short: "Stamina", hint: "Lighter weights and more reps, so you keep moving and build staying power." },
  cardio: { label: "Cardio", short: "Cardio", hint: "Running, rowing or cycling, in intervals or at a steady effort." },
  explosive: { label: "Explosive", short: "Explosive", hint: "Jumps and fast, powerful moves." },
  sweat: { label: "Sweat session", short: "Sweat", hint: "A hard, timed circuit with little rest." },
}
const TAG_TO_GOAL = { Hypertrophy: "build", Strength: "build", Endurance: "stamina", Cardio: "cardio", Power: "explosive", Metcon: "sweat" }

// Style: worked out from how many of the main exercises are compound or isolation moves.
export const STYLES = {
  big: { label: "Big lifts", hint: "Moves that work several muscles at once, like squats, rows and presses." },
  targeted: { label: "Targeted work", hint: "Moves that focus on one muscle, like curls and lateral raises." },
  mixed: { label: "Mixed", hint: "A balance of big lifts and single-muscle moves." },
  cardio: { label: "Cardio-led", hint: "Mostly running, rowing or cycling." },
  circuit: { label: "Circuit-style", hint: "Timed rounds of simple moves with little rest." },
}

// Time: the minutes on each plan are estimates, so the screen shows "~".
export const TIMES = {
  quick: { label: "Quick", sub: "up to 40 min" },
  standard: { label: "Standard", sub: "45-50 min" },
  long: { label: "Long", sub: "55+ min" },
}
export const EQUIPMENT = {
  none: { label: "No equipment" },
  light: { label: "Dumbbells / kettlebell" },
  gym: { label: "Full gym" },
}

// ---------- reading a plan ----------
const items = (plan, sections) => plan.blocks.filter((b) => sections.includes(b.section)).flatMap((b) => b.items).filter((i) => !i.rest)
const known = (list) => list.filter((i) => EX[i.exerciseId])
const share = (list, category) => (list.length ? list.filter((i) => EX[i.exerciseId].category === category).length / list.length : 0)

function styleOf(plan, goal) {
  const main = known(items(plan, ["workout"]))
  const all = known(items(plan, ["workout", "conditioning"]))
  if (goal === "cardio" || share(all, "Conditioning") >= 0.9) return "cardio"
  if (main.length === 0) return "circuit"
  if (share(main, "Compound") >= 0.55) return "big"
  if (share(main, "Isolation") >= 0.45) return "targeted"
  return "mixed"
}

// The most common rep range among the logged lifts, e.g. "8-12" ("18-15-12" becomes "12-18")
function typicalReps(plan) {
  const counts = {}
  items(plan, ["workout"]).forEach((i) => {
    if (!i.reps) return
    const nums = String(i.reps).match(/\d+/g)?.map(Number)
    if (!nums) return
    const key = nums.length === 1 ? String(nums[0]) : `${Math.min(...nums)}-${Math.max(...nums)}`
    counts[key] = { n: (counts[key]?.n || 0) + 1, mid: nums.reduce((a, b) => a + b, 0) / nums.length }
  })
  const best = Object.entries(counts).sort((a, b) => b[1].n - a[1].n)[0]
  return best ? { text: best[0], mid: best[1].mid } : null
}

// "3 Rounds · 60-90 secs rest" -> "60-90 sec"
function restOf(plan) {
  for (const b of plan.blocks.filter((x) => x.section === "workout")) {
    const m = /(\d+)(?:-(\d+))?\s*secs?\s*(?:rest|off)/i.exec(b.note || "")
    if (m) return { text: m[2] ? `${m[1]}-${m[2]} sec` : `${m[1]} sec`, long: Number(m[2] || m[1]) > 60 }
  }
  return null
}

function equipmentOf(plan) {
  const used = new Set(known(items(plan, ["workout", "conditioning"])).map((i) => EX[i.exerciseId].equipment))
  if (["barbell", "machine", "cable"].some((e) => used.has(e))) return "gym"
  if (used.has("dumbbell") || used.has("kettlebell")) return "light"
  return "none"
}

const cache = new Map()
export function planProfile(plan) {
  if (cache.has(plan.id)) return cache.get(plan.id)
  const goal = TAG_TO_GOAL[plan.tag] || "build"
  const reps = typicalReps(plan)
  const profile = {
    goal,
    style: styleOf(plan, goal),
    time: plan.minutes <= 40 ? "quick" : plan.minutes <= 50 ? "standard" : "long",
    reps: reps?.text ?? null,
    // 1 = lighter, 2 = moderate, 3 = heavier (from the typical rep count)
    weight: reps ? (reps.mid >= 15 ? 1 : reps.mid >= 9 ? 2 : 3) : null,
    rest: restOf(plan),
    equipment: equipmentOf(plan),
  }
  cache.set(plan.id, profile)
  return profile
}

export const WEIGHT_WORDS = { 1: "Lighter", 2: "Moderate", 3: "Heavier" }

// First few main exercises, e.g. "Back Squats, Hip Thrusters, Sumo Deadlifts +4"
export function insidePreview(plan, count = 3) {
  const names = items(plan, ["workout"]).map((i) => i.name)
  const list = names.length ? names : items(plan, ["conditioning"]).map((i) => i.name)
  const shown = list.slice(0, count).join(", ")
  return list.length > count ? `${shown} +${list.length - count}` : shown
}

// Does a plan match the search words? Looks at name, blurb, goal, style, muscles and exercise names.
export function matchesQuery(plan, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const p = planProfile(plan)
  const haystack = [
    plan.title, plan.blurb, plan.tag, plan.subtitle, GOALS[p.goal].label, STYLES[p.style].label, ...(plan.muscles || []),
    ...plan.blocks.flatMap((b) => b.items.map((i) => i.name)),
  ].join(" ").toLowerCase()
  return words.every((w) => haystack.includes(w))
}

// ---------- "what should I train today" ----------
const UPPER = new Set(["chest", "back", "shoulders", "arms"])
const toTime = (w) => {
  const v = w.started_at || w.created_at
  return v ? new Date(v.replace(" ", "T") + "Z").getTime() : null // database times are UTC
}

// Days since legs / upper body were last trained, and when each plan was last done.
// Only lifts count (warm-ups and conditioning don't build the muscle), and a full-body move counts for both.
export function trainingHistory(workouts = [], now = Date.now()) {
  const last = { legs: null, upper: null }
  const lastPlan = {}
  const later = (a, b) => (a == null || b > a ? b : a)
  for (const w of workouts) {
    const t = toTime(w)
    if (t == null) continue
    for (const ex of w.exercises || []) {
      const e = EX[ex.exercise_id || ex.id]
      if (!e || e.category === "Conditioning" || e.category === "Mobility") continue
      if (e.muscleGroup === "legs" || e.muscleGroup === "full_body") last.legs = later(last.legs, t)
      if (UPPER.has(e.muscleGroup) || e.muscleGroup === "full_body") last.upper = later(last.upper, t)
    }
    if (w.name) lastPlan[w.name] = later(lastPlan[w.name], t)
  }
  const days = (t) => (t == null ? null : Math.max(0, Math.floor((now - t) / DAY)))
  return {
    legs: days(last.legs),
    upper: days(last.upper),
    plans: Object.fromEntries(Object.entries(lastPlan).map(([name, t]) => [name, days(t)])),
    hasHistory: last.legs != null || last.upper != null,
  }
}

const ago = (d) => (d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`)

// Ordered suggestions: the group that has waited longest first, and within it the plan done least recently.
// Cardio-only plans aren't suggested (they don't train the muscles). Never suggests a group trained today
// ahead of one that is due. New users get a short full-body starter.
export function suggestions(plans, history) {
  const pool = plans.filter((p) => p.tag !== "Cardio")
  const lastDone = (p) => history.plans[p.title] // days, or undefined if never done

  if (!history.hasHistory) {
    const starters = pool
      .filter((p) => p.category === "full")
      .sort((a, b) => a.minutes - b.minutes)
    return starters.map((plan) => ({ plan, reason: "A good place to start" }))
  }

  const INF = 9999
  const d = (v) => (v == null ? INF : v)
  const groups = [
    { key: "legs", score: d(history.legs), reason: history.legs == null ? "You haven't trained legs yet" : `You last trained legs ${ago(history.legs)}` },
    { key: "upper", score: d(history.upper), reason: history.upper == null ? "You haven't trained upper body yet" : `You last trained upper body ${ago(history.upper)}` },
    { key: "full", score: Math.min(d(history.legs), d(history.upper)), reason: "Legs and upper body are both due" },
  ].map((g) => (g.score < 1 ? { ...g, score: -1, reason: "You've already trained today. This one is next in line" } : g)) // trained today: move to the back
  const order = ["legs", "upper", "full"]
  groups.sort((a, b) => b.score - a.score || order.indexOf(a.key) - order.indexOf(b.key))

  const out = []
  for (const g of groups) {
    const list = pool
      .filter((p) => p.category === g.key)
      .sort((a, b) => d(lastDone(b)) - d(lastDone(a)) || a.minutes - b.minutes) // never done / done longest ago first
    list.forEach((plan) => out.push({ plan, reason: g.reason }))
  }
  return out
}

export const lastDoneText = (history, plan) => {
  const v = history.plans[plan.title]
  return v == null ? null : v === 0 ? "Done today" : v === 1 ? "Done yesterday" : `Done ${v} days ago`
}
