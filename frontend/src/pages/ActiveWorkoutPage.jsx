import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeftRight, BicepsFlexed, Check, ChevronDown, ChevronRight, Info, Lightbulb, Pause, Play, Plus, Timer, VideoIcon } from "lucide-react"
import FormGuide from "../components/FormGuide"
import CuesSheet from "../components/CuesSheet"
import NextUpCard from "../components/NextUpCard"
import RestTimer from "../components/RestTimer"
import SetTypeSheet from "../components/SetTypeSheet"
import { typeOfBlock } from "../utils/setTypes"
import SwapSheet from "../components/SwapSheet"
import AddExerciseSheet from "../components/AddExerciseSheet"
import { hasGuidance } from "../data/exerciseGuidance"
import { hasExerciseGuide } from "../data/exerciseGuides"
import { addPendingWorkout, removePendingWorkout, saveWorkout } from "../services/workoutService"
import { equipmentLabel } from "../utils/exerciseCatalog"
import {
  DEFAULT_TRACK, allSetsTicked, canTickSet, currentBlockIndex, emptySet, ensureBlocks, flattenForSave, isActionable, isBlockComplete,
  itemHasEntries, nextUpItems, restSecondsFromNote, secondsFromSub, trackOf,
} from "../utils/workoutModel"
import SetTimer, { clock } from "../components/SetTimer"
import TrackChips from "../components/TrackChips"
import { BRICOLAGE, DM_SANS, ExerciseName, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"

const GREEN = "#22C55E"
const DARK_GREEN = "#15803D"
const INPUT_BG = "#EDEBF7"

const readWorkout = () => {
  try {
    return ensureBlocks(JSON.parse(localStorage.getItem("activeWorkout") || "null"))
  } catch {
    return null
  }
}

const letter = (i) => String.fromCharCode(65 + i)

// How long the workout has been going: 12:34, or 1:02:34 after the first hour. Ticks every second.
const formatElapsed = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  const two = (n) => String(n).padStart(2, "0")
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}

function WorkoutClock({ workout, onToggle }) {
  const [now, setNow] = useState(Date.now())
  const paused = Boolean(workout.pausedAtMs)
  // ticks while running; stops while paused, and catches up the moment you resume
  useEffect(() => {
    setNow(Date.now())
    if (paused) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [paused])
  const startedAtMs = workout.startedAtMs ?? workout.id
  const elapsed = (paused ? workout.pausedAtMs : now) - startedAtMs - (workout.pausedTotalMs || 0)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div role="timer" aria-label={paused ? "Workout time, paused" : "Workout time"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, background: "#FFFFFF", border: `1.5px solid ${paused ? "rgba(245,158,11,0.7)" : "rgba(129,51,255,0.3)"}`, boxShadow: "0px 4px 12px rgba(129,51,255,0.10)" }}>
        <Timer size={16} color={paused ? "#D97706" : PURPLE} />
        <span style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 20, color: paused ? "#B45309" : INK, fontVariantNumeric: "tabular-nums" }}>{formatElapsed(elapsed)}</span>
        <span style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: paused ? "#B45309" : GRAY }}>{paused ? "PAUSED" : "WORKOUT TIME"}</span>
      </div>
      <button type="button" onClick={onToggle} aria-label={paused ? "Resume workout" : "Pause workout"} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", background: paused ? GRADIENT : "#FFFFFF", boxShadow: "0px 4px 12px rgba(129,51,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", outline: paused ? "none" : "1.5px solid rgba(129,51,255,0.3)" }}>
        {paused ? <Play size={18} color="#FFFFFF" fill="#FFFFFF" /> : <Pause size={18} color={PURPLE} fill={PURPLE} />}
      </button>
    </div>
  )
}

