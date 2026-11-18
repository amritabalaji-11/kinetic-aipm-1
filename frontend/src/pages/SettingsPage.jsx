import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "../components/planUi"
import { DEMO_USERS, useUser, useWeightUnit } from "../context/UserContext"
import TeamShareSwitch from "../components/TeamShareSwitch"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

// The timer sound is kept on this phone (the section timers read the same key)
const SOUND_KEY = "timerSound"
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== "off" } catch { return true } }

// App settings: the weight unit, who can watch your videos, and the timer sounds.
export default function SettingsPage() {
  const navigate = useNavigate()
  const { activeUser, chooseUnit, chooseSharing } = useUser()
  const unit = useWeightUnit()
  const [error, setError] = useState("")
  const [sharingError, setSharingError] = useState("")
  const [sound, setSound] = useState(readSound)
  const toggleSound = (on) => { setSound(on); try { localStorage.setItem(SOUND_KEY, on ? "on" : "off") } catch { /* private mode: it just is not remembered */ } }
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

      {!isDemo && (
        <>
          <div style={label}>PRIVACY</div>
          <TeamShareSwitch
            label="Let the Kinetic team watch my videos to improve the feedback"
            checked={activeUser?.shareVideos === true}
            onChange={(v) => { setSharingError(""); chooseSharing(v).catch(() => setSharingError("We couldn't save that. Please try again.")) }}
            note={activeUser?.shareVideos === null
              ? "You haven't chosen yet. Turn it on to let our team watch your videos. Each upload still has its own switch."
              : activeUser?.shareVideos
                ? "On for new uploads. Each upload has its own switch, and you can turn off any video you shared from its results screen."
                : "Off. Your videos stay private. You can turn it on for a single upload."}
          />
          {sharingError && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12.5, color: "#DC2626", margin: "6px 4px 0" }}>{sharingError}</p>}
        </>
      )}

      <div style={label}>TIMERS</div>
      <label style={{ display: "flex", gap: 12, alignItems: "center", background: "#fff", borderRadius: 14, padding: "12px 14px", border: "1px solid #F1F1F6", cursor: "pointer" }}>
        <input type="checkbox" role="switch" checked={sound} onChange={(e) => toggleSound(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
        <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, background: sound ? PURPLE : "#CBD5E1", position: "relative", flexShrink: 0, transition: "background .15s" }}>
          <span style={{ position: "absolute", top: 3, left: sound ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left .15s" }} />
        </span>
        <span style={{ fontFamily: DM_SANS, fontSize: 14, color: INK }}><b>Timer sounds</b>
          <span style={{ display: "block", fontSize: 12.5, color: GRAY, marginTop: 1 }}>Beeps and spoken cues when work and rest change in timed sections. Kept on this phone.</span>
        </span>
      </label>
    </div>
  )
}
