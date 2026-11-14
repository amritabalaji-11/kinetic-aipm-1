import { useNavigate } from "react-router-dom"
import { BRICOLAGE, DM_SANS, INK, PURPLE } from "./planUi"
import GuidePoster from "./GuidePoster"
import { listGuides } from "../data/exerciseGuides"
import { getExercise } from "../utils/exerciseCatalog"

// "How to do it" posters on Home, one per exercise guide, swipe sideways. "See all" opens the whole list.
export default function GuidesRow() {
  const navigate = useNavigate()
  const guides = listGuides().map(({ exerciseId, guide }) => ({ exerciseId, guide, name: getExercise(exerciseId)?.name })).filter((g) => g.name)
  if (guides.length === 0) return null
  return (
    <section aria-label="Exercise guides" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
        <h3 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, margin: 0, flex: 1 }}>Exercise guides</h3>
        <button type="button" onClick={() => navigate("/guides")} style={{ background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 13 }}>See all ›</button>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x proximity" }}>
        {guides.map((g) => (
          <div key={g.exerciseId} style={{ scrollSnapAlign: "start", display: "flex" }}>
            <GuidePoster name={g.name} caption={`${g.guide.level.split(" ")[0]} · how to`} onOpen={() => navigate(`/exercise/${g.exerciseId}`, { state: { from: "/home" } })} />
          </div>
        ))}
      </div>
    </section>
  )
}
