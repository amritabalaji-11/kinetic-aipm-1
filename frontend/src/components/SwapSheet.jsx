import { useMemo, useState } from "react"
import { Check } from "lucide-react"
import { EXERCISES } from "../data/dummyData"
import { swapChoices, equipmentLabel } from "../utils/exerciseCatalog"
import { BottomSheet, ExerciseLine, GradientButton, cardStyle, DM_SANS, GRAY, GRADIENT, FilterLabel } from "./planUi"

const GROUP_ADJECTIVE = { legs: "LEG", chest: "CHEST", back: "BACK", shoulders: "SHOULDER", arms: "ARM", core: "CORE", full_body: "FULL BODY" }
const muscles = (ex) => ex.muscles.join(", ")

// Pick a replacement for one exercise. onPick receives the chosen catalogue exercise.
export default function SwapSheet({ currentId, planAlternativeIds = [], onPick, onClose }) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(null)
  const { current, inPlan, sameMovement, sameGroup } = useMemo(() => swapChoices(currentId, planAlternativeIds), [currentId, planAlternativeIds])
  if (!current) return null

  // The sheet opens with the plan's own alternative picked, if the plan gave one
  const picked = selected ?? inPlan[0] ?? null

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const matches = searching ? EXERCISES.filter((e) => e.id !== current.id && (e.name.toLowerCase().includes(q) || e.muscles.some((m) => m.toLowerCase().includes(q)))) : []

  const groups = searching
    ? [{ title: "RESULTS", items: matches }]
    : [
        { title: "IN YOUR PLAN", items: inPlan },
        { title: "SAME MOVEMENT", items: sameMovement },
        { title: `OTHER ${GROUP_ADJECTIVE[current.muscleGroup] ?? ""} EXERCISES`.replace("  ", " "), items: sameGroup },
      ].filter((g) => g.items.length > 0)

  return (
    <BottomSheet
      title="Swap exercise"
      onClose={onClose}
      footer={<GradientButton disabled={!picked} onClick={() => picked && onPick(picked)}>{picked ? `Swap to ${picked.name}` : "Choose an exercise"}</GradientButton>}
    >
      <div style={{ ...cardStyle, marginBottom: 10 }}>
        <div style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, color: GRAY, paddingTop: 6 }}>REPLACING</div>
        <ExerciseLine name={current.name} sub={`${equipmentLabel(current)} · ${muscles(current)}`} />
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 24, border: "1.5px solid #E6E3F8", fontFamily: DM_SANS, fontSize: 14, outline: "none", background: "#fff" }}
      />
      {groups.map((g) => (
        <div key={g.title}>
          <FilterLabel>{g.title}</FilterLabel>
          <div style={cardStyle}>
            {g.items.map((ex, i) => {
              const on = picked?.id === ex.id
              return (
                <button key={ex.id} type="button" onClick={() => setSelected(ex)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", borderTop: i ? "1px solid rgba(129,51,255,0.12)" : "none" }}>
                  <ExerciseLine
                    name={ex.name}
                    sub={`${equipmentLabel(ex)} · ${muscles(ex)}`}
                    right={
                      <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? GRADIENT : "transparent", border: on ? "none" : "1.5px solid rgba(100,116,139,0.5)" }}>
                        {on && <Check size={13} color="#fff" strokeWidth={3} />}
                      </span>
                    }
                  />
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {searching && matches.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, marginTop: 14 }}>No exercises match “{query}”.</p>}
    </BottomSheet>
  )
}
