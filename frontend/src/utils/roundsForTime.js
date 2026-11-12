// "Rounds for time": a section whose note says how many rounds to do and how long to rest after every round, for example
// "4 Rounds · each for TIME · 60 secs rest after every round". Each round is timed, and the rest after it starts by itself.
//
//   block.roundLog = { n, restEndsAt, rounds: [ { startedAtMs, pausedBase, ticks: [item keys], endedAtMs?, secs? } ] }
//
// Everything here is plain functions of the log and the time, so the screen only has to show the result. The workout can be paused:
// `pause` is { total, at } = the workout's pausedTotalMs and pausedAtMs, and paused time is left out of a round's time.
import { restSecondsFromNote } from "./restNote"

// What this section asks for, or null when it is not a rounds-for-time section (logged strength blocks, timed EMOM/AMRAP/Tabata, video routines)
export function roundsSpec(block) {
  if (!block || block.runner || block.title) return null
  const items = (block.items || []).filter((it) => !it.rest)
  if (items.length === 0 || items.some((it) => it.logged)) return null
  const note = block.note || ""
  const m = /(\d+)(?:\s*-\s*(\d+))?\s*rounds?/i.exec(note)
  if (!m || !/rest after every round/i.test(note)) return null
  if (/\b(?:emom|amrap|tabata)\b/i.test(`${block.tag || ""} ${note}`)) return null
  const rounds = Number(m[1])
  return { rounds, maxRounds: Number(m[2] || m[1]), restSecs: restSecondsFromNote(note), forTime: /for time/i.test(note) }
}

export const newLog = (spec) => ({ n: spec.rounds, restEndsAt: null, rounds: [] })
export const logOf = (block, spec) => block.roundLog ?? newLog(spec)

// The first round that is not finished yet. Equal to log.n when every round is done.
export function currentRound(log) {
  let i = 0
  while (i < log.n && log.rounds[i]?.endedAtMs != null) i++
  return i
}
export const allRoundsDone = (log) => currentRound(log) >= log.n
export const roundsDoneCount = (log) => currentRound(log)
export const isResting = (log, now) => log.restEndsAt != null && now < log.restEndsAt

// Seconds a round took, leaving out any time the workout was paused during it
function secondsBetween(round, endMs, pause) {
  const pausedDuring = Math.max(0, (pause.total || 0) - (round.pausedBase || 0)) + (pause.at ? Math.max(0, endMs - pause.at) : 0)
  return Math.max(0, Math.round((endMs - round.startedAtMs - pausedDuring) / 1000))
}
// How long the running round has been going (frozen while the workout is paused)
export const liveSeconds = (round, pause, now) => (round?.startedAtMs != null ? secondsBetween(round, pause.at ? Math.min(now, pause.at) : now, { total: pause.total, at: null }) : 0)

const setRound = (log, r, round) => ({ ...log, rounds: Object.assign([...log.rounds], { [r]: round }) })

export function startRound(log, r, at, pause) {
  if (log.rounds[r]?.startedAtMs != null) return log
  return setRound(log, r, { startedAtMs: at, pausedBase: pause.total || 0, ticks: [] })
}

function endRound(log, r, now, pause, restSecs) {
  const round = log.rounds[r]
  if (!round || round.endedAtMs != null) return log
  const ended = { ...round, endedAtMs: now, secs: secondsBetween(round, now, pause) }
  const next = setRound(log, r, ended)
  // a rest after every round except the last
  return r < log.n - 1 ? { ...next, restEndsAt: now + restSecs * 1000 } : next
}

// Tick or untick one exercise in round r. The first tick starts the round's clock; the last tick ends the round.
// A finished round is locked, so its time can't be changed by accident.
export function tick(log, r, key, keys, now, pause, restSecs) {
  if (log.rounds[r]?.endedAtMs != null || r !== currentRound(log) || isResting(log, now)) return log
  const started = startRound(log, r, now, pause)
  const round = started.rounds[r]
  const ticks = round.ticks.includes(key) ? round.ticks.filter((k) => k !== key) : [...round.ticks, key]
  const updated = setRound(started, r, { ...round, ticks })
  return keys.every((k) => ticks.includes(k)) ? endRound(updated, r, now, pause, restSecs) : updated
}

// "Finish round": the person says the round is done, so every exercise counts as ticked
export function finishRound(log, r, keys, now, pause, restSecs) {
  if (r !== currentRound(log) || isResting(log, now)) return log
  const started = startRound(log, r, now, pause)
  const round = started.rounds[r]
  return endRound(setRound(started, r, { ...round, ticks: [...new Set([...round.ticks, ...keys])] }), r, now, pause, restSecs)
}

// When the rest is over (or skipped) the next round starts by itself. It starts when the rest ended, so a phone that was
// locked during the rest still counts the right time. While the workout is paused nothing moves on.
export function afterRest(log, now, pause) {
  if (log.restEndsAt == null || now < log.restEndsAt || pause.at) return log
  const r = currentRound(log)
  const cleared = { ...log, restEndsAt: null }
  return r < log.n ? startRound(cleared, r, log.restEndsAt, pause) : cleared
}
export const skipRest = (log, now, pause) => afterRest({ ...log, restEndsAt: log.restEndsAt == null ? null : Math.min(log.restEndsAt, now) }, now, { total: pause.total, at: null })
export const addRestTime = (log, secs) => (log.restEndsAt == null ? log : { ...log, restEndsAt: log.restEndsAt + secs * 1000 })
export const addRound = (log, spec) => (log.n < spec.maxRounds ? { ...log, n: log.n + 1 } : log)

// Seconds of every finished round, in order
export const roundTimes = (log) => log.rounds.slice(0, log.n).filter((r) => r?.endedAtMs != null).map((r) => r.secs)
export const totalSeconds = (log) => roundTimes(log).reduce((a, b) => a + b, 0)

export const formatClock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`

// What the "Next up" card should show for this section: the next exercise to do in the round under way, or the next round
export function nextTodo(block, log, now) {
  const r = currentRound(log)
  if (r >= log.n) return null
  const items = block.items.filter((it) => !it.rest)
  const ticks = log.rounds[r]?.ticks ?? []
  const todo = items.filter((it) => !ticks.includes(it.key))
  return { round: r, label: isResting(log, now) ? `Round ${r + 1} of ${log.n}, after the rest` : `Round ${r + 1} of ${log.n}`, items: todo.length ? todo : items }
}
