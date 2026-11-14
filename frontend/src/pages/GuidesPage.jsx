import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Play, Search } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { EquipmentIcon, MuscleIcon } from "../components/FilterIcons"
import { guideVideo, listGuides } from "../data/exerciseGuides"
import { EQUIPMENT_LABEL, GROUP_LABEL, equipmentLabel, getExercise } from "../utils/exerciseCatalog"
import { filterGuides, filterOptions, formatLength } from "../utils/guideFilters"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const chip = (on) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", flexShrink: 0, fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })
const strip = { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }

// A picture from the middle of the video (not the creator's own cover, which can carry text), cropped to fit the box
function Thumbnail({ video }) {
  const portrait = video?.vertical !== false
  return (
    <span style={{ position: "relative", display: "block", flexShrink: 0, width: portrait ? 84 : 128, height: portrait ? 150 : 72, borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #0F172A 0%, #312E81 55%, #6D28D9 100%)" }}>
      {video && <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hq2.jpg`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none" }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Play size={14} color="#4C1D95" fill="#4C1D95" style={{ marginLeft: 2 }} />
      </span>
      {video?.seconds ? <span style={{ position: "absolute", right: 5, bottom: 5, background: "rgba(0,0,0,0.65)", color: "#fff", fontFamily: DM_SANS, fontWeight: 700, fontSize: 10.5, borderRadius: 6, padding: "1px 6px" }}>{formatLength(video.seconds)}</span> : null}
    </span>
  )
}

// Every exercise that has a guide: search, filter by muscle group and equipment, tap a card to watch.
export default function GuidesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [group, setGroup] = useState("")
  const [equipment, setEquipment] = useState("")
  const all = useMemo(() => listGuides().map(({ exerciseId, guide }) => ({ exerciseId, guide, exercise: getExercise(exerciseId) })).filter((g) => g.exercise), [])
  const groups = useMemo(() => filterOptions(all, "group"), [all])
  const equipments = useMemo(() => filterOptions(all, "equipment"), [all])
  const shown = filterGuides(all, { q, group, equipment })
  const filtered = Boolean(group || equipment || q.trim())

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 4px" }}>Exercise guides</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: "0 0 12px" }}>Short videos and three cues for each exercise.</p>
      <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 10 }}>
        <Search size={16} color={GRAY} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or muscle" aria-label="Search guides" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14 }} />
      </label>

      <div role="radiogroup" aria-label="Muscle group" style={strip}>
        <button type="button" role="radio" aria-checked={!group} onClick={() => setGroup("")} style={chip(!group)}>All</button>
        {groups.map(({ id, count }) => (
          <button key={id} type="button" role="radio" aria-checked={group === id} onClick={() => setGroup(group === id ? "" : id)} style={chip(group === id)}>
            <MuscleIcon group={id} active={group === id} height={30} /> {GROUP_LABEL[id] ?? id} <span style={{ opacity: 0.7, fontWeight: 500 }}>{count}</span>
          </button>
        ))}
      </div>
      {equipments.length > 1 && (
        <div role="radiogroup" aria-label="Equipment" style={strip}>
          <button type="button" role="radio" aria-checked={!equipment} onClick={() => setEquipment("")} style={chip(!equipment)}>Any equipment</button>
          {equipments.map(({ id, count }) => (
            <button key={id} type="button" role="radio" aria-checked={equipment === id} onClick={() => setEquipment(equipment === id ? "" : id)} style={chip(equipment === id)}>
              <EquipmentIcon equipment={id} size={17} /> {EQUIPMENT_LABEL[id] ?? id} <span style={{ opacity: 0.7, fontWeight: 500 }}>{count}</span>
            </button>
          ))}
        </div>
      )}
      {filtered && <button type="button" onClick={() => { setQ(""); setGroup(""); setEquipment("") }} style={{ display: "block", marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 12.5, padding: "0 0 8px" }}>Clear filters</button>}

      {shown.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY }}>No guide matches that yet.</p>}
      {shown.map(({ exerciseId, guide, exercise }) => (
        <button key={exerciseId} type="button" onClick={() => navigate(`/exercise/${exerciseId}`, { state: { from: "/guides" } })} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", gap: 12, padding: 10 }}>
          <Thumbnail video={guideVideo(guide, 0)} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: PURPLE }}>{exercise.name}</span>
            <span style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, lineHeight: 1.35, margin: "3px 0 6px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{guide.summary}</span>
            <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[guide.level.split(" ")[0], equipmentLabel(exercise), ...exercise.groups.map((g) => GROUP_LABEL[g] ?? g)].map((t) => (
                <span key={t} style={{ fontFamily: DM_SANS, fontSize: 11.5, fontWeight: 600, background: "rgba(129,51,255,0.1)", color: "#4C1D95", borderRadius: 10, padding: "3px 8px" }}>{t}</span>
              ))}
            </span>
            <span style={{ marginTop: "auto", alignSelf: "flex-end", display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "7px 16px", fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: "#fff", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)" }}>
              <Play size={12} fill="#fff" /> Watch
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
