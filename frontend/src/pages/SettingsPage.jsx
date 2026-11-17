import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "../components/planUi"
import { DEMO_USERS, useUser, useWeightUnit } from "../context/UserContext"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

// App settings. For now: the unit weights are logged and shown in.
export default function SettingsPage() {
  const navigate = useNavigate()
  const { activeUser, chooseUnit } = useUser()
  const unit = useWeightUnit()
  const [error, setError] = useState("")
  const isDemo = !!(activeUser && DEMO_USERS[activeUser.id])

  const pick = (u) => { if (u === unit) return; setError(""); chooseUnit(u).catch(() => setError("We couldn't save that. Please try again.")) }
  const label = { fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.12em", margin: "16px 4px 6px" }

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 20px 120px", maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Profile
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "10px 0 0" }}>Settings</h1>

      <div style={label}>UNITS</div>
      <div style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", border: "1px solid #F1F1F6" }}>
        <b style={{ display: "block", fontFamily: DM_SANS, fontSize: 14, color: INK, marginBottom: 8 }}>Weight units</b>
        <div role="radiogroup" aria-label="Weight units" style={{ display: "flex", background: "#E4E1F7", borderRadius: 999, padding: 3 }}>
          {[["kg", "Kilograms (kg)"], ["lbs", "Pounds (lbs)"]].map(([value, text]) => (
            <button key={value} type="button" role="radio" aria-checked={unit === value} disabled={isDemo} onClick={() => pick(value)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 999, border: "none", cursor: isDemo ? "default" : "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, background: unit === value ? "#fff" : "transparent", color: unit === value ? PURPLE : "#64748B", boxShadow: unit === value ? "0 1px 4px rgba(129,51,255,0.2)" : "none" }}>
              {text}
            </button>
          ))}
        </div>
        <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "8px 0 0", lineHeight: 1.4 }}>
          {isDemo ? "Demo accounts use the default for your phone's region." : "Used when you log sets, upload a video and see your history. Past workouts keep the unit you logged them in."}
        </p>
        {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12.5, color: "#DC2626", margin: "6px 0 0" }}>{error}</p>}
      </div>
    </div>
  )
}
