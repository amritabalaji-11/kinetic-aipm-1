import { MIN_REPS } from "./analysisRules.js"

// Turns one analysis into the plain-language results screen: up to 2 things that went well,
// up to 2 things to work on (never forced), a reminder for the exercise, and a "try more weight" nudge.
//
// Rules (draft v1, kept in this one file so they are easy to change after a trainer looks at real samples):
//  - Work on: safety-related first (posture, stability), then pace (from the measured lowering time).
//  - Pace is built from measured timing, so it says what actually happened. "You sped up as the set went on"
//    is only said when the reps really did get faster; otherwise it just says how quick the lowering was.
//  - Posture, stability and depth come from the coaching text. Its own sentence is the headline, so the heading
//    always matches what the user did. Programming advice ("3x8 ... next session") is never shown as a cue.
//  - Depth is never a fault by itself: people's hips differ. It can only be praised.
//  - Nothing is invented: if nothing clearly failed, the screen says "You did great!".

const FIX_BELOW = 75
const GOOD_AT = 80

// Lowering time bands, in seconds (draft, from common coaching guidance of about 2 to 4 s down).
const QUICK_BELOW = 0.6      // matches the backend: a drop, not a lowering. Almost nobody lowers slower than this.
const CONTROLLED_UP_TO = 4.5

// Shown on the results screen for the exercise. Wording is a draft from the app owner's trainer conversation.
const REMINDERS = [
  {
    match: /goblet/,
    lines: [
      "Breathe in as you lower, out as you stand up.",
      "Push the floor away to drive up. Power comes from your legs, not your knees.",
      "You shouldn't feel this in your lower back. If you do, lighten the weight or stop.",
    ],
  },
]

export function reminderFor(exerciseId) {
  const id = String(exerciseId || "").toLowerCase()
  const hit = REMINDERS.find((r) => r.match.test(id))
  return hit ? hit.lines : null
}

// "Keep your chest tall — brace first." -> "Keep your chest tall."
function firstSentence(text, max = 170) {
  if (!text || typeof text !== "string") return ""
  const clean = text.replace(/\s+/g, " ").trim()
  const cut = clean.split(/(?<=[.!?])\s|\s[—–]\s/)[0] || clean
  const out = cut.length > max ? cut.slice(0, max - 1).trimEnd() + "…" : cut
  return /[.!?…]$/.test(out) ? out : out + "."
}

// A cue is something you can do on the next set. Training plans ("3x8 ...", "next session") are not.
const PROGRAMMING = /\b\d+\s*[x×]\s*\d+\b|\bsets?\b|\bsessions?\b|\bweeks?\b|\bplate\b|\bdrills?\b/i
function cleanCue(text) {
  const s = firstSentence(text)
  return s && !PROGRAMMING.test(s) ? s : ""
}

const median = (a) => {
  const b = [...a].sort((x, y) => x - y)
  const m = Math.floor(b.length / 2)
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2
}
const secs = (n) => `${(Math.round(n * 10) / 10).toString()} seconds`

// Pace, from the measured time each rep took to lower. Returns { kind: "fix" | "good", ... } or null.
function paceItem(reps) {
  const ecc = reps.map((r) => r?.tempo?.eccentric).filter((n) => typeof n === "number" && n > 0)
  if (ecc.length < 3) return null // not enough measured reps: say nothing

  const third = Math.max(1, Math.floor(ecc.length / 3))
  // Typical rep at the start vs typical rep at the end (medians, so one odd rep can't fake a trend).
  const first = median(ecc.slice(0, third))
  const last = median(ecc.slice(-third))
  const speedingUp = ecc.length >= 6 && first - last >= 0.3 && last <= first * 0.75
  const typical = median(ecc)

  if (speedingUp) {
    return {
      kind: "fix",
      key: "pace",
      title: "You sped up as the set went on.",
      detail: `Your lowering went from about ${secs(first)} to ${secs(last)}.`,
      cue: "Count to 2 on the way down, even on the last reps.",
    }
  }
  if (typical < QUICK_BELOW) {
    return {
      kind: "fix",
      key: "pace",
      title: "You dropped into the squat on most reps.",
      detail: "",
      cue: "For more control at the bottom, count to 2 on the way down.",
    }
  }
  if (typical <= CONTROLLED_UP_TO) {
    return {
      kind: "good",
      key: "pace",
      title: `You lowered with control, about ${secs(typical)} down.`,
      detail: "",
    }
  }
  return null
}

