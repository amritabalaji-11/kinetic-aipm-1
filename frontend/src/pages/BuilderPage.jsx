import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeftRight, ChevronLeft, Minus, Plus, X } from "lucide-react"
import { getExercise, equipmentLabel } from "../utils/exerciseCatalog"
import { saveMyWorkout } from "../utils/myWorkouts"
import { confirmWorkout } from "../utils/startWorkout"
import PumpButton from "../components/PumpButton"
import { blocksFromBuilder } from "../utils/workoutModel"
import AddExerciseSheet from "../components/AddExerciseSheet"
import SwapSheet from "../components/SwapSheet"
import { BlockTag, ExerciseLine, PurpleDivider, RoundButton, SectionHeading, cardStyle, BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"

let nextKey = 1
const newItem = (exerciseId, over = {}) => ({ key: nextKey++, exerciseId, sets: 3, reps: 10, linkNext: false, ...over })

function Stepper({ label, value, min = 1, max = 99, onChange }) {
  const btn = { width: 26, height: 26, borderRadius: 13, border: "none", background: "rgba(129,51,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{label}</span>
      <button type="button" aria-label={`Fewer ${label}`} style={btn} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={13} color={PURPLE} /></button>
      <span style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, minWidth: 20, textAlign: "center" }}>{value}</span>
      <button type="button" aria-label={`More ${label}`} style={btn} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={13} color={PURPLE} /></button>
    </div>
  )
}

export default function BuilderPage() {
  const navigate = useNavigate()
  const saved = useLocation().state?.saved
  const [name, setName] = useState(saved?.name ?? "")
  const [items, setItems] = useState(() => saved?.items?.map((i) => newItem(i.id, { sets: i.sets, reps: i.reps, linkNext: i.linkNext })) ?? [])
  const [openKey, setOpenKey] = useState(null)
  const [adding, setAdding] = useState(false)
  const [swapKey, setSwapKey] = useState(null)
  const [saveIt, setSaveIt] = useState(true)

  const update = (key, patch) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const remove = (key) =>
    setItems((prev) => {
      const next = prev.filter((i) => i.key !== key)
      if (next.length) next[next.length - 1] = { ...next[next.length - 1], linkNext: false } // last one can't link onward
      return next
    })

  const addExercises = (exercises) => {
    setItems((prev) => [...prev, ...exercises.map((e) => newItem(e.id))])
    setAdding(false)
  }

  const swapTarget = items.find((i) => i.key === swapKey)

  const create = () => {
    const groups = [...new Set(items.map((i) => getExercise(i.exerciseId).muscleGroup))]
    const title = name.trim() || "My workout"
    if (saveIt) saveMyWorkout({ id: saved?.id ?? Date.now(), name: title, items: items.map((i) => ({ id: i.exerciseId, sets: i.sets, reps: i.reps, linkNext: i.linkNext })) })
    confirmWorkout(navigate, { blocks: blocksFromBuilder(items), muscles: groups, presetTitle: title })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "20px 20px 140px" }}>
      <button type="button" onClick={() => navigate("/plan")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0, marginBottom: 10 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 24, color: INK, margin: "0 0 2px" }}>Create your own</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: "0 0 14px" }}>Add exercises and set your sets and reps.</p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name (optional)"
        style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: "1.5px solid #E6E3F8", fontFamily: DM_SANS, fontSize: 15, outline: "none", background: "#fff" }}
      />

      <SectionHeading title="Exercises" right={`${items.length} exercise${items.length === 1 ? "" : "s"}`} />

      {items.length === 0 ? (
        <button type="button" onClick={() => setAdding(true)} style={{ width: "100%", padding: "34px 20px", borderRadius: 12, border: "1.5px dashed rgba(129,51,255,0.55)", background: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ width: 44, height: 44, borderRadius: 22, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={20} color="#fff" strokeWidth={2.6} /></span>
          <span style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 16, color: PURPLE }}>Add your first exercise</span>
          <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>Search, or filter by muscle group and equipment.</span>
        </button>
      ) : (
        <>
          <div style={cardStyle}>
            {items.map((it, idx) => {
              const ex = getExercise(it.exerciseId)
              const open = openKey === it.key
              const startsSuperset = it.linkNext && (idx === 0 || !items[idx - 1].linkNext)
              const joinsPrev = idx > 0 && items[idx - 1].linkNext
              return (
                <div key={it.key}>
                  {idx > 0 && !joinsPrev && <PurpleDivider />}
                  {startsSuperset && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 0" }}>
                      <BlockTag>SUPERSET</BlockTag>
                      <span style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY }}>Done back-to-back</span>
                    </div>
                  )}
                  <div onClick={() => setOpenKey(open ? null : it.key)} style={{ cursor: "pointer" }}>
                    <ExerciseLine
                      name={ex.name}
                      sub={`${it.sets} sets × ${it.reps} reps · ${equipmentLabel(ex)}`}
                      right={
                        <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                          <RoundButton label={`Swap ${ex.name}`} onClick={() => setSwapKey(it.key)}><ArrowLeftRight size={15} color={PURPLE} strokeWidth={2.2} /></RoundButton>
                          <RoundButton label={`Remove ${ex.name}`} tone="gray" onClick={() => remove(it.key)}><X size={14} color={GRAY} strokeWidth={2.4} /></RoundButton>
                        </div>
                      }
                    />
                  </div>
                  {open && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 18px", paddingBottom: 8 }}>
                      <Stepper label="Sets" value={it.sets} onChange={(v) => update(it.key, { sets: v })} />
                      <Stepper label="Reps" value={it.reps} max={100} onChange={(v) => update(it.key, { reps: v })} />
                      {idx < items.length - 1 && (
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: DM_SANS, fontSize: 12, color: PURPLE, fontWeight: 600, cursor: "pointer" }}>
                          <input type="checkbox" checked={it.linkNext} onChange={(e) => update(it.key, { linkNext: e.target.checked })} />
                          Superset with next
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button type="button" onClick={() => setAdding(true)} style={{ width: "100%", marginTop: 12, padding: "14px", borderRadius: 12, border: "1.5px dashed rgba(129,51,255,0.55)", background: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: PURPLE }}>
            <Plus size={16} color={PURPLE} /> Add exercise
          </button>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "10px 0 0" }}>Tap an exercise to change its sets and reps, or to do it back-to-back with the next one (a superset).</p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: INK }}>Save to My workouts</span>
              <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>Find it again next time under Plan</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={saveIt}
              aria-label="Save to My workouts"
              onClick={(e) => { e.preventDefault(); setSaveIt(!saveIt) }}
              style={{ width: 46, height: 26, borderRadius: 13, border: "none", padding: 3, cursor: "pointer", display: "flex", justifyContent: saveIt ? "flex-end" : "flex-start", background: saveIt ? GRADIENT : "rgba(100,116,139,0.35)" }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 10, background: "#fff" }} />
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <PumpButton disabled={items.length === 0} onPumped={create}>Confirm today&apos;s workout</PumpButton>
        {items.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "8px 0 0" }}>Add at least one exercise to continue.</p>}
      </div>

      {adding && <AddExerciseSheet onAdd={addExercises} onClose={() => setAdding(false)} />}
      {swapTarget && (
        <SwapSheet
          currentId={swapTarget.exerciseId}
          onPick={(ex) => { update(swapTarget.key, { exerciseId: ex.id }); setSwapKey(null) }}
          onClose={() => setSwapKey(null)}
        />
      )}
    </div>
  )
}
