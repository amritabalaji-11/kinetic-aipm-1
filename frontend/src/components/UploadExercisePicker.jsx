import { useState } from "react"
import { Check, Search, X } from "lucide-react"
import { BODY_AREAS, equipmentOptions, isAiReady, pickerExercises } from "../utils/analysableExercises"
import { equipmentLabel } from "../utils/exerciseCatalog"
import { BRICOLAGE, Chip, ChipRow, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "./planUi"

const FIRST_PAGE = 8
const READY_BADGE = { background: "rgba(129,51,255,0.1)", color: PURPLE }
const SOON_BADGE = { background: "rgba(100,116,139,0.12)", color: GRAY }

// Step 1 of the upload screen: what did you film? Pick a body area, then an exercise from that area.
// Once an exercise is chosen the picker folds into a one-line summary with a Change button.
export default function UploadExercisePicker({ exercise, onPick, onClear }) {
  const [area, setArea] = useState(null)
  const [query, setQuery] = useState("")
  const [equipment, setEquipment] = useState("all")
  const [showAll, setShowAll] = useState(false)

  if (exercise) {
    return (
      <div style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <Thumb src={exercise.image} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, margin: 0 }}>You&apos;re checking</p>
          <p style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{exercise.name}</p>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: 0 }}>{equipmentLabel(exercise)} · {exercise.category}</p>
        </div>
        <button type="button" onClick={onClear} style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, color: PURPLE, background: "none", border: "none", cursor: "pointer" }}>
          Change
        </button>
      </div>
    )
  }

  const searching = query.trim() !== ""
  const options = equipmentOptions({ area, query })
  const list = pickerExercises({ area, query, equipment })
  const shown = showAll ? list : list.slice(0, FIRST_PAGE)

  function chooseArea(id) {
    setArea((current) => (current === id ? null : id))
    setEquipment("all"); setShowAll(false)
  }

  return (
    <div>
      <div style={{ ...cardStyle, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {BODY_AREAS.map((a) => {
          const on = area === a.id
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => chooseArea(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                fontFamily: DM_SANS, fontSize: 14, fontWeight: on ? 700 : 500, color: INK,
                background: on ? "rgba(129,51,255,0.1)" : "#FFFFFF",
                border: on ? `1.5px solid ${PURPLE}` : "1.5px solid #E3E0F2",
                gridColumn: a.id === "full_body" ? "span 2" : undefined,
              }}
            >
              <span style={{ flex: 1 }}>{a.name}</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: GRAY }}>{a.count}</span>
            </button>
          )
        })}
      </div>

      <div style={{ ...cardStyle, padding: 14, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 12, background: "#F4F2FA" }}>
          <Search size={16} color={GRAY} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setEquipment("all"); setShowAll(false) }}
            placeholder="Search all exercises"
            aria-label="Search exercises"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14, color: INK, minWidth: 0 }}
          />
          {searching && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex" }}>
              <X size={16} color={GRAY} />
            </button>
          )}
        </div>

        {!area && !searching ? (
          <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: "14px 2px 4px", lineHeight: 1.5 }}>
            Pick a body area above, or search, to see exercises.
          </p>
        ) : (
          <>
            {options.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <ChipRow>
                  <Chip label="All" active={equipment === "all"} onClick={() => { setEquipment("all"); setShowAll(false) }} />
                  {options.map((o) => (
                    <Chip key={o} label={equipmentLabel({ equipment: o })} active={equipment === o} onClick={() => { setEquipment(o); setShowAll(false) }} />
                  ))}
                </ChipRow>
              </div>
            )}

            {list.length === 0 ? (
              <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: "14px 2px 4px" }}>No exercises match.</p>
            ) : (
              <div style={{ marginTop: 6 }}>
                {shown.map((e) => <Row key={e.id} exercise={e} onPick={onPick} />)}
                {list.length > shown.length && (
                  <button type="button" onClick={() => setShowAll(true)} style={{ width: "100%", marginTop: 6, padding: 10, border: "none", background: "none", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, color: PURPLE }}>
                    Show {list.length - shown.length} more
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <p style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, margin: "12px 2px 0", lineHeight: 1.5 }}>
          The AI form check works for goblet squats today. More exercises are on the way.
        </p>
      </div>
    </div>
  )
}

function Row({ exercise, onPick }) {
  const ready = isAiReady(exercise)
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => onPick(exercise)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 2px", textAlign: "left",
        border: "none", borderBottom: "1px solid #EEECF7", background: "none",
        cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.55,
      }}
    >
      <Thumb src={exercise.image} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, color: INK, margin: 0 }}>{exercise.name}</p>
        <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: 0 }}>{equipmentLabel(exercise)} · {exercise.category}</p>
      </div>
      <span style={{ ...(ready ? READY_BADGE : SOON_BADGE), flexShrink: 0, padding: "4px 9px", borderRadius: 20, fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        {ready && <Check size={11} strokeWidth={3} />}
        {ready ? "AI form check" : "Coming soon"}
      </span>
    </button>
  )
}

function Thumb({ src }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#F4F2FA", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={src || "/lifter_icon_nobg.png"} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  )
}