// Analyses made with the newer prompt carry the items already written in plain language. Use them as written,
// after two checks the AI is told to follow but that we enforce here too:
//  1. Praise must hold on MORE than half of the reps. One good rep out of three is not "went well". A problem must
//     show on at least 2 reps: one odd rep is not an item.
//  2. One topic, one list. If the same topic is in both, the side that held on more reps stays (and only if that is
//     more than half the reps). If we can't tell, the problem stays and the praise goes.
function fromWrittenItems(items, repTotal) {
  const clean = (t) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim() : "")
  const count = (n) => (n === null || n === undefined || n === "" || !Number.isFinite(Number(n)) ? null : Number(n))
  const flaggedOf = (i) => (Array.isArray(i.reps_flagged) ? i.reps_flagged.map(Number).filter((n) => Number.isFinite(n) && n > 0) : null)
  const withOf = (i) => { const f = flaggedOf(i); return f ? f.length : count(i.reps_with) }
  const half = repTotal > 0 ? repTotal / 2 : 0

  const rawGood = (items.went_well || [])
    .map((i) => ({ topic: clean(i.topic), withReps: withOf(i), flagged: flaggedOf(i), title: clean(i.headline), detail: clean(i.detail) }))
    .filter((i) => i.title)
  const rawFix = (items.work_on || [])
    .map((i) => ({ topic: clean(i.topic), withReps: withOf(i), flagged: flaggedOf(i), title: clean(i.headline), why: clean(i.why), cue: clean(i.cue) }))
    .filter((i) => i.title)

  // 1. majority rule for praise (only when the AI gave a count and we know the rep total)
  let good = rawGood.filter((g) => g.withReps === null || !half || g.withReps > half)
  // a problem must be a pattern too: one odd rep is not an item
  rawFix.splice(0, rawFix.length, ...rawFix.filter((f) => f.withReps === null || f.withReps >= 2))
  // depth is never a "work on": hips and ankles differ. The app suggests it separately, and only gently (see tryNext).
  rawFix.splice(0, rawFix.length, ...rawFix.filter((f) => f.topic !== "depth"))

  // 2. one topic, one list
  const dropGood = new Set()
  const dropFix = new Set()
  for (const g of good) {
    if (!g.topic || g.topic === "other") continue
    const f = rawFix.find((x) => x.topic === g.topic)
    if (!f) continue
    const goodWins = g.withReps !== null && f.withReps !== null && g.withReps > f.withReps && (!half || g.withReps > half)
    if (goodWins) dropFix.add(f)
    else dropGood.add(g)
  }
  good = good.filter((g) => !dropGood.has(g))
  let fix = rawFix.filter((f) => !dropFix.has(f))

  // the same topic twice in one list: keep the first
  const firstOnly = (list) => {
    const seen = new Set()
    return list.filter((i) => {
      if (!i.topic || i.topic === "other") return true
      if (seen.has(i.topic)) return false
      seen.add(i.topic)
      return true
    })
  }
  good = firstOnly(good).slice(0, 2).map((g) => ({ key: "w:" + g.title, title: g.title, detail: g.detail, flagged: g.flagged }))
  fix = firstOnly(fix).slice(0, 2).map((f) => ({ key: "f:" + f.title, topic: f.topic, title: f.title, detail: "", why: f.why, cue: f.cue, flagged: f.flagged }))
  return { good, fix }
}

