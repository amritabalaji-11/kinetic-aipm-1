import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { useUser } from "../context/UserContext"
import { getFeedbackItem, reviewFeedback } from "../services/adminService"
import { TOPICS } from "../services/feedbackService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { formatDate, timeAgo } from "../utils/timeAgo"

const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]))

// One message: read it, look at what was attached, keep a private note, mark it reviewed
export default function AdminFeedbackPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const isAdmin = activeUser?.role === "admin"
  const [item, setItem] = useState(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (activeUser && !isAdmin) navigate("/profile", { replace: true }) }, [activeUser, isAdmin, navigate])
  useEffect(() => { if (isAdmin) getFeedbackItem(id).then((f) => { setItem(f); setNote(f.admin_note || "") }).catch((e) => setError(e.status === 404 ? "No such message." : e.message)) }, [id, isAdmin])
  if (!isAdmin) return null

  const mark = async (reviewed) => {
    setSaving(true); setError("")
    try {
      await reviewFeedback(id, { reviewed, note })
      setItem((f) => ({ ...f, status: reviewed ? "reviewed" : "new", admin_note: note.trim() || null }))
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate("/admin")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back to feedback
      </button>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", marginTop: 12 }}>{error}</p>}
      {item && (
        <>
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 4px" }}>{item.from}</h1>
          <div style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, marginBottom: 10 }}>
            {TOPIC_LABEL[item.topic] ?? item.topic} · {timeAgo(item.created_at)} ({formatDate(item.created_at)}) · {item.email ?? "no email"} ·{" "}
            <button type="button" onClick={() => navigate(`/admin/users/${item.user_id}`)} style={{ background: "none", border: "none", padding: 0, color: PURPLE, textDecoration: "underline", cursor: "pointer", fontFamily: DM_SANS, fontSize: 12.5 }}>see their activity</button>
          </div>
          <div style={{ ...cardStyle, fontFamily: DM_SANS, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap", color: INK }}>{item.message || "(no text, only attachments)"}</div>

          {item.media.map((m) => (
            m.kind === "video"
              ? <video key={m.media_id} src={m.url} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 12, background: "#0F172A", marginBottom: 10 }} />
              : <img key={m.media_id} src={m.url} alt="Attached by the person" style={{ width: "100%", maxHeight: 460, objectFit: "contain", background: "#0F172A", borderRadius: 12, marginBottom: 10 }} />
          ))}

          {item.analysis && (
            <div style={cardStyle}>
              <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>Analysis they included</div>
              <div style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>{[item.analysis.exercise_name, item.analysis.status, item.analysis.video_score != null ? `score ${Math.round(item.analysis.video_score)}` : null, timeAgo(item.analysis.created_at)].filter(Boolean).join(" · ")}</div>
            </div>
          )}
          {item.app_info && <div style={{ fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, margin: "0 0 12px", wordBreak: "break-word" }}>Sent from {item.app_info.page} · {item.app_info.screen} · {item.app_info.device}</div>}

          <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: GRAY, margin: "6px 0 4px" }}>Your private note</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} aria-label="Private note" placeholder="Only you can see this"
            style={{ ...cardStyle, width: "100%", boxSizing: "border-box", fontFamily: DM_SANS, fontSize: 14, outline: "none", resize: "none" }} />
          {item.status === "new"
            ? <button type="button" disabled={saving} onClick={() => mark(true)} style={{ width: "100%", height: 50, borderRadius: 14, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>{saving ? "Saving…" : "Mark reviewed"}</button>
            : (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={saving} onClick={() => mark(true)} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Save note</button>
                <button type="button" disabled={saving} onClick={() => mark(false)} style={{ flex: 1, height: 50, borderRadius: 14, border: `1.5px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Mark unread</button>
              </div>
            )}
        </>
      )}
    </div>
  )
}
