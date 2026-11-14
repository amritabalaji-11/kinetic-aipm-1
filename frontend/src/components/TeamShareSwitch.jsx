import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { DM_SANS, GRAY, INK, PURPLE } from "./planUi"
import { getTeamReview, setTeamReview } from "../services/videoShareService"

// The words people agree to. Off unless they turn it on.
export const SHARE_LABEL = "Let the Kinetic team watch this video to improve the feedback"

// A plain on/off switch with the wording. Controlled: the parent holds `checked`.
export default function TeamShareSwitch({ checked, onChange, disabled = false, note }) {
  return (
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14, padding: 12, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
      <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, background: checked ? PURPLE : "#CBD5E1", position: "relative", flexShrink: 0, marginTop: 1, transition: "background 0.15s" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.15s" }} />
      </span>
      <span style={{ fontFamily: DM_SANS, fontSize: 13.5, lineHeight: 1.4, color: INK }}>
        <b>{SHARE_LABEL}</b>
        <span style={{ display: "block", color: GRAY, fontSize: 12.5, marginTop: 2 }}>
          {note ?? "Off unless you turn it on. Only our team sees it, and you can change this any time."} <Link to="/privacy" style={{ color: PURPLE }}>How we use videos</Link>
        </span>
      </span>
    </label>
  )
}

// On the results screen: the same switch for a video that is already uploaded, saved straight away
export function ShareWithTeam({ analysisId }) {
  const [on, setOn] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const real = Boolean(analysisId) && analysisId !== "dev-test"

  useEffect(() => { if (real) getTeamReview(analysisId).then(setOn).catch(() => setOn(null)) }, [analysisId, real])
  if (!real || on === null) return null

  const change = async (next) => {
    setSaving(true); setError("")
    try { setOn(await setTeamReview(analysisId, next)) } catch { setError("We couldn't save that. Please try again.") } finally { setSaving(false) }
  }
  return (
    <div style={{ margin: "0 16px 16px" }}>
      <TeamShareSwitch checked={on} disabled={saving} onChange={change} note={on ? "Shared with our team. Turn it off any time and they can no longer open it." : undefined} />
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12, color: "#DC2626", margin: "6px 0 0" }}>{error}</p>}
    </div>
  )
}
