import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, ClipboardList, Dumbbell, PlayCircle, Star, Video } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { useUser } from "../context/UserContext"
import { getUser, revealEmail } from "../services/adminService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { formatDate, timeAgo } from "../utils/timeAgo"
import { Pill } from "./AdminPage"

// What each kind of event looks like in the timeline
const EVENTS = {
  signed_up: { Icon: Star, title: () => "Signed up", detail: (e) => e.detail },
  analysis: { Icon: PlayCircle, title: () => "Form analysis", detail: (e) => [e.title, e.detail, e.score != null ? `score ${Math.round(e.score)}` : null].filter(Boolean).join(" · ") },
  workout: { Icon: Dumbbell, title: () => "Workout logged", detail: (e) => [e.title || "Workout", e.score ? `${e.score} min` : null].filter(Boolean).join(" · ") },
  routine_saved: { Icon: ClipboardList, title: () => "Saved a routine", detail: (e) => e.title },
  video_read: { Icon: Video, title: () => "Read a video into a routine", detail: () => "" },
}
const COUNT_LABELS = { analysis: ["analysis", "analyses"], workout: ["workout", "workouts"], routine_saved: ["routine", "routines"], video_read: ["video read", "videos read"] }

export default function AdminUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const isAdmin = activeUser?.role === "admin"
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState(null) // the full email, once revealed
  const [error, setError] = useState("")

  useEffect(() => { if (activeUser && !isAdmin) navigate("/profile", { replace: true }) }, [activeUser, isAdmin, navigate])
  useEffect(() => { if (isAdmin) getUser(id).then(setUser).catch((e) => setError(e.status === 404 ? "No such person." : e.message)) }, [id, isAdmin])
  const reveal = () => revealEmail(id).then((r) => setEmail(r.email || "(no email)")).catch((e) => setError(e.message))
  if (!isAdmin) return null

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate("/admin")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back to people
      </button>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", marginTop: 12 }}>{error}</p>}
      {user && (
        <>
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 12px" }}>{user.display_name || `Unnamed · ${user.user_id.slice(0, 6)}…`}</h1>
          <div style={cardStyle}>
            <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, wordBreak: "break-all" }}>User id {user.user_id} · {user.auth_provider}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <b style={{ fontFamily: DM_SANS, fontSize: 15 }}>{email ?? user.email ?? "(no email)"}</b>
              {email === null && user.email && (
                <button type="button" onClick={reveal} style={{ border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, borderRadius: 999, padding: "5px 12px", fontFamily: DM_SANS, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Show email</button>
              )}
            </div>
            <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, marginTop: 6 }}>Last signed in {timeAgo(user.last_login)}. Opening this page and showing an email are recorded in the admin log.</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 12px" }}>
            {Object.entries(user.counts).map(([kind, n]) => <Pill key={kind}>{n} {COUNT_LABELS[kind]?.[n === 1 ? 0 : 1] ?? kind}</Pill>)}
          </div>
          <div style={{ ...cardStyle, padding: "4px 12px" }}>
            {user.timeline.map((e, i) => {
              const spec = EVENTS[e.type] ?? EVENTS.video_read
              return (
                <div key={`${e.type}-${e.id ?? "x"}-${i}`} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid rgba(100,116,139,0.2)" : "none" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: PURPLE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><spec.Icon size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, color: INK }}>{spec.title(e)}</div>
                    <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{[spec.detail(e), `${timeAgo(e.at)} (${formatDate(e.at)})`].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>No videos, dates of birth or injury notes are shown here.</p>
        </>
      )}
    </div>
  )
}
