// The kinds of set a block can be, what each one means, and how a block changes from one kind to another.
// A block's kind is read from its label (tag), e.g. "SUPERSET 1" or "5 MIN EMOM", so the plans need no extra data.
// Strength and metcon kinds can be changed within their family. Endurance, metcon, chipper, rounds for time and cardio only get an (i) explanation.
// Warm-ups, rests and other blocks have no kind: no (i) and no Change button.

export const SET_TYPES = {
  straight: { name: "Straight sets", family: "strength", size: 1, meaning: "One exercise at a time. Finish all its sets, then move on." },
  superset: { name: "Superset", family: "strength", size: 2, meaning: "Two exercises back to back with no rest between, then rest. Saves time and keeps you working." },
  triset: { name: "Tri-set", family: "strength", size: 3, meaning: "Three exercises back to back, then rest." },
  giant: { name: "Giant set", family: "strength", size: 4, meaning: "Four or more exercises in a row, then rest. Tiring, so use lighter weights." },
  pyramid: { name: "Pyramid", family: "strength", size: 1, meaning: "Reps go up then down (2-4-6-8-6-4-2), with the weight adjusted to match." },
  emom: { name: "EMOM", family: "timed", meaning: "Every Minute On the Minute. Start the work at the top of each minute and rest for what's left. Example: 40 secs work, 20 secs rest, then go again." },
  amrap: { name: "AMRAP", family: "timed", meaning: "As Many Rounds As Possible. Cycle through the exercises until time runs out and count your rounds." },
  tabata: { name: "Alternating Tabata", family: "timed", meaning: "20 seconds on, 10 off, 8 rounds. Two exercises take turns, 4 rounds each." },

  // Explained with an (i) but never swapped: no Change button
  endurance: { name: "Muscular endurance", family: "info", meaning: "Lighter weights, lots of reps and short rests, so your muscles keep working for longer. In these plans the reps drop each round, for example 18, then 15, then 12." },
  metcon: { name: "Metcon", family: "info", meaning: "Short for metabolic conditioning. A hard, timed block with little rest that keeps your heart rate high. It can be rounds, an AMRAP or an EMOM. The note next to the label says which." },
  chipper: { name: "Chipper", family: "info", meaning: "Work down the list once, finishing all the reps of one exercise before the next, as fast as you can. Think of it as chipping away at a long list." },
  fortime: { name: "Rounds for time", family: "info", meaning: "Do the set number of rounds and time yourself. Next time, try to beat it." },
  cardio: { name: "Cardio", family: "info", meaning: "Running, rowing or cycling, steady or in intervals, to raise your heart rate and build stamina." },
}

export const FAMILIES = {
  // Pyramid is defined above but not offered yet: it needs a different rep target for every round
  strength: { title: "STRENGTH", types: ["straight", "superset", "triset", "giant"] },
  timed: { title: "METCON", types: ["emom", "amrap", "tabata"] },
}

// The label as the plans write it, e.g. "TRISET 1"
const TAG_NAME = { straight: "STRAIGHT SETS", superset: "SUPERSET", triset: "TRISET", giant: "GIANT SET", pyramid: "PYRAMID" }
const TABATA_NOTE = "00:20 secs work, 00:10 secs off · 8 rounds · 4 rounds each exercise"
const TIMED_NOTE = { emom: "Every Minute on the Minute", amrap: "As Many Rounds As Possible", tabata: TABATA_NOTE }
const PYRAMID_NOTE = "2-4-6-8-6-4-2 reps"
const DEFAULT_MINUTES = 5

const real = (block) => block.items.filter((i) => !i.rest)

// What kind a block is, or null when it is none of the ones above
export function typeOfBlock(block) {
  const tag = (block.tag || "").toUpperCase()
  if (/^ISOLATION|^STRAIGHT SETS?\b/.test(tag)) return "straight"
  if (/^PYRAMID\b/.test(tag)) return "pyramid"
  if (/SUPERSET/.test(tag)) return "superset"
  if (/TRI ?SET/.test(tag)) return "triset"
  if (/GIANT SET/.test(tag)) return "giant"
  if (/TABATA/.test(tag)) return "tabata"
  if (/\bEMOM\b/.test(tag)) return "emom"
  if (/\bAMRAP\b/.test(tag)) return "amrap"
  if (/CHIPPER/.test(tag)) return "chipper"
  if (/ENDURANCE/.test(tag)) return "endurance"
  if (/METCON/.test(tag)) return "metcon"
  if (/CARDIO|\bRUN\b/.test(tag)) return "cardio"
  if (/\bROUNDS\b|CIRCUIT/.test(tag)) return "fortime"
  return null
}

// Only the main workout and conditioning blocks can be changed (warm-ups are left alone)
export const isChangeable = (block) => {
  const type = typeOfBlock(block)
  if (!type) return false
  const family = SET_TYPES[type].family
  if (family === "strength") return block.section === "workout"
  if (family === "timed") return block.section === "conditioning"
  return false
}