function Tag({ children, state }) {
  const bg = state === "done" ? DARK_GREEN : state === "current" ? PURPLE : "rgba(129,51,255,0.4)"
  return (
    <span style={{ padding: "4px 8px", borderRadius: 6, background: bg, color: "#fff", fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  )
}

function SwapButton({ locked, onClick, name }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      aria-label={locked ? `Can't swap ${name} after logging` : `Swap ${name}`}
      title={locked ? "Can't swap once reps have been entered" : "Swap exercise"}
      style={{
        width: 26, height: 26, borderRadius: 13, border: "none", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: locked ? "rgba(100,116,139,0.12)" : "rgba(129,51,255,0.1)",
        cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.6 : 1,
      }}
    >
      <ArrowLeftRight size={13} color={locked ? "#94A3B8" : PURPLE} strokeWidth={2.2} />
    </button>
  )
}

function TickCircle({ done, onClick, label, size = 24 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: size, height: size, borderRadius: size / 2, flexShrink: 0, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? GREEN : "transparent", border: done ? "none" : "1.5px solid rgba(100,116,139,0.5)",
      }}
    >
      {done && <Check size={Math.round(size * 0.55)} color="#fff" strokeWidth={3} />}
    </button>
  )
}

const focusNext = (e) => {
  if (e.key !== "Enter") return
  e.preventDefault()
  const all = [...document.querySelectorAll("input[data-set-input]")]
  const next = all[all.indexOf(e.currentTarget) + 1]
  if (next) next.focus()
  else e.currentTarget.blur()
}

function SetRow({ label, set, item, onChange, onTick, onRecord, onTimerDone, labelColor, labelled }) {
  const done = set.completed
  const track = trackOf(item)
  const canTick = canTickSet(item, set)
  const box = (field, value, hint) => (
    <input
      type="number"
      inputMode="decimal"
      enterKeyHint="next"
      data-set-input
      aria-label={hint}
      value={value ?? ""}
      placeholder={labelled ? hint : "–"}
      onChange={(e) => onChange(field, e.target.value)}
      onKeyDown={focusNext}
      style={{
        flex: 1, minWidth: 0, height: 28, borderRadius: 6, border: "none", textAlign: "center",
        background: done ? "#fff" : INPUT_BG, fontFamily: DM_SANS, fontSize: 14, fontWeight: value ? 600 : 400,
        color: done ? DARK_GREEN : INK, outline: "none",
      }}
    />
  )
  const timerTarget = Number(set.seconds) || item.targetSeconds || 30 // what was typed, else the plan's time, else 30 seconds
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0", borderRadius: 8, background: done ? "rgba(34,197,94,0.14)" : "transparent" }}>
      <span style={{ width: 22, textAlign: "center", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, color: done ? DARK_GREEN : labelColor || INK }}>{label}</span>
      {track.reps && (
        <button type="button" aria-label="Record video" onClick={onRecord} style={{ width: 52, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: GRADIENT, opacity: done ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <VideoIcon size={15} color="#fff" />
        </button>
      )}
      {track.weight && box("weight", set.weight, "kg")}
      {track.reps && box("reps", set.reps, "reps")}
      {track.time && (
        <SetTimer target={timerTarget} label={`${item.name} timer`} onDone={onTimerDone}>
          <input
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            data-set-input
            aria-label="seconds"
            value={set.seconds ?? ""}
            placeholder={String(item.targetSeconds ?? "sec")}
            onChange={(e) => onChange("seconds", e.target.value)}
            onKeyDown={focusNext}
            style={{ width: "100%", minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: DM_SANS, fontSize: 14, fontWeight: set.seconds ? 600 : 400, color: done ? DARK_GREEN : INK }}
          />
          <span style={{ fontSize: 11, color: GRAY, fontWeight: 400 }}>sec</span>
        </SetTimer>
      )}
      <button
        type="button"
        aria-label={done ? "Mark set not done" : "Mark set done"}
        disabled={!done && !canTick}
        onClick={onTick}
        style={{ width: 36, height: 28, borderRadius: 6, border: "none", cursor: done || canTick ? "pointer" : "not-allowed", background: done ? GREEN : INPUT_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <Check size={16} color={done ? "#fff" : "#94A3B8"} strokeWidth={3} />
      </button>
    </div>
  )
}

// The headings above the rows. Only drawn when every row in the block asks for the same things (otherwise each box says what it is).
function ColumnHeaders({ first, track }) {
  const h = { fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, color: GRAY, textAlign: "center" }
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ ...h, width: 22 }}>{first}</span>
      {track.reps && <span style={{ ...h, width: 52 }}>Record</span>}
      {track.weight && <span style={{ ...h, flex: 1 }}>kg</span>}
      {track.reps && <span style={{ ...h, flex: 1 }}>Reps</span>}
      {track.time && <span style={{ ...h, flex: 1 }}>Time</span>}
      <span style={{ ...h, width: 36 }}>✓</span>
    </div>
  )
}

