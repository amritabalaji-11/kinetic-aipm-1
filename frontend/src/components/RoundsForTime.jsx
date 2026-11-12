import { useEffect, useState } from "react"
import { BRICOLAGE, BottomSheet, DM_SANS, GRADIENT, GRAY, PURPLE } from "./planUi"
import {
  addRestTime, addRound, afterRest, allRoundsDone, currentRound, editRound, finishRound, formatClock, isResting, liveSeconds, logOf, pauseRound, resumeRound,
  roundTimes, skipRest, startRound, tick, totalSeconds,
} from "../utils/roundsForTime"

const GREEN = "#22C55E"
const DARK_GREEN = "#15803D"
const two = (n) => String(n).padStart(2, "0")

// Change a finished round's time (minutes and seconds) and add a note, in a sheet
function EditRoundSheet({ round, index, onSave, onClear, onClose }) {
  const [mins, setMins] = useState(round.secs == null ? "" : String(Math.floor(round.secs / 60)).padStart(2, "0"))
  const [secs, setSecs] = useState(round.secs == null ? "" : String(round.secs % 60).padStart(2, "0"))
  const [note, setNote] = useState(round.note ?? "")
  const total = (Number(mins) || 0) * 60 + (Number(secs) || 0)
  const box = { width: 64, border: "none", borderRadius: 10, background: "#EDEBF7", padding: "8px 6px", textAlign: "center", fontFamily: DM_SANS, fontWeight: 700, fontSize: 20, outline: "none" }
  return (
    <BottomSheet title={`Edit Round ${index + 1}`} onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => onClear(note)} style={{ flex: 1, height: 48, borderRadius: 24, background: "#fff", border: `1.5px solid ${PURPLE}`, color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Clear time</button>
          <button type="button" disabled={mins === "" && secs === ""} onClick={() => onSave(total, note)} style={{ flex: 2, height: 48, borderRadius: 24, border: "none", background: GRADIENT, color: "#fff", fontFamily: DM_SANS, fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: mins === "" && secs === "" ? 0.5 : 1 }}>Save</button>
        </div>
      }>
      <p style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, margin: "0 0 10px" }}>Change the time if you forgot to stop the clock, or add a note.</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" inputMode="numeric" min="0" max="99" aria-label="Minutes" value={mins} placeholder="00" onChange={(e) => setMins(e.target.value.slice(0, 2))} style={box} />
        <b>:</b>
        <input type="number" inputMode="numeric" min="0" max="59" aria-label="Seconds" value={secs} placeholder="00" onChange={(e) => setSecs(e.target.value.slice(0, 2))} style={box} />
        <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>min : sec</span>
      </div>
      <p style={{ fontFamily: DM_SANS, fontSize: 12.5, fontWeight: 700, color: GRAY, margin: "14px 0 4px" }}>Note (optional)</p>
      <textarea value={note} maxLength={80} rows={2} aria-label="Note" placeholder="For example: used lighter dumbbells" onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", border: "none", borderRadius: 10, background: "#EDEBF7", padding: "9px 12px", fontFamily: DM_SANS, fontSize: 14, outline: "none", resize: "none" }} />
    </BottomSheet>
  )
}

