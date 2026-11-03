// A routine (from a video, or saved) as a section of a workout, and putting it into the workout in progress.
import { currentBlockIndex } from "./workoutModel"

// The time or count and the side: "60 secs · each side"
function stepLine(step) {
  const parts = []
  if (step.seconds) parts.push(`${step.seconds} secs`)
  else if (step.reps) parts.push(`${step.reps} reps`)
  if (step.sides === "each side") parts.push("each side")
  return parts.join(" · ")
}

// What the speaker said about doing it, for a smaller line under the move
function stepTip(step) {
  return [step.how_to, ...(step.cues || []).slice(0, 2)].filter(Boolean).join(" · ").slice(0, 260)
}

// Where a routine sits in the workout: warm-ups and mobility are a warm-up section, cardio a conditioning section, the rest a main section.
const SECTION_FOR_STYLE = { "warm-up": "warmup", mobility: "warmup", cardio: "conditioning" }

// The routine as one ordered list of timed steps for the clock: warm-up, then the main moves (repeated for each set, with the rests
// the video names), then the cool-down. Returns null when a move has no time and the video gave no standard time to use.
export function buildSequence(routine) {
  const st = routine.structure || {}
  const timeOf = (s) => s.seconds ?? st.work_seconds ?? null
  const phase = (name) => routine.steps.filter((s) => (s.phase || "main") === name)
  const step = (s, extra = {}) => ({ name: s.name, secs: timeOf(s), rest: false, at: extra.set > 1 ? null : s.at_seconds ?? null, sub: stepLine({ ...s, seconds: timeOf(s) }), tip: stepTip(s), ...extra }) // `at`: when it starts in the video
  const out = []
  for (const s of phase("warmup")) out.push(step(s, { phase: "warmup" }))
  const main = phase("main")
  const sets = st.sets || 1
  for (let n = 1; n <= sets; n++) {
    main.forEach((s, i) => {
      out.push(step(s, { phase: "main", set: sets > 1 ? n : null }))
      const lastOfSet = i === main.length - 1
      const lastSet = n === sets
      const rest = lastOfSet ? (lastSet ? 0 : st.rest_between_sets_seconds ?? st.rest_seconds ?? 0) : st.rest_seconds ?? 0
      if (rest > 0) out.push({ name: "Rest", secs: rest, rest: true, phase: "main" })
    })
  }
  for (const s of phase("cooldown")) out.push(step(s, { phase: "cooldown" }))
  return out.every((x) => x.rest || x.secs) && out.length ? out : null
}

let seq = 1
export function routineToBlock(routine) {
  const stamp = `${Date.now()}-${seq++}`
  const minutes = routine.total_minutes ? ` · about ${routine.total_minutes} min` : ""
  return {
    id: `routine-${stamp}`,
    section: SECTION_FOR_STYLE[routine.style] ?? "workout",
    tag: String(routine.title || "Routine").toUpperCase().slice(0, 48),
    short: "Routine", // the short name on the progress bar
    title: routine.title || "Routine", // the name it is saved under in your history
    runner: (() => { const steps = buildSequence(routine); return steps ? { steps } : null })(), // the clock, when every move has a time
    note: `${routine.steps.length} moves${minutes}`,
    source: routine.source ?? null, // the video it came from, shown on the section
    items: routine.steps.map((s, i) => ({
      key: `${stamp}-${i}`, name: s.name, sub: stepLine(s), tip: stepTip(s), exerciseId: null, rest: false, alternatives: [],
      logged: false, targetReps: null, targetSeconds: null, track: null, sets: null, done: false,
    })),
  }
}

export const hasActiveWorkout = () => {
  try { return !!JSON.parse(localStorage.getItem("activeWorkout") || "null") } catch { return false }
}

export function activeWorkoutTitle() {
  try { const w = JSON.parse(localStorage.getItem("activeWorkout") || "null"); return w ? { title: w.presetTitle || "Today's workout", done: w.blocks.filter((b) => b.completed).length, total: w.blocks.length } : null } catch { return null }
}

// Puts the routine into the workout in progress: "first", "next" (after the section you are on) or "last". Returns the new section's id.
export function addRoutineToActiveWorkout(routine, where) {
  const w = JSON.parse(localStorage.getItem("activeWorkout") || "null")
  if (!w) return null
  const block = routineToBlock(routine)
  const current = currentBlockIndex(w.blocks)
  const at = where === "first" ? 0 : where === "next" ? (current === -1 ? w.blocks.length : current + 1) : w.blocks.length
  w.blocks = [...w.blocks.slice(0, at), block, ...w.blocks.slice(at)]
  localStorage.setItem("activeWorkout", JSON.stringify(w))
  return block.id
}
