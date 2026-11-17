import { useNavigate } from "react-router-dom"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { previewOf } from "../utils/videoLink"

// The Plan page's "Videos" row: the video routines the person has saved. Nothing at all until they have saved one.
export default function VideosShelf({ saved }) {
  const navigate = useNavigate()
  if (!saved || saved.length === 0) return null
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 18, color: INK }}>Videos</span>
        <button type="button" onClick={() => navigate("/routine/new")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: PURPLE }}>+ New</button>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -24px 0 0", paddingRight: 24, scrollbarWidth: "none" }}>
        {saved.map((m) => {
          const r = m.routine
          const picture = previewOf(r.source?.url)?.small[0]
          return (
            <button key={m.routine_id} type="button" onClick={() => navigate("/routine/new", { state: { routine: r } })}
              style={{ width: 158, flexShrink: 0, padding: 0, textAlign: "left", cursor: "pointer", background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(129,51,255,0.18)" }}>
              <span style={{ display: "block", height: 88, background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)" }}>
                {picture && <img src={picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none" }} />}
              </span>
              <span style={{ display: "block", padding: "8px 10px" }}>
                <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 12.5, lineHeight: 1.2, color: INK }}>{r.title}</span>
                <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, marginTop: 2 }}>{[r.source?.author, r.total_minutes ? `${r.total_minutes} min` : `${r.steps.length} moves`].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