// WHAT THE SCREEN SHOWS (one table, so the pieces can never contradict each other)
//
//   Work on has items            -> Work on, and Went well if it has items. Nothing else: no banner, no Try next, no nudge.
//   Work on empty, Went well has -> "You did great!" banner + Went well (+ weight nudge if earned).
//   items, no Try next
//   Work on empty, Try next      -> Went well (if any) + Try next. No banner: "nothing to fix" and "try this" would clash.
//   Very shallow depth           -> the "bodyweight first" Try next card shows even when Work on has items (and then no banner, no nudge).
//   Filmed from the front        -> one note saying knees and timing are checked, and lean, depth and ankle range need a side view (whatever else is shown).
//   Nothing at all, side view    -> nothing. No empty "nothing stood out" box.
//   Fewer than the minimum reps  -> the "film again" card only (handled by the page).
export function buildFeedback({ params = {}, coaching = {}, reps = [], repScores = [], exerciseId = "" }) {
  const good = []
  const fix = []
  const written = coaching.feedback_items
  const hasWritten = !!written && Array.isArray(written.went_well) && Array.isArray(written.work_on)
  const scoreOf = (k) => (typeof params?.[k]?.score === "number" && params[k].score > 0 ? params[k].score : null)

  if (hasWritten) {
    const w = fromWrittenItems(written, reps.length || repScores.length)
    good.push(...w.good)
    fix.push(...w.fix)
  } else {
    // 1. Safety-related: posture, then stability. Headline = the coaching text's own sentence.
    for (const key of ["posture", "stability"]) {
      const score = scoreOf(key)
      if (score == null) continue
      const entry = params[key]
      if (score < FIX_BELOW) {
        const title = firstSentence(entry.observation)
        if (title && fix.length < 2) fix.push({ key, title, detail: "", cue: cleanCue(entry.correction) })
      } else if (score >= GOOD_AT) {
        const title = firstSentence(entry.affirmation)
        if (title && good.length < 2) good.push({ key, title, detail: "" })
      }
    }

    // 2. Pace: measured. If we couldn't measure it, fall back to the movement-control text.
    const pace = paceItem(reps)
    if (pace) {
      const { kind, ...item } = pace
      if (kind === "fix" && fix.length < 2) fix.push(item)
      if (kind === "good" && good.length < 2) good.push(item)
    } else {
      const score = scoreOf("movement_quality")
      const entry = params.movement_quality
      if (score != null && score < FIX_BELOW && fix.length < 2) {
        const title = firstSentence(entry.observation)
        if (title) fix.push({ key: "movement_quality", title, detail: "", cue: cleanCue(entry.correction) })
      }
    }

    // 3. Depth can only be praised, never faulted.
    const depthScore = scoreOf("range_of_motion")
    if (depthScore != null && depthScore >= GOOD_AT && good.length < 2) {
      const title = firstSentence(params.range_of_motion.affirmation)
      if (title) good.push({ key: "depth", title, detail: "" })
    }

    // The first fix needs a cue. Use the coach's own focus line if it is a real cue.
    if (fix.length && !fix[0].cue) {
      fix[0].cue = cleanCue((coaching.next_session_focus || [])[0])
    }

  }

  // Depth. The backend measures how low the hips get against the knees and flags "short" or "very shallow" when that holds
  // on most reps (side and angled views only). Older analyses fall back to the per-rep depth label.
  // Short: a gentle "try next", only when nothing else needs work. Very shallow: always shown, because it matters most.
  // Short depth and praise for depth can never both stand.
  const sg = coaching.signals
  let depthShort = false
  let veryShallow = false
  if (sg && typeof sg.depth_short === "boolean") {
    depthShort = sg.depth_short
    veryShallow = !!sg.depth_very_shallow
  } else {
    const labelled = reps.map((r) => r?.depth).filter(Boolean)
    const considered = labelled.length > 5 ? reps.slice(1).map((r) => r?.depth).filter(Boolean) : labelled
    const shortReps = considered.filter((d) => d !== "Good" && d !== "Excellent").length
    depthShort = considered.length >= MIN_REPS - 1 && shortReps > considered.length / 2
  }
  let tryNext = null
  if (depthShort || veryShallow) {
    for (let k = good.length - 1; k >= 0; k--) if (/depth/i.test(good[k].key + " " + good[k].title)) good.splice(k, 1)
    if (veryShallow) {
      tryNext = {
        title: "Your squats were quite shallow.",
        why: "Building range first makes every rep stronger and safer.",
        cue: "Try bodyweight squats first, then add the weight back.",
      }
    } else if (fix.length === 0) {
      tryNext = {
        title: "You could try sitting a little lower.",
        why: "More range works your legs and glutes through more of the movement.",
        cue: "Only if it feels comfortable, and keep it controlled: lower slowly, sit your hips back, keep your back steady, and push the floor away as you stand.",
      }
    }
  }

  // Rep by rep: the first reps vs the last, in plain terms.
  const n = repScores.length
  const early = n >= 2 ? (repScores[0] + repScores[1]) / 2 : null
  const late = n >= 2 ? (repScores[n - 2] + repScores[n - 1]) / 2 : null
  const heldUp = early != null && late != null && early - late <= 5

  const measured = ["posture", "stability", "movement_quality"].map(scoreOf).filter((x) => x != null)
  const allStrong = measured.length > 0 && measured.every((x) => x >= GOOD_AT)
  const nudge = n >= 10 && heldUp && allStrong && fix.length === 0

  // The rep the picture was taken from (lowest score), so the caption can say which rep it is.
  let toughestRep = null
  if (n > 0) {
    let lowest = 0
    repScores.forEach((s, i) => { if (s < repScores[lowest]) lowest = i })
    toughestRep = lowest + 1
  }

  return {
    good,
    fix,
    great: fix.length === 0 && good.length > 0 && !tryNext,
    empty: fix.length === 0 && good.length === 0,
    heldUp,
    nudge,
    tryNext,
    cameraView: coaching.signals?.camera_view || null,
    toughestRep,
    repTotal: reps.length || repScores.length,
    reminder: reminderFor(exerciseId),
  }
}

// What is read aloud for each section. Same words as on the screen, with a friendly lead-in.
export const spoken = {
  good: (items) =>
    items.length ? ["Nice work.", ...items.map((i) => i.title)].join(" ") : "",
  work: (items) =>
    items.length
      ? items
          .map((i, idx) => (idx === 0 ? "Next set, focus on this. " : "Also. ") + i.title + " " + (i.why || "") + " " + (i.detail || "") + " " + (i.cue || ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      : "",
  tryNext: (t) => (t ? "Try next. " + [t.title, t.why, t.cue].filter(Boolean).join(" ") : ""),
  reminder: (lines) => (lines && lines.length ? "Coach's reminder. " + lines.join(" ") : ""),
}
