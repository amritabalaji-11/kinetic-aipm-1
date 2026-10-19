import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, Plus } from "lucide-react"
import { PRESET_CATEGORIES, PRESET_WORKOUTS } from "../data/presetWorkouts"
import { getMyWorkouts } from "../utils/myWorkouts"

const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
const BRICOLAGE = "'Bricolage Grotesque'"
const DM_SANS = "'DM Sans'"

function CategoryChip({ category, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
        padding: category.icon ? "6px 18px 6px 8px" : "9px 18px",
        borderRadius: 32, cursor: "pointer", fontFamily: DM_SANS, fontSize: 14,
        fontWeight: active ? 600 : 400,
        color: active ? "#FFFFFF" : "#0F172A",
        background: active ? GRADIENT : "transparent",
        border: active ? "1px solid transparent" : "1px solid #D3D3D3",
      }}
    >
      {category.icon && (
        <span style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={category.icon} alt="" style={{ maxWidth: 26, maxHeight: 26, objectFit: "contain" }} />
        </span>
      )}
      {category.label}
    </button>
  )
}

// Exercises in the main workout section (rests don't count)
const exerciseCount = (preset) =>
  preset.blocks.filter((b) => b.section === "workout").flatMap((b) => b.items).filter((i) => !i.rest).length

function PresetCard({ preset, onStart }) {
  return (
    <button
      type="button"
      onClick={onStart}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, textAlign: "left", cursor: "pointer",
        border: "1px solid transparent", borderRadius: 12,
        background: "linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(135deg, rgba(2,132,199,0.5), rgba(151,71,255,0.5)) border-box",
        boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div style={{ width: 60, height: 72, flexShrink: 0, borderRadius: 10, background: "rgba(129,51,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={preset.image} alt="" style={{ maxWidth: 48, maxHeight: 60, objectFit: "contain" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: "#0F172A", lineHeight: 1.25 }}>{preset.title}</span>
          <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 14, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 8px", borderRadius: 10, background: "rgba(129,51,255,0.12)", color: "#7C3AED", fontFamily: DM_SANS, fontSize: 11, fontWeight: 600 }}>
            {preset.tag}
          </span>
          <span style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>
            {exerciseCount(preset)} exercises · ~{preset.minutes} min
          </span>
        </div>

        <span style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B", lineHeight: 1.35 }}>{preset.blurb}</span>
      </div>
    </button>
  )
}

export default function PlanPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState("all")

  const visible = PRESET_WORKOUTS.filter((p) => category === "all" || p.category === category)

  const myWorkouts = getMyWorkouts()

  const startPreset = (preset) => navigate(`/plan/workout/${preset.id}`)

  const createOwn = () => navigate("/plan/custom")

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 24px 140px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, fontFamily: BRICOLAGE, color: "#0F172A", margin: "0 0 6px 0" }}>
        Today, I’m in the mood for…
      </h1>
      <p style={{ fontSize: 14, fontFamily: DM_SANS, color: "#454850", margin: 0 }}>Pick a ready-made workout to start.</p>
      <button
        type="button"
        onClick={createOwn}
        style={{ marginTop: 8, padding: 0, background: "none", border: "none", cursor: "pointer", color: "#8133FF", fontFamily: DM_SANS, fontSize: 14, fontWeight: 600 }}
      >
        Or create your own →
      </button>

      {myWorkouts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, fontFamily: DM_SANS, color: "#64748B", margin: "0 0 8px" }}>MY WORKOUTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myWorkouts.map((w) => (
              <button key={w.id} type="button" onClick={() => navigate("/plan/custom", { state: { saved: w } })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(129,51,255,0.3)", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                <span>
                  <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: "#0F172A" }}>{w.name}</span>
                  <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>{w.items.length} exercises</span>
                </span>
                <ChevronRight size={18} color="#8133FF" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "16px -24px 16px 0", paddingRight: 24, overflowX: "auto", scrollbarWidth: "none" }}>
        {PRESET_CATEGORIES.map((c) => (
          <CategoryChip key={c.id} category={c} active={category === c.id} onClick={() => setCategory(c.id)} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((preset) => (
          <PresetCard key={preset.id} preset={preset} onStart={() => startPreset(preset)} />
        ))}

        <button
          type="button"
          onClick={createOwn}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: 14, textAlign: "left", cursor: "pointer",
            borderRadius: 12, background: "rgba(255,255,255,0.5)", border: "1.5px dashed rgba(129,51,255,0.55)",
          }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 16, border: "1.5px solid rgba(129,51,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={18} color="#8133FF" />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: "#0F172A" }}>Create your own</span>
            <span style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>Pick muscles and exercises yourself</span>
          </span>
        </button>
      </div>
    </div>
  )
}
