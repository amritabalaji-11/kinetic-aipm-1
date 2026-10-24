// The workout being logged ("activeWorkout") is a list of blocks, in the plan's order:
//   block = { id, section, tag, note, items: [item] }
//   item  = { key, name, sub, exerciseId, rest, alternatives, logged,
//             targetReps, sets: [{ id, weight, reps, completed }], done }
// `logged` items (rep-based lifts) get weight and reps rows. Other items are follow-along: tick `done`.
import { getExercise } from "./exerciseCatalog"

let seq = 1
const uid = () => `${Date.now()}-${seq++}`

export const emptySet = () => ({ id: uid(), weight: "", reps: "", completed: false })
const emptySets = (n) => Array.from({ length: n }, emptySet)

// From the planner screen's blocks (a plan, possibly with swapped exercises)
export function blocksFromPlanner(plannerBlocks) {
  return plannerBlocks.map((b) => ({
    id: uid(), section: b.section, tag: b.tag, note: b.note,
    items: b.items.map((it) => {
      const logged = !!(it.exerciseId && it.sets)
      return {
        key: uid(), name: it.name, sub: it.sub || "", exerciseId: it.exerciseId || null,
        rest: !!it.rest, alternatives: it.alternatives || [],
        logged, targetReps: logged ? it.reps : null, sets: logged ? emptySets(it.sets) : null, done: false,
      }
    }),
  }))
}

// From the "Create your own" builder: exercises linked with linkNext form one superset block
export function blocksFromBuilder(items) {
  const runs = []
  let run = []
  items.forEach((it, i) => {
    run.push(it)
    if (!it.linkNext || i === items.length - 1) { runs.push(run); run = [] }
  })
  return runs.map((r, n) => {
    const multi = r.length > 1
    return {
      id: uid(), section: "workout",
      tag: multi ? `SUPERSET ${n + 1}` : `EXERCISE ${n + 1}`,
      note: multi ? `${r[0].sets} Rounds` : `${r[0].sets} sets × ${r[0].reps} reps`,
      items: r.map((it) => {
        const ex = getExercise(it.exerciseId)
        return {
          key: uid(), name: ex.name, sub: `${it.reps} reps`, exerciseId: ex.id, rest: false, alternatives: [],
          logged: true, targetReps: String(it.reps), sets: emptySets(it.sets), done: false,
        }
      }),
    }
  })
}

// Workouts saved by the older screens have a flat `exercises` list and no blocks
export function ensureBlocks(workout) {
  if (!workout || workout.blocks) return workout
  const blocks = (workout.exercises || []).map((ex, i) => ({
    id: uid(), section: "workout", tag: `EXERCISE ${i + 1}`, note: ex.targetSets ? `${ex.targetSets} sets` : `${ex.sets.length} sets`,
    items: [{
      key: uid(), name: ex.name, sub: ex.targetReps ? `${ex.targetReps} reps` : "", exerciseId: ex.id, rest: false, alternatives: [],
      logged: true, targetReps: ex.targetReps ?? null, done: false,
      sets: ex.sets.map((s) => ({ id: String(s.id), weight: s.weight ?? "", reps: s.reps ?? "", completed: !!s.completed })),
    }],
  }))
  const { exercises, ...rest } = workout
  return { ...rest, blocks }
}

export const isActionable = (it) => !it.rest
export const itemHasEntries = (it) =>
  it.logged ? it.sets.some((s) => s.weight !== "" || s.reps !== "" || s.completed) : !!it.done

// A section is finished when the user taps its "done" button (block.completed), so a user who has
// ticked every set still decides when to move on. Rest-only blocks have nothing to do.
export function isBlockComplete(block) {
  if (!block.items.some(isActionable)) return true
  return !!block.completed
}

// All rep-based sets in the block are ticked (timed or follow-along items don't have to be)
export const allSetsTicked = (block) => {
  const logged = block.items.filter((it) => it.logged)
  return logged.every((it) => it.sets.length > 0 && it.sets.every((s) => s.completed))
}

// First block that still has work to do (rest-only blocks are skipped). -1 when everything is done.
export function currentBlockIndex(blocks) {
  return blocks.findIndex((b) => b.items.some(isActionable) && !isBlockComplete(b))
}

// "3 Rounds · 60-90 secs rest" -> 90. Falls back to 90.
export function restSecondsFromNote(note = "") {
  const secs = note.match(/(\d+)(?:-(\d+))?\s*secs?\s*(?:rest|off)/i)
  if (secs) return Number(secs[2] || secs[1])
  const mins = note.match(/(\d+)\s*mins?\s*rest/i)
  if (mins) return Number(mins[1]) * 60
  return 90
}

// What gets saved when the workout finishes: only ticked sets, grouped by exercise.
export function flattenForSave(workout) {
  const exercises = []
  for (const b of workout.blocks) {
    for (const it of b.items) {
      if (!it.logged) continue
      const sets = it.sets
        .filter((s) => s.completed && (s.weight !== "" || s.reps !== ""))
        .map((s) => ({ weight: s.weight, reps: s.reps }))
      if (sets.length) exercises.push({ id: it.exerciseId, name: getExercise(it.exerciseId)?.name || it.name, sets })
    }
  }
  return { ...workout, exercises }
}

// What the person does next, for the "Next up" card: the next unticked set (both exercises of a pair, if it is one),
// or the next follow-along exercises, or the start of the next section. null when nothing is left.
export function nextUpItems(blocks) {
  const bi = currentBlockIndex(blocks)
  if (bi === -1) return null
  const block = blocks[bi]
  const pick = (it, label) => ({ key: it.key, exerciseId: it.exerciseId, name: it.name, label })

  const logged = block.items.filter((it) => it.logged)
  const rounds = Math.max(0, ...logged.map((it) => it.sets.length))
  for (let r = 0; r < rounds; r++) {
    const pending = logged.filter((it) => it.sets[r] && !it.sets[r].completed)
    if (pending.length) return { tag: block.tag, items: pending.slice(0, 2).map((it) => pick(it, `Set ${r + 1} of ${rounds}`)) }
  }
  const todo = block.items.filter((it) => !it.logged && !it.rest && !it.done)
  if (todo.length) return { tag: block.tag, items: todo.slice(0, 2).map((it) => pick(it, it.sub || "")) }

  // this section is done, so look at the one after it
  const nextBlock = blocks.slice(bi + 1).find((b) => b.items.some(isActionable) && !isBlockComplete(b))
  if (!nextBlock) return null
  const first = nextBlock.items.filter(isActionable).slice(0, 2)
  return {
    tag: nextBlock.tag,
    items: first.map((it) => pick(it, it.logged ? `Set 1 of ${it.sets.length}` : it.sub || "")),
  }
}
