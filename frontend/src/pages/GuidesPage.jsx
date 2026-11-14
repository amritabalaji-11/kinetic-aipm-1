import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Search } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { listGuides } from "../data/exerciseGuides"
import { equipmentLabel, getExercise } from "../utils/exerciseCatalog"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

// Every exercise that has a guide. A search box for now; filters (movement, equipment) can come once there are more guides.
export default function GuidesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const all = useMemo(() => listGuides().map(({ exerciseId, guide }) => ({ exerciseId, guide, exercise: getExercise(exerciseId) })).filter((g) => g.exercise), [])
  const shown = all.filter((g) => !q.trim() || [g.exercise.name, ...g.exercise.muscles, g.exercise.equipment].some((t) => t.toLowerCase().includes(q.trim().toLowerCase())))

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 4px" }}>Exercise guides</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: "0 0 12px" }}>Short videos and three cues for each exercise. More on the way.</p>
      <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <Search size={16} color={GRAY} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or muscle" aria-label="Search guides" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14 }} />
      </label>
      {shown.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY }}>No guide matches that yet.</p>}
      {shown.map(({ exerciseId, guide, exercise }) => (
        <button key={exerciseId} type="button" onClick={() => navigate(`/exercise/${exerciseId}`, { state: { from: "/guides" } })} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "block" }}>
          <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: PURPLE }}>{exercise.name}</span>
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 13, color: GRAY, lineHeight: 1.4, margin: "2px 0 6px" }}>{guide.summary}</span>
          <span style={{ fontFamily: DM_SANS, fontSize: 11.5, fontWeight: 600, color: "#4C1D95" }}>{[guide.level, equipmentLabel(exercise), exercise.muscles.join(", ")].join(" · ")}</span>
        </button>
      ))}
    </div>
  )
}
