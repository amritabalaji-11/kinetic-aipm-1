import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "./planUi"
import { getFeedback } from "../services/adminService"
import { TOPICS } from "../services/feedbackService"
import { timeAgo } from "../utils/timeAgo"

const PAGE = 30
const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]))
const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })

// The inbox: newest first, with a filter for topic and for unread
export default function AdminFeedbackList() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [items, setItems] = useState([])
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const status = unreadOnly ? "new" : "all"

  useEffect(() => {
    setLoading(true)
    getFeedback({ topic, status, limit: PAGE }).then((r) => { setItems(r.feedback); setMore(r.feedback.length === PAGE); setError("") }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [topic, status])

  const loadMore = () => getFeedback({ topic, status, limit: PAGE, offset: items.length }).then((r) => { setItems((i) => [...i, ...r.feedback]); setMore(r.feedback.length === PAGE) }).catch((e) => setError(e.message))

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <button type="button" style={chip(!topic)} onClick={() => setTopic("")}>All</button>
        {TOPICS.map((t) => <button key={t.id} type="button" style={chip(topic === t.id)} onClick={() => setTopic(t.id)}>{t.label}</button>)}
        <button type="button" style={chip(unreadOnly)} onClick={() => setUnreadOnly((u) => !u)}>Unread</button>
      </div>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626" }}>{error}</p>}
      {!loading && items.length === 0 && !error && <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY }}>{unreadOnly ? "Nothing unread." : "No feedback yet."}</p>}
      {items.map((f) => {
        const unread = f.status === "new"
        const extras = [f.videos ? `${f.videos} video${f.videos > 1 ? "s" : ""}` : null, f.photos ? `${f.photos} photo${f.photos > 1 ? "s" : ""}` : null, f.has_analysis ? "analysis included" : null].filter(Boolean)
        return (
          <button key={f.feedback_id} type="button" onClick={() => navigate(`/admin/feedback/${f.feedback_id}`)} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start", opacity: unread ? 1 : 0.7 }}>
            <span aria-label={unread ? "Unread" : "Reviewed"} style={{ width: 9, height: 9, borderRadius: 5, background: unread ? PURPLE : "#CBD5E1", marginTop: 6, flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>
                <b style={{ background: f.topic === "bug" ? "#FEE2E2" : "rgba(129,51,255,0.1)", color: f.topic === "bug" ? "#B91C1C" : "#4C1D95", borderRadius: 8, padding: "2px 8px", marginRight: 6, fontSize: 10.5 }}>{unread ? TOPIC_LABEL[f.topic] ?? f.topic : "Reviewed"}</b>
                {f.from} · {timeAgo(f.created_at)}
              </span>
              <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 14.5, color: INK, marginTop: 3 }}>{f.preview || "(no text, only attachments)"}</span>
              {extras.length > 0 && <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY, marginTop: 2 }}>{extras.join(" · ")}</span>}
            </span>
          </button>
        )
      })}
      {more && <button type="button" onClick={loadMore} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Show more</button>}
    </>
  )
}
