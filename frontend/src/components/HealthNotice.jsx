import { useState } from "react"
import { Link } from "react-router-dom"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"
import { HEALTH_NOTICE } from "../data/legalText"

// "A note before you start": not medical advice, check with a doctor if any of the listed conditions apply. Continue stays off until ticked.
export default function HealthNotice({ onAccept, compact = false }) {
  const [ticked, setTicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const n = HEALTH_NOTICE
  const conditions = n.conditions.map((c, i) => <b key={c}>{c}{i < n.conditions.length - 2 ? ", " : i === n.conditions.length - 2 ? ", or " : ""}</b>)
  const go = async () => {
    setBusy(true); setError("")
    try { await onAccept() } catch (e) { setError(e.message || "We couldn't save that. Please try again."); setBusy(false) }
  }
  return (
    <div>
      {compact
        ? <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 20, color: INK, margin: "0 0 8px" }}>{n.title}</h2>
        : <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 10px" }}>{n.title}</h1>}
      <p style={{ fontFamily: DM_SANS, fontSize: 14.5, lineHeight: 1.5, color: "#1E293B", margin: "0 0 10px" }}>{n.intro}</p>
      <div style={{ background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)", borderRadius: 14, padding: "12px 14px", margin: "0 0 14px", fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.5, color: INK }}>
        If you’re {conditions}, {n.advice}
      </div>
      <label style={{ display: "flex", gap: 12, alignItems: "flex-start", background: ticked ? "#F5F3FF" : "#fff", border: `1.5px solid ${PURPLE}`, borderRadius: 14, padding: 12, marginBottom: 12, cursor: "pointer", fontFamily: DM_SANS, fontSize: 13.5, lineHeight: 1.4, color: INK }}>
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} style={{ width: 22, height: 22, accentColor: PURPLE, flexShrink: 0, marginTop: 1 }} />
        <span>{n.tick}</span>
      </label>
      <button type="button" disabled={!ticked || busy} onClick={go} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, cursor: ticked ? "pointer" : "not-allowed", opacity: ticked && !busy ? 1 : 0.45 }}>
        Continue
      </button>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", margin: "10px 0 0" }}>{error}</p>}
      <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, textAlign: "center", margin: "10px 0 0" }}>{n.after.replace("Profile → Terms.", "")}<Link to="/terms" style={{ color: PURPLE }}>Profile → Terms</Link>.</p>
    </div>
  )
}
