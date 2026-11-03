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

let seq = 1
export function routineToBlock(routine) {
  const stamp = `${Date.now()}-${seq++}`
  const minutes = routine.total_minutes ? ` · about ${routine.total_minutes} min` : ""
  return {
    id: `routine-${stamp}`,
    section: SECTION_FOR_STYLE[routine.style] ?? "workout",
    tag: String(routine.title || "Routine").toUpperCase().slice(0, 48),
    short: "Routine", // the short name on the progress bar
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
