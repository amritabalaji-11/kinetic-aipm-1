import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "./planUi"
import { getVideos } from "../services/adminService"
import { timeAgo } from "../utils/timeAgo"

const PAGE = 30
const VERDICT = { good: ["Good", "#DCFCE7", "#15803D"], mixed: ["Mixed", "#FEF3C7", "#92400E"], wrong: ["Wrong", "#FEE2E2", "#B91C1C"] }
const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })

// Videos whose owners switched on "Let the Kinetic team watch this video". Nothing else is listed.
export default function AdminVideosList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("all")
  const [items, setItems] = useState([])
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    getVideos({ status, limit: PAGE }).then((r) => { setItems(r.videos); setMore(r.videos.length === PAGE); setError("") }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [status])
  const loadMore = () => getVideos({ status, limit: PAGE, offset: items.length }).then((r) => { setItems((i) => [...i, ...r.videos]); setMore(r.videos.length === PAGE) }).catch((e) => setError(e.message))

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["all", "All"], ["new", "Not reviewed"], ["reviewed", "Reviewed"]].map(([id, label]) => <button key={id} type="button" style={chip(status === id)} onClick={() => setStatus(id)}>{label}</button>)}
      </div>
      <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "0 0 10px" }}>Only videos the person has chosen to share with the team. If they turn it off, it disappears from here.</p>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626" }}>{error}</p>}
      {!loading && items.length === 0 && !error && <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY }}>No shared videos yet.</p>}
      {items.map((v) => {
        const verdict = VERDICT[v.verdict]
        return (
          <button key={v.analysis_id} type="button" onClick={() => navigate(`/admin/videos/${v.analysis_id}`)} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "block" }}>
            <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: PURPLE }}>{v.exercise || "Video"} · {v.from}</span>
            <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{[timeAgo(v.created_at), v.rep_count != null ? `${v.rep_count} reps counted` : null, v.score != null ? `score ${Math.round(v.score)}` : null, v.status !== "completed" ? v.status : null].filter(Boolean).join(" · ")}</span>
            <span style={{ display: "inline-block", marginTop: 6, fontFamily: DM_SANS, fontWeight: 700, fontSize: 11, borderRadius: 8, padding: "2px 8px", background: verdict ? verdict[1] : "rgba(129,51,255,0.1)", color: verdict ? verdict[2] : INK }}>{verdict ? `Reviewed: ${verdict[0]}` : "Not reviewed"}</span>
          </button>
        )
      })}
      {more && <button type="button" onClick={loadMore} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Show more</button>}
    </>
  )
}
