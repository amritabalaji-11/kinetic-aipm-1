import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Chip, ChipRow, DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { STEP, clampWeight, formatWeight, quickWeights } from "../utils/weightInput"

const roundButton = (disabled) => ({
  width: 52, height: 52, borderRadius: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  border: `1.5px solid ${disabled ? "#E5E7EB" : "#A5B4FC"}`, background: disabled ? "#F9FAFB" : "#EEF2FF", cursor: disabled ? "not-allowed" : "pointer",
})

// The weight for the video: type it, nudge it with big buttons, or tap a common weight.
// `last` is the weight used last time for this exercise ({ value, unit }) or null.
export default function LoadCard({ value, unit, equipment, last, onChange, onUnitChange }) {
  const [text, setText] = useState(value ? formatWeight(value) : "")
  // keep the box in step when the value changes from a button, a chip or a unit switch
  useEffect(() => { setText(value ? formatWeight(value) : "") }, [value])

  const set = (next) => onChange(clampWeight(next, unit))
  const typed = (raw) => {
    const cleaned = raw.replace(",", ".")
    if (!/^\d{0,3}(\.\d?)?$/.test(cleaned)) return // numbers with at most one decimal
    setText(cleaned)
    set(cleaned === "" || cleaned === "." ? 0 : parseFloat(cleaned))
  }
  const sameAsLast = last && last.unit === unit && last.value === value

  return (
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Weight</span>
        <div className="flex rounded-full overflow-hidden border border-indigo-200 text-xs font-semibold">
          {[["Kg", "kg"], ["Lbs", "lbs"]].map(([label, val]) => (
            <button key={val} type="button" onClick={() => onUnitChange(val)} className="px-3 py-1 transition-colors"
              style={{ background: unit === val ? "#3b82f6" : "white", color: unit === val ? "white" : "#6b7280" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button type="button" aria-label="Lower the weight" disabled={value <= 0} onClick={() => set(value - STEP[unit])} style={roundButton(value <= 0)}>
          <Minus size={22} color={value <= 0 ? "#D1D5DB" : "#4F46E5"} />
        </button>
        <label style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, minWidth: 130 }}>
          <input
            type="text"
            inputMode="decimal"
            aria-label={`Weight in ${unit}`}
            value={text}
            placeholder="0"
            onChange={(e) => typed(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{ width: 92, textAlign: "center", border: "none", borderBottom: "2px solid #C7D2FE", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 34, fontWeight: 700, color: INK, padding: "2px 0" }}
          />
          <span style={{ fontFamily: DM_SANS, fontSize: 14, fontWeight: 600, color: GRAY, textTransform: "uppercase" }}>{unit}</span>
        </label>
        <button type="button" aria-label="Raise the weight" onClick={() => set(value + STEP[unit])} style={roundButton(false)}>
          <Plus size={22} color="#4F46E5" />
        </button>
      </div>
      <p style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, textAlign: "center", margin: "6px 0 12px" }}>Tap the number to type it</p>

      <p style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, color: GRAY, margin: "0 0 6px" }}>COMMON WEIGHTS</p>
      <ChipRow>
        {quickWeights(equipment, unit).map((w) => (
          <Chip key={w} label={String(w)} active={value === w} onClick={() => set(w)} />
        ))}
      </ChipRow>

      {last && !sameAsLast && (
        <button type="button" onClick={() => { if (last.unit !== unit) onUnitChange(last.unit, last.value); else set(last.value) }}
          style={{ marginTop: 12, width: "100%", padding: "10px 12px", borderRadius: 12, border: "1.2px dashed #A5B4FC", background: "#F5F7FF", cursor: "pointer", fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, color: PURPLE }}>
          Same as last time: {formatWeight(last.value)} {last.unit}
        </button>
      )}
      {sameAsLast && <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, textAlign: "center", margin: "10px 0 0" }}>Same as last time</p>}
    </div>
  )
}