export const minutesOf = (block) => Number(/(\d+)\s*MIN/i.exec(block.tag || "")?.[1]) || DEFAULT_MINUTES

// A single exercise that could be pulled into the block above it
const isSingle = (block, section) => block && block.section === section && typeOfBlock(block) === "straight" && real(block).length === 1

// For each type, whether it can be chosen for this block and what happens, e.g. { ok: true, effect: "Joins with the next exercise" }
export function optionsFor(blocks, index) {
  const block = blocks[index]
  const current = typeOfBlock(block)
  const family = SET_TYPES[current].family
  const n = real(block).length
  const out = {}
  for (const id of FAMILIES[family].types) {
    const t = SET_TYPES[id]
    if (id === current) { out[id] = { ok: true, current: true }; continue }
    if (family === "timed") {
      out[id] = id === "tabata" && n !== 2 ? { ok: false, why: "Needs exactly 2 exercises" } : { ok: true }
      continue
    }
    if (id === "straight") { out[id] = { ok: true, effect: n > 1 ? "Splits into single exercises" : null }; continue }
    if (id === "pyramid") { out[id] = n === 1 ? { ok: true } : { ok: false, why: "One exercise at a time" }; continue }
    const need = t.size // superset 2, tri-set 3, giant 4
    if (id === "giant" ? n >= need : n === need) { out[id] = { ok: true }; continue }
    if (n > need) { out[id] = { ok: true, effect: `Keeps the first ${need}, the rest become single exercises` }; continue }
    const missing = need - n
    const followers = Array.from({ length: missing }, (_, k) => blocks[index + 1 + k])
    out[id] = followers.every((b) => isSingle(b, block.section))
      ? { ok: true, effect: missing === 1 ? "Joins with the exercise below" : `Joins with the ${missing} exercises below` }
      : { ok: false, why: missing === 1 ? "Needs a single exercise below it" : `Needs ${missing} single exercises below it` }
  }
  return out
}

// Number the strength blocks again after a change: STRAIGHT SETS 1, 2 ... SUPERSET 1, 2 ... (labels with a prefix or other shape are left alone)
function renumber(blocks) {
  const seen = {}
  return blocks.map((b) => {
    const type = typeOfBlock(b)
    if (!type || SET_TYPES[type].family !== "strength" || b.section !== "workout") return b
    if (!/^[A-Z][A-Z ]*[A-Z] \d+$/.test(b.tag)) return b
    seen[type] = (seen[type] || 0) + 1
    return { ...b, tag: `${TAG_NAME[type]} ${seen[type]}` }
  })
}

const baseNote = (block) => (block.note && /round|set/i.test(block.note) ? block.note : "3 Rounds · 60-90 secs rest")

function asStrength(items, type, note) {
  return { section: "workout", tag: `${TAG_NAME[type]} 1`, note: type === "pyramid" ? PYRAMID_NOTE : note, items }
}

// The plan's blocks after block `index` becomes `target`. Never changes the exercises, only how they are grouped and labelled.
export function changeType(blocks, index, target, { minutes } = {}) {
  const block = blocks[index]
  const current = typeOfBlock(block)
  const opt = optionsFor(blocks, index)[target]
  if (!opt?.ok || target === current) return blocks
  const family = SET_TYPES[target].family

  if (family === "timed") {
    const mins = target === "tabata" ? 4 : minutes ?? minutesOf(block)
    const items = target === "emom" ? block.items : block.items.filter((i) => !i.rest) // only EMOM keeps its rest steps
    const tag = target === "tabata" ? "4 MIN ALTERNATING TABATA" : `${mins} MIN ${SET_TYPES[target].name.toUpperCase()}`
    return blocks.map((b, i) => (i === index ? { ...b, tag, note: TIMED_NOTE[target], items } : b))
  }

  const note = baseNote(block)
  const items = block.items
  const before = blocks.slice(0, index)
  let after = blocks.slice(index + 1)
  let made

  if (target === "straight") {
    made = real(block).length > 1 ? real(block).map((it) => asStrength([it], "straight", note)) : [asStrength(items, "straight", note)]
  } else if (target === "pyramid") {
    made = [asStrength(items, "pyramid", note)]
  } else {
    const size = SET_TYPES[target].size
    let group = items
    const have = group.filter((i) => !i.rest).length
    if (target !== "giant" && have > size) {
      group = real(block).slice(0, size)
      made = [asStrength(group, target, note), ...real(block).slice(size).map((it) => asStrength([it], "straight", note))]
    } else {
      if (have < size) {
        const take = size - have
        group = [...items, ...after.slice(0, take).flatMap((b) => real(b))]
        after = after.slice(take)
      }
      made = [asStrength(group, target, note)]
    }
  }
  return renumber([...before, ...made, ...after])
}
