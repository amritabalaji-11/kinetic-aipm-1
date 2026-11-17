import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch, BASE_URL } from "../services/api"

const card = { background: "#fff", borderRadius: "16px", padding: "12px", border: "1px solid rgba(129,51,255,0.12)" }
const nice = (name) => (name || "Session").toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

// A picture for the card: the one the server gave, or (for the built-in demo accounts) the sample pictures that ship with the app
function pictureFor(s, index) {
  if (s.image_url) return s.image_url
  const userId = localStorage.getItem("active_user_id") || ""
  if (userId === "user_001" || userId === "user_003") return `/formhistory/${userId}/${userId}_${index + 1}.jpg`
  if (userId === "user_002") return `/formhistory/${userId}/${["user_002_front_1133.jpg", "user_002_front_45.jpg"][index % 2]}`
  return null
}

// Every form check the person has done, newest first. Tapping one opens its full result.
export default function FormHistoryList() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null) // null while loading
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState({})

  useEffect(() => {
    const userId = localStorage.getItem("active_user_id") || "user_001"
    apiFetch(`${BASE_URL}/form_analysis_results/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setItems(Array.isArray(data) ? [...data].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : []))
      .catch(() => { setFailed(true); setItems([]) })
  }, [])

  if (items === null) {
    return <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: "99px", background: "#E9E6F8", borderRadius: "16px", animation: "pulse 2s infinite" }} />)}</div>
  }
  if (failed) {
    return <div style={{ ...card, textAlign: "center", padding: "30px 20px", fontFamily: "'DM Sans'", fontSize: "14px", color: "#454850" }}>We couldn&apos;t load your form checks just now. Please try again in a moment.</div>
  }
  if (items.length === 0) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "36px 20px", border: "1px dashed rgba(129,51,255,0.4)" }}>
        <p style={{ margin: "0 0 6px", fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: "16px", color: "#0F172A" }}>No form checks yet</p>
        <p style={{ margin: 0, fontFamily: "'DM Sans'", fontSize: "13px", lineHeight: 1.45, color: "#64748B" }}>Film a set from the Analysis tab and its result will be kept here.</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((s, index) => {
        const name = nice(s.exercise)
        const date = s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown date"
        const feedback = s.feedback || "No feedback available"
        const lines = feedback.split("\n")
        const long = lines.length > 3 || feedback.length > 200
        const isOpen = !!open[s.analysis_id]
        const picture = pictureFor(s, index)
        const view = () => navigate("/upload/results", { state: { analysisId: s.analysis_id } })
        return (
          <div key={s.analysis_id} style={{ ...card, padding: "10px", display: "flex", gap: "10px", textAlign: "left" }}>
            <div onClick={view} style={{ width: "70px", height: "56px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", cursor: "pointer", background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)" }}>
              {picture && <img src={picture} alt={name} onError={(e) => { e.currentTarget.style.display = "none" }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <button type="button" onClick={view} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#000" }}>{name}</span>
                </button>
                <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                  <b style={{ fontSize: "14px", color: "#FF8D28", fontFamily: "'Poppins'" }}>{Math.round(s.score ?? 0)}</b>
                  <span style={{ fontSize: "7px", fontFamily: "'Poppins'" }}>/100</span>
                </span>
              </div>
              <p style={{ fontSize: "10px", fontFamily: "'DM Sans'", color: "#39414D", margin: 0 }}>{date} • {s.load_kg}Kg • {s.rep_count} Reps</p>
              <p style={{ fontSize: "11px", fontFamily: "'DM Sans'", color: "#000", margin: 0, lineHeight: "14px", whiteSpace: "pre-line", ...(isOpen ? {} : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }) }}>{feedback}</p>
              {long && (
                <button type="button" onClick={() => setOpen({ ...open, [s.analysis_id]: !isOpen })} style={{ background: "none", border: "none", fontSize: "11px", fontWeight: 600, fontFamily: "'DM Sans'", color: "#0284C7", cursor: "pointer", padding: 0, marginTop: "2px", textAlign: "left" }}>
                  {isOpen ? "See less" : "See more"}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
