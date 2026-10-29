import { useState } from "react"
import { BottomSheet, FilterLabel, GradientButton, BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { FAMILIES, SET_TYPES, minutesOf, optionsFor, typeOfBlock } from "../utils/setTypes"

const MIN_MINUTES = 2
const MAX_MINUTES = 30

function Option({ type, state, selected, onPick }) {
  const disabled = !state.ok
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onPick()}
      style={{
        display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 8,
        borderRadius: 14, background: "#fff", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        border: selected ? `1.5px solid ${PURPLE}` : "1.2px solid rgba(100,116,139,0.18)",
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `1.8px solid ${selected ? PURPLE : "#B6BFCC"}`, background: selected ? `radial-gradient(${PURPLE} 0 45%, #fff 50%)` : "#fff" }} />
      <span>
        <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>{type.name}{type.size ? ` · ${type.size}${type.name === "Giant set" ? "+" : ""} exercise${type.size > 1 ? "s" : ""}` : ""}</span>
        <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, lineHeight: 1.35, marginTop: 1 }}>{type.meaning}</span>
        {disabled && <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: "#B45309", marginTop: 3 }}>{state.why}</span>}
        {!disabled && state.effect && !selected && <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, marginTop: 3 }}>{state.effect}</span>}
      </span>
    </button>
  )
}

const stepBtn = { width: 30, height: 30, borderRadius: 15, border: "none", background: "rgba(129,51,255,0.1)", color: PURPLE, fontWeight: 700, fontSize: 16, cursor: "pointer" }

// What a kind of set means. With `blocks`, `index` and `onApply` it also lets the person change the block to another kind in its family.
export default function SetTypeSheet({ block, blocks, index, onApply, onClose }) {
  const current = typeOfBlock(block)
  const [picked, setPicked] = useState(current)
  const [minutes, setMinutes] = useState(minutesOf(block))
  const type = SET_TYPES[current]

  if (!onApply) {
    return (
      <BottomSheet title={type.name} onClose={onClose}>
        <p style={{ fontFamily: DM_SANS, fontSize: 14, color: INK, lineHeight: 1.45, margin: "0 0 8px" }}>{type.meaning}</p>
        <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "0 0 14px" }}>{block.note}</p>
      </BottomSheet>
    )
  }

  const family = FAMILIES[type.family]
  const options = optionsFor(blocks, index)
  const timedWithMinutes = type.family === "timed" && (picked === "emom" || picked === "amrap")
  const changed = picked !== current || (timedWithMinutes && minutes !== minutesOf(block))

  return (
    <BottomSheet
      title="Set type"
      onClose={onClose}
      footer={<GradientButton onClick={() => changed && onApply(picked, { minutes })}>{changed ? "Apply" : "No change"}</GradientButton>}
    >
      <p style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, margin: "0 0 2px" }}>
        {type.family === "timed" ? "Your exercises stay. Only the timer changes." : "Your exercises stay. Only the grouping and rest change."}
      </p>
      <FilterLabel>{family.title}</FilterLabel>
      <div role="radiogroup" aria-label="Set type">
        {family.types.map((id) => <Option key={id} type={SET_TYPES[id]} state={options[id]} selected={picked === id} onPick={() => setPicked(id)} />)}
      </div>
      {timedWithMinutes && (
        <>
          <FilterLabel>{SET_TYPES[picked].name.toUpperCase()} SETTINGS</FilterLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1.2px solid rgba(100,116,139,0.18)", borderRadius: 14, padding: "8px 12px" }}>
            <span style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>Total time</span>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" aria-label="One minute less" disabled={minutes <= MIN_MINUTES} onClick={() => setMinutes((m) => Math.max(MIN_MINUTES, m - 1))} style={stepBtn}>−</button>
              <b style={{ fontFamily: BRICOLAGE, fontSize: 15, color: INK, minWidth: 50, textAlign: "center" }}>{minutes} min</b>
              <button type="button" aria-label="One minute more" disabled={minutes >= MAX_MINUTES} onClick={() => setMinutes((m) => Math.min(MAX_MINUTES, m + 1))} style={stepBtn}>+</button>
            </span>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
