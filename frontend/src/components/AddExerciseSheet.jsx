import { useMemo, useState } from "react"
import { Check, Plus } from "lucide-react"
import { EXERCISES, MUSCLE_GROUPS } from "../data/dummyData"
import { EQUIPMENT_LABEL, equipmentLabel } from "../utils/exerciseCatalog"
import { BottomSheet, Chip, ChipRow, ExerciseLine, FilterLabel, GradientButton, cardStyle, DM_SANS, GRAY, GRADIENT } from "./planUi"

// Search and filter the catalogue, tick exercises, add them all at once.
export default function AddExerciseSheet({ onAdd, onClose }) {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("all")
  const [equipment, setEquipment] = useState("all")
  const [picked, setPicked] = useState([])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISES.filter((e) =>
      (group === "all" || e.groups.includes(group)) &&
      (equipment === "all" || e.equipment === equipment) &&
      (!q || e.name.toLowerCase().includes(q) || e.muscles.some((m) => m.toLowerCase().includes(q)))
    )
  }, [query, group, equipment])

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const add = () => onAdd(EXERCISES.filter((e) => picked.includes(e.id)))

  return (
    <BottomSheet
      title="Add exercises"
      onClose={onClose}
      footer={<GradientButton disabled={picked.length === 0} onClick={add}>{picked.length ? `Add ${picked.length} exercise${picked.length > 1 ? "s" : ""}` : "Add exercises"}</GradientButton>}
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 24, border: "1.5px solid #E6E3F8", fontFamily: DM_SANS, fontSize: 14, outline: "none", background: "#fff" }}
      />
      <FilterLabel>MUSCLE GROUP</FilterLabel>
      <ChipRow>
        <Chip label="All" active={group === "all"} onClick={() => setGroup("all")} />
        {MUSCLE_GROUPS.map((g) => <Chip key={g.id} label={g.name} active={group === g.id} onClick={() => setGroup(g.id)} />)}
      </ChipRow>
      <FilterLabel>EQUIPMENT</FilterLabel>
      <ChipRow>
        <Chip label="All" active={equipment === "all"} onClick={() => setEquipment("all")} />
        {Object.entries(EQUIPMENT_LABEL).map(([id, label]) => <Chip key={id} label={label} active={equipment === id} onClick={() => setEquipment(id)} />)}
      </ChipRow>

      <div style={{ ...cardStyle, marginTop: 14 }}>
        {visible.map((ex, i) => {
          const on = picked.includes(ex.id)
          return (
            <button key={ex.id} type="button" onClick={() => toggle(ex.id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", borderTop: i ? "1px solid rgba(129,51,255,0.12)" : "none" }}>
              <ExerciseLine
                name={ex.name}
                sub={`${equipmentLabel(ex)} · ${ex.muscles.join(", ")}`}
                right={
                  <span style={{ width: 28, height: 28, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? GRADIENT : "transparent", border: on ? "none" : "1.5px solid rgba(100,116,139,0.5)" }}>
                    {on ? <Check size={14} color="#fff" strokeWidth={3} /> : <Plus size={14} color="#8133FF" />}
                  </span>
                }
              />
            </button>
          )
        })}
        {visible.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, padding: "14px 0" }}>No exercises match these filters.</p>}
      </div>
    </BottomSheet>
  )
}
