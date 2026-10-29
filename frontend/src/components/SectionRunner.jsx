import { useEffect, useRef, useState } from "react"
import { Check, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { beep, speak, unlockAudio } from "../utils/beep"
import { cleanSub, clockText, stateAt } from "../utils/sectionTimer"
import { useWakeLock } from "../utils/useWakeLock"

const PURPLE = "#8133FF"
const GREEN = "#16A34A"
const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const DM_SANS = "'DM Sans', sans-serif"
const SOUND_KEY = "timerSound"

const KIND_NAME = { emom: "EMOM", amrap: "AMRAP", tabata: "TABATA" }

// seconds gone by, from the clock: paused time is left out
const elapsedOf = (run, now) => (run ? Math.max(0, (((run.pausedAtMs ?? now) - run.startedAtMs - (run.pausedTotalMs || 0)) / 1000)) : 0)

const turnNames = (turn) => turn.map((x) => x.name).join(" + ")

const pill = { whiteSpace: "nowrap", background: "rgba(255,255,255,0.22)", borderRadius: 12, padding: "3px 10px", fontFamily: DM_SANS, fontSize: 11.5, fontWeight: 700, color: "#fff" }
const ctl = (primary) => ({ flex: 1, height: 46, borderRadius: 23, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, background: primary ? "#fff" : "rgba(255,255,255,0.22)", color: primary ? PURPLE : "#fff" })

// The clock bar and the round-by-round list for an EMOM, AMRAP or Tabata section.
// `run` is { startedAtMs, pausedAtMs, pausedTotalMs } or null (not started); the page keeps it with the workout.
export default function SectionRunner({ spec, run, onRun, rounds = 0, onRounds }) {
  const [, tick] = useState(0)
  const [sound, setSound] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== "off" } catch { return true } })
  const lastKey = useRef(null)
  const lastTick = useRef(null)

  const running = !!run && !run.pausedAtMs
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [running])
  useWakeLock(running) // keep the screen on while the clock runs

  const now = Date.now()
  const st = run ? stateAt(spec, elapsedOf(run, now)) : null
  const finished = !!st?.done

  // a beep and a word whenever work becomes rest (or the other way round), a small beep in the last three seconds, and three at the end
  useEffect(() => {
    if (!running || !st) return
    const say = (text) => sound && speak(text)
    if (st.key !== lastKey.current) {
      const first = lastKey.current === null
      lastKey.current = st.key
      if (st.done) { if (sound) beep(3); say("Done"); return }
      if (spec.kind !== "amrap" && sound) beep(1)
      if (spec.kind === "tabata") say(st.phase === "work" ? (st.round === 1 && first ? "Go" : `Round ${st.round}. Work`) : "Rest")
      else if (spec.kind === "emom") say(st.step.rest ? "Rest" : first ? "Go" : st.stepIndex === 0 ? `Minute ${st.minute}` : st.step.name)
    }
    const tickKey = `${st.key}-${st.phaseLeft}`
    if (st.phaseLeft >= 1 && st.phaseLeft <= 3 && !st.done && tickKey !== lastTick.current && spec.kind !== "amrap") { lastTick.current = tickKey; if (sound) beep(1) }
  })

  const toggleSound = () => { const next = !sound; setSound(next); try { localStorage.setItem(SOUND_KEY, next ? "on" : "off") } catch { /* fine */ } if (next) unlockAudio() }
  const start = () => { unlockAudio(); lastKey.current = null; onRun({ startedAtMs: Date.now(), pausedAtMs: null, pausedTotalMs: 0 }) }
  const pause = () => onRun({ ...run, pausedAtMs: Date.now() })
  const resume = () => onRun({ ...run, pausedAtMs: null, pausedTotalMs: (run.pausedTotalMs || 0) + (Date.now() - run.pausedAtMs) })
  const reset = () => { lastKey.current = null; onRun(null); if (spec.kind === "amrap") onRounds(0) } // starting over clears the rounds too

  // ---------- the bar ----------
  const big = !run ? clockText(spec.totalSec) : finished ? "0:00" : spec.kind === "amrap" ? clockText(st.left) : clockText(st.phaseLeft)
  const phaseWord = !run ? "READY" : finished ? "DONE" : spec.kind === "amrap" ? "LEFT" : st.phase.toUpperCase()
  const where = !run ? "" : spec.kind === "emom" ? `Minute ${Math.min(st.minute, spec.minutes)} / ${spec.minutes}` : spec.kind === "tabata" ? `Round ${Math.min(st.round, spec.rounds)} / ${spec.rounds}` : ""
  const sub = spec.kind === "emom" ? "Every minute on the minute" : spec.kind === "amrap" ? "As many rounds as possible" : `${spec.work} on · ${spec.rest} off`
  const pct = run ? Math.min(100, (st.elapsed / spec.totalSec) * 100) : 0
  let line = null
  if (run && !finished) {
    if (spec.kind === "emom") line = <>Now: <b>{st.step.name}</b>{st.nextStep ? <> · Next: <b>{st.nextStep.name}</b></> : null}</>
    if (spec.kind === "tabata") line = st.now ? <>Now: <b>{turnNames(st.now)}</b></> : st.next ? <>Next: <b>{turnNames(st.next)}</b></> : null
    if (spec.kind === "amrap") line = <>Round after round until the clock hits zero</>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ borderRadius: 16, background: finished ? `linear-gradient(100deg, ${GREEN}, #22C55E)` : GRADIENT, color: "#fff", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={pill}>{KIND_NAME[spec.kind]}</span>
          <span style={{ fontFamily: DM_SANS, fontSize: 12, opacity: 0.92 }}>{sub}</span>
          {where && <span style={{ ...pill, marginLeft: "auto" }}>{where}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 12 }}>
          <span role="timer" aria-label="Time left" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 56, lineHeight: 1, letterSpacing: -1 }}>{big}</span>
          <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{phaseWord}</span>
        </div>
        {line && <div style={{ fontFamily: DM_SANS, fontSize: 13, marginTop: 6 }}>{line}</div>}
        {run && <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.28)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${pct}%`, height: "100%", background: "#fff" }} /></div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!run && <button type="button" onClick={start} style={ctl(true)}><Play size={16} fill={PURPLE} /> Start</button>}
          {run && <button type="button" onClick={reset} style={ctl(false)}><RotateCcw size={15} /> Reset</button>}
          {run && !finished && (running
            ? <button type="button" onClick={pause} style={ctl(true)}><Pause size={16} fill={PURPLE} /> Pause</button>
            : <button type="button" onClick={resume} style={ctl(true)}><Play size={16} fill={PURPLE} /> Resume</button>)}
          <button type="button" onClick={toggleSound} aria-label={sound ? "Sound on" : "Sound off"} style={{ ...ctl(false), flex: "0 0 52px" }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        </div>
      </div>

      {spec.kind === "amrap" && <AmrapList spec={spec} rounds={rounds} onRounds={onRounds} />}
      {spec.kind === "emom" && <EmomRows spec={spec} st={st} />}
      {spec.kind === "tabata" && <TabataRows spec={spec} st={st} />}
    </div>
  )
}

const row = { display: "grid", gridTemplateColumns: "28px 1fr", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid rgba(100,116,139,0.18)" }
const dot = (state, n) => (
  <span style={{ width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: state === "todo" ? "#64748B" : "#fff", background: state === "done" ? GREEN : state === "now" ? PURPLE : "transparent", border: state === "todo" ? "1.5px solid #B6BFCC" : "none" }}>
    {state === "done" ? <Check size={14} strokeWidth={3.2} /> : n}
  </span>
)
const title = (state) => ({ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 14, color: state === "done" ? "#15803D" : state === "now" ? PURPLE : "#94A3B8" })

function EmomRows({ spec, st }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "2px 12px 6px" }}>
      {Array.from({ length: spec.minutes }, (_, i) => {
        const m = i + 1
        const state = !st ? "todo" : st.done || m < st.minute ? "done" : m === st.minute ? "now" : "todo"
        const steps = spec.stepsFor(m)
        return (
          <div key={m} style={row}>
            {dot(state, m)}
            <div>
              <div style={title(state)}>Minute {m}</div>
              {state === "now" && st && !st.done
                ? <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                    {steps.map((s, k) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: DM_SANS, fontSize: 13, color: k === st.stepIndex ? PURPLE : k < st.stepIndex ? "#15803D" : "#64748B", fontWeight: k === st.stepIndex ? 700 : 400 }}>
                        <i style={{ width: 8, height: 8, borderRadius: 4, background: k < st.stepIndex ? GREEN : k === st.stepIndex ? PURPLE : "#CBD5E1", display: "inline-block" }} />
                        {s.name}{s.untimed ? "" : ` · ${s.secs} secs`}{cleanSub(s.sub) && !s.rest ? ` · ${cleanSub(s.sub)}` : ""}{k === st.stepIndex ? ` · ${st.phaseLeft}s left` : ""}
                      </div>
                    ))}
                  </div>
                : <div style={{ fontFamily: DM_SANS, fontSize: 12, color: state === "todo" ? "#94A3B8" : "#64748B" }}>{steps.filter((s) => !s.rest).map((s) => s.name).join(" · ")}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabataRows({ spec, st }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "2px 12px 6px" }}>
      {Array.from({ length: spec.rounds }, (_, i) => {
        const r = i + 1
        const state = !st ? "todo" : st.done || r < st.round ? "done" : r === st.round ? "now" : "todo"
        const turn = spec.turns[i % spec.turns.length]
        return (
          <div key={r} style={row}>
            {dot(state, r)}
            <div>
              <div style={title(state)}>Round {r} · {turnNames(turn)}</div>
              <div style={{ fontFamily: DM_SANS, fontSize: 12, color: state === "now" ? PURPLE : "#94A3B8", fontWeight: state === "now" ? 600 : 400 }}>
                {state === "done" ? "done" : state === "now" ? `${st.phase === "work" ? "Working now" : "Resting"} · ${st.phaseLeft}s left` : `${spec.work} secs`}
                {state !== "done" && turn.some((x) => cleanSub(x.sub)) && <span style={{ display: "block", color: "#64748B", fontWeight: 400 }}>{turn.map((x) => (cleanSub(x.sub) ? `${x.name}: ${cleanSub(x.sub)}` : x.name)).join(" · ")}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AmrapList({ spec, rounds, onRounds }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "6px 12px 12px" }}>
      <div style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B", padding: "4px 0" }}>One round is all of these:</div>
      {spec.items.map((it, i) => (
        <div key={i} style={{ padding: "7px 0", borderTop: "1px solid rgba(100,116,139,0.18)" }}>
          <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: PURPLE }}>{it.name}</div>
          {it.sub && <div style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>{it.sub}</div>}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontFamily: DM_SANS, fontSize: 13, color: "#64748B" }}>Rounds done</span>
        <button type="button" aria-label="Take one round off" disabled={rounds <= 0} onClick={() => onRounds(Math.max(0, rounds - 1))} style={{ background: "none", border: "none", cursor: rounds > 0 ? "pointer" : "default", fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 34, color: PURPLE }}>{rounds}</button>
      </div>
      <button type="button" onClick={() => onRounds(rounds + 1)} style={{ width: "100%", height: 56, marginTop: 6, borderRadius: 28, background: "#fff", border: `1.5px solid ${PURPLE}`, color: PURPLE, fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>+ 1 round</button>
      <div style={{ fontFamily: DM_SANS, fontSize: 11, color: "#64748B", textAlign: "center", marginTop: 6 }}>Tapped by mistake? Tap the number to take one off.</div>
    </div>
  )
}
