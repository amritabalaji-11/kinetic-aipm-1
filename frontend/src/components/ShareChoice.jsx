import { useState } from "react"
import { Link } from "react-router-dom"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"

// The one-time question. Both answers are equally easy to give, nothing is pre-selected, and "no" costs nothing.
export default function ShareChoice({ onChoose, compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const pick = async (share) => {
    setBusy(true); setError("")
    try { await onChoose(share) } catch (e) { setError(e.message || "We couldn't save that. Please try again."); setBusy(false) }
  }
  const button = { width: "100%", height: 54, borderRadius: 16, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }
  return (
    <div>
      {compact
        ? <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 20, color: INK, margin: "0 0 8px" }}>Help us improve Kinetic?</h2>
        : <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 10px" }}>Help us improve Kinetic?</h1>}
      <p style={{ fontFamily: DM_SANS, fontSize: 15, lineHeight: 1.5, color: "#1E293B", margin: "0 0 8px" }}>
        Can our team watch your videos to check and improve the feedback?
      </p>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.5, color: GRAY, margin: "0 0 20px" }}>
        Only our team sees them. You can change this for any video, or for all of them, at any time in Profile.{" "}
        <Link to="/privacy" style={{ color: PURPLE }}>How we use videos</Link>
      </p>
      <button type="button" disabled={busy} onClick={() => pick(true)} style={{ ...button, border: "none", background: GRADIENT, color: "#fff", marginBottom: 10 }}>Yes, share my videos</button>
      <button type="button" disabled={busy} onClick={() => pick(false)} style={{ ...button, border: `1.5px solid ${PURPLE}`, background: "#fff", color: PURPLE }}>No, keep them private</button>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", margin: "10px 0 0" }}>{error}</p>}
    </div>
  )
}
