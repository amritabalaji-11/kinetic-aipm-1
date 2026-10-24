import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, Play, X } from "lucide-react"
import ListenButton from "./ListenButton"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { getExerciseGuide } from "../data/exerciseGuides"
import { useCoachScript } from "../utils/useCoachScript"

// Shown at the bottom of the workout right after a set is ticked: what comes next, with a quick refresher you can
// glance at, watch or listen to during your rest. `items` are the exercises coming up (two if they are paired);
// only the ones that have a form guide appear. Closed by default so it never gets in the way.
export default function NextUpCard({ items, bottom, onDismiss }) {
  const [open, setOpen] = useState(false)
  const guided = items.filter((it) => getExerciseGuide(it.exerciseId))

  // Starting to type a set folds the card back to its small bar, so it never sits on top of the boxes you are filling in
  useEffect(() => {
    if (!open) return undefined
    const fold = (e) => { if (e.target instanceof Element && e.target.matches("input[data-set-input]")) setOpen(false) }
    document.addEventListener("focusin", fold)
    return () => document.removeEventListener("focusin", fold)
  }, [open])

  if (guided.length === 0) return null

  const names = guided.map((it) => it.name).join(" + ")
  const where = guided.length === 1 ? guided[0].label : ""

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", padding: "0 24px", zIndex: 480, pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", width: "100%", maxWidth: 400, maxHeight: "60vh", overflowY: "auto", background: "#FFFFFF", borderRadius: 14, boxShadow: "0 6px 22px rgba(15,23,42,0.22)", border: "1.5px solid rgba(129,51,255,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 14px" }}>
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", cursor: "pointer", padding: "6px 0", textAlign: "left" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: PURPLE }}>NEXT UP{!open && " · TAP TO PREVIEW"}</span>
              <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {names}{where && <span style={{ fontFamily: DM_SANS, fontWeight: 400, fontSize: 12, color: GRAY }}> · {where}</span>}
              </span>
            </span>
            <ChevronDown size={18} color={PURPLE} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          <button type="button" aria-label="Close next up" onClick={onDismiss} style={{ width: 30, height: 30, borderRadius: 15, border: "none", background: "rgba(100,116,139,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={15} color={GRAY} />
          </button>
        </div>
        {open && (
          <div style={{ padding: "0 14px 14px" }}>
            {guided.map((it) => <Refresher key={it.key} item={it} showName={guided.length > 1} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export function Refresher({ item, showName }) {
  const guide = getExerciseGuide(item.exerciseId)
  const location = useLocation()
  const scripts = useCoachScript(item.exerciseId)
  const [watching, setWatching] = useState(false)
  const spoken = scripts?.short ?? guide.keyCues.join(" ")
  const id = guide.video.youtubeId

  return (
    <div style={{ borderTop: "1px solid rgba(129,51,255,0.12)", paddingTop: 10, marginTop: 4 }}>
      {showName && <p style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: PURPLE, margin: "0 0 4px" }}>{item.name} <span style={{ fontWeight: 400, color: GRAY }}>· {item.label}</span></p>}
      <ol style={{ margin: "0 0 10px", paddingLeft: 18, listStyle: "decimal" }}>
        {guide.keyCues.map((c, i) => <li key={i} style={{ fontFamily: DM_SANS, fontSize: 13, color: INK, lineHeight: 1.45, marginBottom: 4 }}>{c}</li>)}
      </ol>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setWatching(!watching)} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#FCF9FF", color: PURPLE, border: "1px solid #A36CFB", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <Play size={11} fill={PURPLE} /> {watching ? "Hide video" : "Watch"}
        </button>
        <ListenButton variant="light" coach text={spoken} />
        <Link to={`/exercise/${item.exerciseId}`} state={{ from: location.pathname }} style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, color: PURPLE, marginLeft: "auto" }}>Full guide ›</Link>
      </div>
      {watching && (
        <div style={{ position: "relative", width: 150, aspectRatio: guide.video.vertical ? "9 / 16" : "16 / 9", margin: "10px auto 0", borderRadius: 10, overflow: "hidden", background: "#0F172A" }}>
          <iframe
            title={`${item.name} demo`}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${id}&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}
    </div>
  )
}