// The exercises of a "rounds for time" section, round by round: a clock for the round under way, a rest that starts by itself
// after every round, and every round's time at the end. The page keeps the log (block.roundLog); this only shows it and changes it.
//   renderRow(item, index, { done, onToggle, locked }) draws one exercise line, so it looks like every other section's.
export default function RoundsForTime({ block, spec, workout, onChange, renderRow }) {
  const log = logOf(block, spec)
  const pause = { total: workout.pausedTotalMs || 0, at: workout.pausedAtMs || null }
  const [now, setNow] = useState(Date.now())
  const [editing, setEditing] = useState(null) // the round being edited
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  // when the rest is over (or skipped) the next round starts by itself
  useEffect(() => {
    const next = afterRest(log, now, pause)
    if (next !== log) onChange(next)
  })

  const items = block.items.filter((it) => !it.rest)
  const keys = items.map((it) => it.key)
  const r = currentRound(log)
  const done = allRoundsDone(log)
  const paused = log.pausedAtMs != null
  const clockNow = paused ? log.pausedAtMs : now // everything on screen stands still while the section is paused
  const resting = !done && isResting(log, clockNow)
  const round = log.rounds[r]
  const running = !done && !resting && round?.startedAtMs != null
  const secsNow = running ? liveSeconds(round, pause, clockNow) : 0
  const ticks = round?.ticks ?? []
  const times = roundTimes(log)

  const chip = (i) => {
    const finished = log.rounds[i]?.endedAtMs != null
    const current = !done && i === r
    const time = finished ? (log.rounds[i].secs == null ? "–" : formatClock(log.rounds[i].secs)) : null
    const sub = finished ? time : current ? (paused ? "paused" : resting ? "next" : running ? "running" : "start") : "–"
    const palette = finished ? { background: "#F0FDF4", border: "rgba(34,197,94,0.7)", color: DARK_GREEN }
      : current ? { background: PURPLE, border: PURPLE, color: "#fff" } : { background: "#fff", border: "rgba(129,51,255,0.25)", color: GRAY }
    const style = { flex: 1, borderRadius: 8, padding: "6px 4px", textAlign: "center", fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, lineHeight: 1.25, border: `1.5px solid ${palette.border}`, background: palette.background, color: palette.color }
    const label = <>R{i + 1}{finished && log.rounds[i].edited ? <span aria-hidden="true"> ✎</span> : null}<div style={{ fontWeight: 600, marginTop: 1 }}>{sub}</div></>
    return finished
      ? <button key={i} type="button" aria-label={`Edit round ${i + 1}, ${time}`} onClick={() => setEditing(i)} style={{ ...style, cursor: "pointer" }}>{label}</button>
      : <div key={i} style={style}>{label}</div>
  }

  const pill = { border: "none", borderRadius: 999, padding: "6px 12px", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, background: "rgba(255,255,255,0.22)", color: "#fff" }
  const restLeft = Math.max(0, Math.ceil((log.restEndsAt - clockNow) / 1000))
  const change = times.length >= 2 ? times[times.length - 1] - times[0] : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>{Array.from({ length: log.n }, (_, i) => chip(i))}</div>

      {done ? (
        <>
          <div style={{ background: "#F0FDF4", border: "1.5px solid rgba(34,197,94,0.7)", borderRadius: 12, padding: "10px 12px", fontFamily: DM_SANS, fontSize: 13 }}>
            <b style={{ color: DARK_GREEN }}>Done: {formatClock(totalSeconds(log))} total.</b> Next time, try to beat it.
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {log.rounds.slice(0, log.n).map((rd, i) => rd?.endedAtMs == null ? null : (
              <div key={i} style={{ display: "flex", flexWrap: "wrap", fontFamily: DM_SANS, fontSize: 13, padding: "5px 2px", borderBottom: "1px solid #F1F5F9" }}>
                <b style={{ flex: 1, fontWeight: 600 }}>Round {i + 1}{rd.edited ? " ✎" : ""}</b><span style={{ fontVariantNumeric: "tabular-nums" }}>{rd.secs == null ? "–" : formatClock(rd.secs)}</span>
                {rd.note && <span style={{ flexBasis: "100%", fontSize: 12, color: GRAY }}>{rd.note}</span>}
              </div>
            ))}
          </div>
          {times.length >= 2 && (
            <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>
              {change === 0 ? "Steady: the same time in the first and last round."
                : change > 0 ? `Slowed down by ${change} secs from the first round to the last.` : `Sped up by ${-change} secs from the first round to the last.`}
            </div>
          )}
        </>
      ) : resting ? (
        <div role="timer" aria-label="Rest before the next round" style={{ borderRadius: 12, padding: "12px 14px", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", color: "#fff" }}>
          <div style={{ fontFamily: DM_SANS, fontSize: 12.5 }}>Round {r} done · {formatClock(log.rounds[r - 1]?.secs ?? 0)} · rest before Round {r + 1}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 38, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{formatClock(restLeft)}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={pill} onClick={() => onChange(paused ? resumeRound(log, Date.now()) : pauseRound(log, Date.now()))}>{paused ? "▶ Resume" : "❚❚ Pause"}</button>
              <button type="button" style={pill} onClick={() => onChange(addRestTime(log, 15))}>+15s</button>
              <button type="button" style={pill} onClick={() => onChange(skipRest(log, Date.now(), pause))}>Skip</button>
            </div>
          </div>
          <div style={{ fontFamily: DM_SANS, fontSize: 11, marginTop: 6, opacity: 0.9 }}>{paused ? "Paused. The rest is on hold." : `Rest started automatically. Round ${r + 1} starts when it ends.`}</div>
        </div>
      ) : (
        <>
          {paused && <div role="status" style={{ background: "#FFFBEB", border: "1px solid #FCD34D", color: "#92400E", borderRadius: 10, padding: "6px 10px", fontFamily: DM_SANS, fontSize: 12, fontWeight: 600 }}>⏸ Paused. The round timer is stopped.</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FCF9FF", border: "1px solid rgba(129,51,255,0.35)", borderRadius: 12, padding: "8px 12px" }}>
            <div role="timer" aria-label={`Round ${r + 1} time`} style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 30, color: paused ? "#A9A3C4" : PURPLE, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
              {two(Math.floor(secsNow / 60))}:{two(secsNow % 60)}
            </div>
            <div style={{ flex: 1, fontFamily: DM_SANS, fontSize: 12, color: GRAY, lineHeight: 1.25 }}>
              Round {r + 1} of {log.n}<br />{paused ? "Paused time is not counted" : <>Rest after each round is <b>{spec.restSecs} secs</b></>}
            </div>
            {!running && <button type="button" onClick={() => onChange(startRound(log, r, Date.now(), pause))} style={{ border: "none", borderRadius: 999, padding: "9px 14px", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: "#fff", background: GRADIENT }}>Start round</button>}
          </div>
          {running && (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onChange(paused ? resumeRound(log, Date.now()) : pauseRound(log, Date.now()))} style={paused
                ? { flex: 1, border: "none", borderRadius: 999, padding: "10px 12px", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, color: "#fff", background: GRADIENT }
                : { flex: 1, borderRadius: 999, padding: "10px 12px", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, color: PURPLE, background: "#fff", border: `1.5px solid ${PURPLE}` }}>
                {paused ? "▶ Resume" : "❚❚ Pause"}
              </button>
              <button type="button" disabled={paused} onClick={() => onChange(finishRound(log, r, keys, Date.now(), pause, spec.restSecs))} style={{ flex: 1, border: "none", borderRadius: 999, padding: "10px 12px", cursor: paused ? "default" : "pointer", opacity: paused ? 0.4 : 1, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, color: "#fff", background: GRADIENT }}>Finish round</button>
            </div>
          )}
        </>
      )}

      {!done && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: resting || paused ? 0.5 : 1, pointerEvents: resting || paused ? "none" : "auto" }}>
          {items.map((it, ii) => renderRow(it, ii, {
            done: ticks.includes(it.key),
            locked: resting || paused,
            onToggle: () => onChange(tick(log, r, it.key, keys, Date.now(), pause, spec.restSecs)),
          }))}
        </div>
      )}

      {!done && log.n < spec.maxRounds && (
        <button type="button" onClick={() => onChange(addRound(log, spec))} style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 16, background: "transparent", border: "1.2px solid rgba(129,51,255,0.55)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Add round</button>
      )}
      {!done && resting && (
        <div style={{ fontFamily: DM_SANS, fontSize: 11.5, color: GRAY }}>Round {r + 1} starts by itself when the rest ends, or tap Skip.</div>
      )}
      {editing != null && log.rounds[editing] && (
        <EditRoundSheet round={log.rounds[editing]} index={editing} onClose={() => setEditing(null)}
          onSave={(secs, note) => { onChange(editRound(log, editing, { secs, note })); setEditing(null) }}
          onClear={(note) => { onChange(editRound(log, editing, { secs: null, note })); setEditing(null) }} />
      )}
      <span hidden>{GREEN}</span>
    </div>
  )
}
