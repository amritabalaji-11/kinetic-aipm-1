// The workout being logged ("activeWorkout") is a list of blocks, in the plan's order:
//   block = { id, section, tag, note, items: [item] }
//   item  = { key, name, sub, exerciseId, rest, alternatives, logged,
//             targetReps, targetSeconds, track: { weight, reps, time },
//             sets: [{ id, weight, reps, seconds, completed }], done }
// `logged` items get a row per round. `track` says which of weight, reps and time that row asks for (all optional).
// Other items are follow-along: tick `done`.
import { getExercise } from "./exerciseCatalog"

let seq = 1
const uid = () => `${Date.now()}-${seq++}`

export const emptySet = () => ({ id: uid(), weight: "", reps: "", seconds: "", completed: false })
const emptySets = (n) => Array.from({ length: n }, emptySet)

// What a row asks for, when the item doesn't say (items saved before time existed, or added by hand): weight and reps
export const DEFAULT_TRACK = { weight: true, reps: true, time: false }
export const trackOf = (it) => it.track ?? DEFAULT_TRACK

// "40 secs · hands off the ground" -> 40. null when the line has no time in it.
export const secondsFromSub = (sub = "") => {
  const m = /(\d+)\s*(?:secs?|seconds?)\b/i.exec(sub)
  return m ? Number(m[1]) : null
}
// "3 Rounds · 60-90 secs rest" -> 3. Falls back to 3.
export const roundsFromNote = (note = "") => Number(/(\d+)\s*rounds?/i.exec(note)?.[1]) || 3

// Can this set be ticked? It needs a value in the first thing asked for: reps if reps are tracked, otherwise weight or time.
export const canTickSet = (it, s) => {
  const t = trackOf(it)
  if (t.reps) return s.reps !== ""
  return (t.weight && s.weight !== "") || (t.time && s.seconds !== "" && s.seconds != null)
}
const hasValue = (s) => s.weight !== "" || s.reps !== "" || (s.seconds !== "" && s.seconds != null)

// From the planner screen's blocks (a plan, possibly with swapped exercises)
export function blocksFromPlanner(plannerBlocks) {
  return plannerBlocks.map((b) => ({
    id: uid(), section: b.section, tag: b.tag, note: b.note,
    items: b.items.map((it) => {
      const withSets = !!(it.exerciseId && it.sets)
      // a timed exercise in the main workout gets a row per round too, with a clock (warm-ups and drills stay a tick list)
      const secs = !withSets && it.exerciseId && b.section === "workout" ? secondsFromSub(it.sub) : null
      const logged = withSets || secs !== null
      return {
        key: uid(), name: it.name, sub: it.sub || "", exerciseId: it.exerciseId || null,
        rest: !!it.rest, alternatives: it.alternatives || [],
        logged, targetReps: withSets ? it.reps : null, targetSeconds: secs,
        track: withSets ? { weight: true, reps: true, time: false } : secs !== null ? { weight: false, reps: false, time: true } : null,
        sets: withSets ? emptySets(it.sets) : secs !== null ? emptySets(roundsFromNote(b.note)) : null, done: false,
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
          logged: true, targetReps: String(it.reps), track: { ...DEFAULT_TRACK }, sets: emptySets(it.sets), done: false,
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
  it.logged ? it.sets.some((s) => hasValue(s) || s.completed) : !!it.done

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
  const mins = note.match(/(\d+)\s*min(?:ute)?s?\s*rest/i)
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
        .filter((s) => s.completed && hasValue(s))
        .map((s) => ({ weight: s.weight, reps: s.reps, seconds: s.seconds ?? "" }))
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


// A short name for the progress bar: "CONDITIONING · PART A" -> "Cond. A", "STRAIGHT SETS 2" -> "Straight 2"
export function shortSectionName(tag = "") {
  const t = tag.trim().replace(/^(STRENGTH|OPTION \d)\s*·\s*/i, "") // "STRENGTH · TRISET 1" -> "TRISET 1", "OPTION 2 · CORE CIRCUIT" -> "CORE CIRCUIT"
  if (/MOBILITY/i.test(t) && !/STRUCTURED/i.test(t)) return "Mobility"
  if (/WARM/i.test(t)) return "Warm-up"
  let m = /^CONDITIONING\s*·\s*PART\s*(\w+)/i.exec(t)
  if (m) return `Cond. ${m[1].toUpperCase()}`
  m = /CHIPPER\s*·?\s*PART\s*(\w+)/i.exec(t)
  if (m) return `Chipper ${m[1]}`
  m = /^MUSC\w*\s+ENDURANCE\s*(\d*)/i.exec(t)
  if (m) return `Endurance${m[1] ? ` ${m[1]}` : ""}`
  if (/TABATA/i.test(t)) return "Tabata"
  m = /^(\d+)\s*MIN\s+(EMOM|AMRAP)/i.exec(t)
  if (m) return `${m[1]} min ${m[2].toUpperCase()}`
  m = /^STRAIGHT SETS\s*(\d+)/i.exec(t)
  if (m) return `Straight ${m[1]}`
  const words = t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return words.length > 16 ? `${words.slice(0, 15)}…` : words
}