const sameTrack = (items) => items.every((it) => ["weight", "reps", "time"].every((k) => !!trackOf(it)[k] === !!trackOf(items[0])[k]))

const outlineBtn = (disabled) => ({
  flex: 1, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.6)", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13,
  border: `1.2px solid ${disabled ? "rgba(100,116,139,0.3)" : "rgba(129,51,255,0.7)"}`, color: disabled ? "#94A3B8" : PURPLE, cursor: disabled ? "not-allowed" : "pointer",
})

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(readWorkout)
  // Which sections are open (by id). Several can be open at once, so looking back at a finished
  // section never folds the current one away.
  const [openIds, setOpenIds] = useState(() => {
    const w = readWorkout()
    const i = w ? currentBlockIndex(w.blocks) : -1
    return i >= 0 ? [w.blocks[i].id] : []
  })
  const [restEndsAt, setRestEndsAt] = useState(null)
  const [cuesFor, setCuesFor] = useState(null) // index of the section whose "Cues" sheet is open
  const [typeInfoFor, setTypeInfoFor] = useState(null) // index of the section whose set type is explained
  const [showNextUp, setShowNextUp] = useState(false) // opens when a set is ticked or an item is marked done
  const [swapping, setSwapping] = useState(null) // { bi, ii }
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState("")
  const [celebrate, setCelebrate] = useState(null)
  const [toast, setToast] = useState("")

  // A workout started on an older screen is upgraded to blocks once, then kept that way
  useEffect(() => {
    if (workout) localStorage.setItem("activeWorkout", JSON.stringify(workout))
  }, [workout])

  if (!workout) {
    return (
      <div style={{ padding: 24, textAlign: "center", fontFamily: DM_SANS }}>
        <p>No workout in progress.</p>
        <button type="button" onClick={() => navigate("/plan")} style={{ ...outlineBtn(false), flex: "none" }}>Pick a workout</button>
      </div>
    )
  }

  const blocks = workout.blocks
  const current = currentBlockIndex(blocks)

  // Every change goes through here: save it, and move on to the next block when one is finished
  const commit = (next) => {
    const before = currentBlockIndex(blocks)
    const after = currentBlockIndex(next.blocks)
    setWorkout(next)
    setNotice("")
    if (after !== before && after !== -1) {
      const id = next.blocks[after].id
      setOpenIds((o) => (o.includes(id) ? o : [...o, id]))
    }
  }
  const toggleOpen = (id) => setOpenIds((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const mapItem = (bi, ii, fn) =>
    commit({ ...workout, blocks: blocks.map((b, i) => (i !== bi ? b : { ...b, items: b.items.map((it, j) => (j !== ii ? it : fn(it))) })) })
  const mapBlock = (bi, fn) => commit({ ...workout, blocks: blocks.map((b, i) => (i !== bi ? b : fn(b))) })

  const setField = (bi, ii, si, field, value) =>
    mapItem(bi, ii, (it) => ({ ...it, sets: it.sets.map((s, k) => (k !== si ? s : { ...s, [field]: value })) }))
  const toggleSet = (bi, ii, si) => {
    if (!blocks[bi].items[ii].sets[si].completed) setShowNextUp(true) // just finished a set: show what comes next
    mapItem(bi, ii, (it) => ({ ...it, sets: it.sets.map((s, k) => (k !== si ? s : { ...s, completed: !s.completed })) }))
  }
  // a timer ran out (or was stopped): fill in the seconds and tick the set
  const finishTimedSet = (bi, ii, si, seconds) => {
    setShowNextUp(true)
    mapItem(bi, ii, (it) => ({ ...it, sets: it.sets.map((s, k) => (k !== si ? s : { ...s, seconds: String(seconds), completed: true })) }))
  }
  const setTrack = (bi, ii, track) => mapItem(bi, ii, (it) => ({ ...it, track }))
  const toggleDone = (bi, ii) => {
    if (!blocks[bi].items[ii].done) setShowNextUp(true)
    mapItem(bi, ii, (it) => ({ ...it, done: !it.done }))
  }

  const addRound = (bi) =>
    mapBlock(bi, (b) => ({ ...b, items: b.items.map((it) => (it.logged ? { ...it, sets: [...it.sets, emptySet()] } : it)) }))
  const lastRoundHasWork = (b) => b.items.some((it) => it.logged && it.sets.length && (it.sets[it.sets.length - 1].completed || it.sets[it.sets.length - 1].reps !== "" || it.sets[it.sets.length - 1].weight !== "" || !!it.sets[it.sets.length - 1].seconds))
  const removeRound = (bi) =>
    mapBlock(bi, (b) => ({ ...b, items: b.items.map((it) => (it.logged && it.sets.length > 1 ? { ...it, sets: it.sets.slice(0, -1) } : it)) }))

  // The user says the section is done: green, folded up, and the next one opens.
  // Timed / follow-along items are marked done with it; unticked sets are simply not saved.
  const completeBlock = (bi) => {
    const block = blocks[bi]
    const ready = allSetsTicked(block)
    const nextIdx = blocks.findIndex((b, i) => i > bi && b.items.some(isActionable) && !b.completed)
    mapBlock(bi, (b) => ({ ...b, completed: true, items: b.items.map((it) => (!it.logged && !it.rest && ready ? { ...it, done: true } : it)) }))
    setToast(`${block.tag} completed`)
    setTimeout(() => setToast(""), 2200)
    // fold the finished section, open the next one and scroll to it
    setOpenIds((o) => {
      const rest = o.filter((id) => id !== block.id)
      return nextIdx !== -1 && !rest.includes(blocks[nextIdx].id) ? [...rest, blocks[nextIdx].id] : rest
    })
    if (nextIdx !== -1) setTimeout(() => document.getElementById(`block-${blocks[nextIdx].id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120)
  }

  // Finished a section by mistake? Reopen it and carry on.
  const reopenBlock = (bi) => {
    mapBlock(bi, (b) => ({ ...b, completed: false }))
    setOpenIds((o) => (o.includes(blocks[bi].id) ? o : [...o, blocks[bi].id]))
  }

  const swapItem = (exercise) => {
    const { bi, ii } = swapping
    mapItem(bi, ii, (it) => ({
      ...it,
      name: exercise.name,
      exerciseId: exercise.id,
      alternatives: [],
      sub: `${(it.sub || "").split(" · ")[0]} · ${equipmentLabel(exercise)}`.replace(/^ · /, ""),
    }))
    setSwapping(null)
  }

  const addExercises = (exercises) => {
    const at = current === -1 ? blocks.length : current + 1
    const added = exercises.map((ex) => ({
      id: `${Date.now()}-${ex.id}`, section: "workout", tag: "ADDED", note: "3 sets",
      items: [{
        key: `${Date.now()}-${ex.id}-i`, name: ex.name, sub: equipmentLabel(ex), exerciseId: ex.id, rest: false,
        alternatives: [], logged: true, targetReps: null, track: { ...DEFAULT_TRACK }, done: false, sets: [emptySet(), emptySet(), emptySet()],
      }],
    }))
    const next = [...blocks.slice(0, at), ...added, ...blocks.slice(at)]
    setWorkout({ ...workout, blocks: next })
    setOpenIds((o) => [...o, ...added.map((b) => b.id)])
    setAdding(false)
  }

  // Pause stops the workout clock (and the time spent paused is left out of the saved duration); resume carries on
  const togglePause = () =>
    setWorkout((w) =>
      w.pausedAtMs
        ? { ...w, pausedTotalMs: (w.pausedTotalMs || 0) + (Date.now() - w.pausedAtMs), pausedAtMs: null }
        : { ...w, pausedAtMs: Date.now() }
    )

  const startRest = (note) => setRestEndsAt(Date.now() + restSecondsFromNote(note) * 1000)

  const finish = () => {
    const toSave = flattenForSave(workout)
    if (toSave.exercises.length === 0) {
      setNotice("Tick at least one set before you finish.")
      return
    }
    const endedAtMs = Date.now()
    setCelebrate(`🎉 Great job, you had a strong ${workout.focusLabel.toLowerCase()} day!`)
    // Keep a copy on this device first, then send it. The copy is removed only once the server has the workout,
    // so a slow or failed save is never lost: the Home and Logger screens retry it and show it meanwhile.
    // finishing while paused: that pause ends now, so it still counts as time off
    const pausedTotalMs = (toSave.pausedTotalMs || 0) + (toSave.pausedAtMs ? endedAtMs - toSave.pausedAtMs : 0)
    const pending = { ...toSave, pausedTotalMs, pausedAtMs: null, status: "completed", endedAtMs }
    addPendingWorkout(pending)
    saveWorkout(pending)
      .then(() => removePendingWorkout(pending.id))
      .catch((err) => console.error("Could not reach the server yet; the workout stays on this device and will be retried:", err))
    setTimeout(() => {
      localStorage.removeItem("activeWorkout")
      navigate("/timeline")
    }, 3000)
  }

  const swapTarget = swapping ? blocks[swapping.bi].items[swapping.ii] : null

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 20px 140px" }}>
      <style>{`
        @keyframes popUpBig { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
        @keyframes fall { to { transform: translateY(100vh) rotate(360deg); opacity: 0 } }
        .next-section-btn:active { transform: scale(0.98); filter: brightness(0.95); }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", padding: "10px 16px", borderRadius: 10, background: GREEN, color: "#fff", fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, zIndex: 1000, boxShadow: "0 4px 14px rgba(34,197,94,0.4)", whiteSpace: "nowrap" }}>
          ✓ {toast}
        </div>
      )}

      {celebrate && (
        <>
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", padding: "24px 32px", background: GREEN, color: "#fff", borderRadius: 16, fontSize: 18, fontWeight: 600, fontFamily: BRICOLAGE, zIndex: 1000, animation: "popUpBig 0.5s ease-in-out", boxShadow: "0 8px 32px rgba(46,205,112,0.5)", textAlign: "center", maxWidth: "80vw" }}>
            {celebrate}
          </div>
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
            {[...Array(40)].map((_, i) => (
              <div key={i} style={{ position: "absolute", left: `${Math.random() * 100}%`, top: -10, width: 10, height: 10, borderRadius: "50%", background: [GREEN, "#0284C7", "#9747FF", "#F586FF", "#FFD700"][i % 5], animation: `fall ${2 + Math.random()}s linear forwards`, animationDelay: `${Math.random() * 0.5}s` }} />
            ))}
          </div>
        </>
      )}

      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div className="ring-pulse-loop" style={{ width: 46, height: 46, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BicepsFlexed size={24} color="#FFFFFF" strokeWidth={2.4} className="flex-arm-loop" />
        </div>
        <div>
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 22, letterSpacing: 0.3, color: INK, margin: "0 0 2px" }}>TODAY&apos;S WORKOUT</h1>
          <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: 0 }}>{workout.presetTitle || `Strong ${workout.focusLabel.toLowerCase()} on your way!`}</p>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <WorkoutClock workout={workout} onToggle={togglePause} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {blocks.map((block, bi) => {
          const actionable = block.items.filter(isActionable)
          if (actionable.length === 0) {
            // a rest-only block, e.g. "REST · 2 mins": nothing to do, just shown in order
            return (
              <div key={block.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px", fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>
                <Timer size={14} /> {block.tag} · {block.note}
              </div>
            )
          }
          const done = isBlockComplete(block)
          const state = done ? "done" : bi === current ? "current" : "upcoming"
          const isOpen = openIds.includes(block.id)
          const logged = actionable.filter((it) => it.logged)
          const rounds = Math.max(0, ...logged.map((it) => it.sets.length))
          const multi = logged.length > 1
          const many = actionable.length > 1 // a letter on every exercise when there are several
                    const cardStyle =
            state === "done" ? { border: `1.5px solid rgba(34,197,94,0.7)`, background: "#F0FDF4" }
            : state === "current" ? { border: "2.5px solid transparent", background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0284C7,#9747FF) border-box", boxShadow: "0 4px 18px rgba(129,51,255,0.28)" }
            : { border: "1px solid rgba(129,51,255,0.22)", background: "#fff", opacity: 0.92 }

          return (
            <div key={block.id} id={`block-${block.id}`} style={{ borderRadius: 12, padding: 12, ...cardStyle }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => toggleOpen(block.id)} style={{ all: "unset", display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer", boxSizing: "border-box" }}>
                <Tag state={state}>{block.tag}</Tag>
                <span style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, flex: 1 }}>{block.note}</span>
              </button>
              {typeOfBlock(block) && (
                <button type="button" aria-label={`What is ${block.tag}?`} onClick={() => setTypeInfoFor(bi)} style={{ display: "flex", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <Info size={16} color={PURPLE} />
                </button>
              )}
              {actionable.some((it) => hasExerciseGuide(it.exerciseId)) && (
                <button type="button" aria-label={`Cues for ${block.tag}`} onClick={() => setCuesFor(bi)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 12, border: "1.2px solid rgba(129,51,255,0.55)", background: "#FCF9FF", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                  <Lightbulb size={12} /> Cues
                </button>
              )}
              <button type="button" onClick={() => toggleOpen(block.id)} aria-label={isOpen ? `Fold ${block.tag}` : `Open ${block.tag}`} style={{ all: "unset", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                {state === "done" && <span style={{ width: 24, height: 24, borderRadius: 12, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" strokeWidth={3} /></span>}
                {state === "current" && <span style={{ padding: "3px 9px", borderRadius: 10, background: GRADIENT, color: "#fff", fontFamily: DM_SANS, fontSize: 10, fontWeight: 600 }}>NOW</span>}
                <ChevronDown size={18} color={GRAY} style={{ transform: isOpen ? "rotate(180deg)" : "none", flexShrink: 0 }} />
              </button>
              </div>

              {isOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {logged.length > 0 && (
                    <button type="button" onClick={() => startRest(block.note)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 16, background: "transparent", border: "1.2px solid rgba(129,51,255,0.6)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      <Timer size={14} /> Start rest timer
                    </button>
                  )}

                  {/* the exercises in this block, in the plan's order */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {block.items.map((it, ii) => {
                      if (it.rest) {
                        return <div key={it.key} style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY }}>{it.name} · {it.sub}</div>
                      }
                      if (!it.logged) {
                        // follow-along: a letter, the line, a clock when it has a time, and a tick on the right
                        const secs = secondsFromSub(it.sub)
                        return (
                          <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                            {many && <span style={{ width: 20, height: 20, borderRadius: 5, background: it.done ? DARK_GREEN : PURPLE, color: "#fff", fontFamily: DM_SANS, fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{letter(actionable.indexOf(it))}</span>}
                            <div style={{ flex: 1, minWidth: 0, fontFamily: DM_SANS, fontSize: 13, lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: it.done ? DARK_GREEN : PURPLE }}><ExerciseName exerciseId={it.exerciseId}>{it.name}</ExerciseName></span>
                              {it.sub && <span style={{ color: GRAY }}> · {it.sub}</span>}
                            </div>
                            {secs !== null && !it.done && (
                              <div style={{ width: 96, flexShrink: 0, display: "flex" }}>
                                <SetTimer target={secs} label={`${it.name} timer`} onDone={() => { if (!it.done) toggleDone(bi, ii) }}>{clock(secs)}</SetTimer>
                              </div>
                            )}
                            <TickCircle size={20} done={it.done} onClick={() => toggleDone(bi, ii)} label={it.done ? `Mark ${it.name} not done` : `Mark ${it.name} done`} />
                          </div>
                        )
                      }
                      return (
                        <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {many && <span style={{ width: 20, height: 20, borderRadius: 5, background: PURPLE, color: "#fff", fontFamily: DM_SANS, fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{letter(actionable.indexOf(it))}</span>}
                          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                            <div style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: PURPLE }}><ExerciseName exerciseId={it.exerciseId}>{it.name}</ExerciseName></div>
                            {it.sub && <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{it.sub}</div>}
                            <TrackChips track={trackOf(it)} onChange={(t) => setTrack(bi, ii, t)} />
                          </div>
                          {it.exerciseId && <SwapButton name={it.name} locked={itemHasEntries(it)} onClick={() => setSwapping({ bi, ii })} />}
                        </div>
                      )
                    })}
                  </div>

                  {/* a single exercise: sets. several: round by round (A then B) */}
                  {logged.length === 1 && (() => {
                    const it = logged[0]
                    const ii = block.items.indexOf(it)
                    return (
                      <>
                        {hasGuidance(it.exerciseId) && <FormGuide exerciseId={it.exerciseId} name={it.name} startOpen={false} />}
                        <ColumnHeaders first="Set" track={trackOf(it)} />
                        {it.sets.map((s, si) => (
                          <SetRow key={s.id} label={si + 1} set={s} item={it} onChange={(f, v) => setField(bi, ii, si, f, v)} onTick={() => toggleSet(bi, ii, si)} onRecord={() => navigate("/upload")} onTimerDone={(secs) => finishTimedSet(bi, ii, si, secs)} />
                        ))}
                      </>
                    )
                  })()}
                  {multi && (
                    <>
                      {sameTrack(logged) && <ColumnHeaders first="" track={trackOf(logged[0])} />}
                      {Array.from({ length: rounds }, (_, r) => {
                        const roundDone = logged.every((it) => !it.sets[r] || it.sets[r].completed)
                        return (
                          <div key={r} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4, fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, color: roundDone ? DARK_GREEN : GRAY }}>
                              ROUND {r + 1}
                              {roundDone && <span style={{ width: 16, height: 16, borderRadius: 8, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} color="#fff" strokeWidth={3.2} /></span>}
                            </div>
                            {logged.map((it) => {
                              const ii = block.items.indexOf(it)
                              const s = it.sets[r]
                              if (!s) return null
                              return <SetRow key={s.id} label={letter(actionable.indexOf(it))} labelColor={INK} set={s} item={it} labelled={!sameTrack(logged)} onChange={(f, v) => setField(bi, ii, r, f, v)} onTick={() => toggleSet(bi, ii, r)} onRecord={() => navigate("/upload")} onTimerDone={(secs) => finishTimedSet(bi, ii, r, secs)} />
                            })}
                          </div>
                        )
                      })}
                    </>
                  )}

                  {logged.length > 0 && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => addRound(bi)} style={outlineBtn(false)}>{multi ? "+ Add Round" : "+ Add Set"}</button>
                      <button type="button" disabled={rounds <= 1 || lastRoundHasWork(block)} onClick={() => removeRound(bi)} style={outlineBtn(rounds <= 1 || lastRoundHasWork(block))}>{multi ? "– Remove Round" : "– Remove Set"}</button>
                    </div>
                  )}

                  {state === "done" && (
                    <button type="button" onClick={() => reopenBlock(bi)} style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 16, background: "transparent", border: "1.2px solid rgba(21,128,61,0.5)", color: DARK_GREEN, fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      Reopen {block.tag}
                    </button>
                  )}

                  {state !== "done" && (() => {
                    const ready = allSetsTicked(block)
                    const next = blocks.find((b, i) => i > bi && b.items.some(isActionable) && !b.completed)
                    return (
                      <div style={{ marginTop: 2 }}>
                        <button
                          type="button"
                          className="next-section-btn"
                          onClick={() => completeBlock(bi)}
                          style={ready
                            ? { width: "100%", height: 44, borderRadius: 10, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 3px 10px rgba(129,51,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 12px" }
                            : { width: "100%", height: 38, borderRadius: 10, background: "transparent", border: "1.2px solid rgba(129,51,255,0.55)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 12px" }}
                        >
                          {ready ? <Check size={16} strokeWidth={3} /> : null}
                          {ready ? (next ? `Done · Next: ${next.tag}` : "Done") : next ? `Skip · Next: ${next.tag}` : "Skip"}
                          {next ? <ChevronRight size={16} strokeWidth={2.6} /> : null}
                        </button>
                        {!ready && <div style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, textAlign: "center", marginTop: 4 }}>Unticked sets won't be saved.</div>}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {typeInfoFor !== null && blocks[typeInfoFor] && typeOfBlock(blocks[typeInfoFor]) && (
        <SetTypeSheet block={blocks[typeInfoFor]} onClose={() => setTypeInfoFor(null)} />
      )}
      {cuesFor !== null && blocks[cuesFor] && (
        <CuesSheet title={`Cues: ${blocks[cuesFor].tag}`} items={blocks[cuesFor].items.filter(isActionable)} onClose={() => setCuesFor(null)} />
      )}

      {showNextUp && (() => {
        const up = nextUpItems(blocks)
        // sits just above the rest timer when that is showing
        return up ? <NextUpCard key={up.items.map((i) => i.key).join("|")} items={up.items} bottom={restEndsAt ? 274 : 210} onDismiss={() => setShowNextUp(false)} /> : null
      })()}

      {restEndsAt && <RestTimer endsAt={restEndsAt} onAdd={(s) => setRestEndsAt(restEndsAt + s * 1000)} onSkip={() => setRestEndsAt(null)} />}

      <button type="button" onClick={() => setAdding(true)} style={{ width: "100%", marginTop: 14, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.6)", border: "1.2px solid rgba(129,51,255,0.7)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Plus size={16} /> Add new exercise
      </button>

      {notice && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", margin: "10px 0 0", textAlign: "center" }}>{notice}</p>}

      <button type="button" onClick={finish} disabled={Boolean(celebrate)} style={{ width: "100%", marginTop: 12, padding: 16, borderRadius: 12, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 16, cursor: celebrate ? "default" : "pointer" }}>
        Finish Workout
      </button>

      {adding && <AddExerciseSheet onAdd={addExercises} onClose={() => setAdding(false)} />}
      {swapping && swapTarget && (
        <SwapSheet currentId={swapTarget.exerciseId} planAlternativeIds={swapTarget.alternatives ?? []} onPick={swapItem} onClose={() => setSwapping(null)} />
      )}
    </div>
  )
}
