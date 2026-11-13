import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Search } from "lucide-react"
import AdminFeedbackList from "../components/AdminFeedbackList"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { useUser } from "../context/UserContext"
import { getSummary, getUsers } from "../services/adminService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { timeAgo } from "../utils/timeAgo"

const PAGE = 30
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`
const PROVIDERS = { email: "Email", google: "Google", apple: "Apple", facebook: "Facebook" }

export function Pill({ children }) {
  return <span style={{ fontFamily: DM_SANS, fontSize: 11.5, fontWeight: 600, background: "rgba(129,51,255,0.1)", color: "#4C1D95", borderRadius: 10, padding: "3px 8px" }}>{children}</span>
}

// Who signed up and what they did. Only admins reach this (the server checks too).
export default function AdminPage() {
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const isAdmin = activeUser?.role === "admin"
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [q, setQ] = useState("")
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("users")

  useEffect(() => { if (activeUser && !isAdmin) navigate("/profile", { replace: true }) }, [activeUser, isAdmin, navigate])
  useEffect(() => { if (isAdmin) getSummary().then(setSummary).catch((e) => setError(e.message)) }, [isAdmin])
  // search as you type (a short pause first), and start the list again each time
  useEffect(() => {
    if (!isAdmin) return undefined
    setLoading(true)
    const t = setTimeout(() => {
      getUsers({ q, limit: PAGE }).then((r) => { setUsers(r.users); setMore(r.users.length === PAGE); setError("") }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, isAdmin])

  const loadMore = () => getUsers({ q, limit: PAGE, offset: users.length }).then((r) => { setUsers((u) => [...u, ...r.users]); setMore(r.users.length === PAGE) }).catch((e) => setError(e.message))
  if (!isAdmin) return null

  const tile = (value, label) => (
    <div style={{ ...cardStyle, padding: "10px 12px", marginBottom: 0 }}>
      <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: PURPLE, lineHeight: 1.1 }}>{value ?? "–"}</div>
      <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{label}</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate("/profile")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Profile
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 12px" }}>Admin</h1>
      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["users", "Users"], ["feedback", "Feedback"]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: 8, borderRadius: 999, cursor: "pointer", border: `1.2px solid ${tab === id ? PURPLE : "rgba(129,51,255,0.35)"}`, background: tab === id ? PURPLE : "#fff", color: tab === id ? "#fff" : PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 13 }}>
            {label}{id === "feedback" && summary?.feedback_new > 0 && <span style={{ marginLeft: 6, background: tab === id ? "#fff" : PURPLE, color: tab === id ? PURPLE : "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{summary.feedback_new} new</span>}
          </button>
        ))}
      </div>

      {tab === "feedback" ? <AdminFeedbackList /> : <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {tile(summary?.users_total, "people signed up")}{tile(summary?.new_last_24h, "new in 24 hours")}
        {tile(summary?.active_last_7d, "active in 7 days")}{tile(summary?.analyses_total, "videos analysed")}
      </div>

      <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 12 }}>
        <Search size={16} color={GRAY} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, id or email" aria-label="Search people"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14 }} />
      </label>

      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626" }}>{error}</p>}
      {!loading && users.length === 0 && !error && <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY }}>{q ? "Nobody matches that." : "Nobody has signed up yet."}</p>}
      {users.map((u) => (
        <button key={u.user_id} type="button" onClick={() => navigate(`/admin/users/${u.user_id}`)} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "block" }}>
          <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: PURPLE }}>{u.display_name || `Unnamed · ${u.user_id.slice(0, 6)}…`}</div>
          <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{[u.email, PROVIDERS[u.auth_provider] ?? u.auth_provider, `signed up ${timeAgo(u.signed_up)}`].filter(Boolean).join(" · ")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            <Pill>{plural(u.analyses, "analysis").replace("analysiss", "analyses")}</Pill><Pill>{plural(u.workouts, "workout")}</Pill>
            <Pill>{u.last_active ? `active ${timeAgo(u.last_active)}` : "no activity yet"}</Pill>
          </div>
        </button>
      ))}
      {more && <button type="button" onClick={loadMore} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1.2px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Show more</button>}
      </>}
    </div>
  )
}
