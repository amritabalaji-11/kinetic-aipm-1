import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, GraduationCap, Play, Eye, Smartphone, Sun } from "lucide-react"
import ShareChoice from "../components/ShareChoice"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { DEMO_USERS, useUser } from "../context/UserContext"
import { saveAboutYou } from "../services/authService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const STEPS = 4

const GROUPS = [
  { key: "experience", label: "How long have you trained?", options: [["new", "New"], ["1-2", "1–2 years"], ["3+", "3+ years"]] },
  { key: "goal", label: "Main goal", options: [["strength", "Strength"], ["muscle", "Muscle"], ["active", "Stay active"]] },
  { key: "age_range", label: "Age range", options: [["18-29", "18–29"], ["30-39", "30–39"], ["40+", "40+"]] },
]

const chip = (on) => ({ padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })
const nextButton = { width: "100%", height: 54, borderRadius: 16, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, cursor: "pointer" }

function Point({ icon, title, text }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
      <span style={{ width: 38, height: 38, borderRadius: 19, background: GRADIENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.4, color: INK }}><b>{title}</b><br /><span style={{ color: GRAY }}>{text}</span></span>
    </div>
  )
}

// Shown once, right after a first sign-in: how Kinetic works, an optional "about you", how to get a good form check, and the one question about
// sharing videos. Someone who has already answered that question (or a demo account) goes straight on to Home.
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { activeUser, activeUserId, chooseSharing } = useUser()
  const [step, setStep] = useState(1)
  const [about, setAbout] = useState({})
  const loading = Boolean(activeUserId) && !activeUser  // signed in, profile still loading: wait, do not decide yet
  const done = !loading && (!activeUser || DEMO_USERS[activeUser.id] || activeUser.shareVideos !== null)

  useEffect(() => { if (done) navigate("/home", { replace: true }) }, [done, navigate])
  if (loading || done) return null

  const saveAbout = () => { if (Object.keys(about).length) saveAboutYou(about).catch(() => {}); setStep(3) } // optional: a failed save never blocks anyone
  const firstName = (activeUser?.name || "").split(" ")[0]

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "28px 24px 40px" }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} style={{ display: "flex", gap: 5, marginBottom: 26 }}>
          {Array.from({ length: STEPS }, (_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? PURPLE : "#D4D0EA" }} />)}
        </div>
        <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 11.5, color: GRAY, marginBottom: 4 }}>STEP {step} OF {STEPS}</div>

        {step === 1 && (
          <>
            <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 6px" }}>{firstName ? `Hi ${firstName}, welcome` : "Welcome"}</h1>
            <p style={{ fontFamily: DM_SANS, fontSize: 15, color: "#334155", margin: "0 0 14px" }}>Here is what Kinetic does for you:</p>
            <Point icon={<ClipboardList size={18} />} title="Plan and log your workouts" text="Pick a plan or build your own." />
            <Point icon={<Play size={18} />} title="Check your form" text="Film a set and get feedback on your technique." />
            <Point icon={<GraduationCap size={18} />} title="Learn each exercise" text="Short videos and three cues." />
            <button type="button" onClick={() => setStep(2)} style={{ ...nextButton, marginTop: 14 }}>Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 6px" }}>A little about you</h1>
            <p style={{ fontFamily: DM_SANS, fontSize: 15, color: "#334155", margin: "0 0 12px" }}>Helps us tailor tips. Skip anything you like.</p>
            {GROUPS.map((g) => (
              <div key={g.key} role="radiogroup" aria-label={g.label} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 12, color: GRAY, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>{g.label}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g.options.map(([value, label]) => (
                    <button key={value} type="button" role="radio" aria-checked={about[g.key] === value} style={chip(about[g.key] === value)}
                      onClick={() => setAbout((a) => { const next = { ...a }; if (next[g.key] === value) delete next[g.key]; else next[g.key] = value; return next })}>{label}</button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={saveAbout} style={nextButton}>Next</button>
            <button type="button" onClick={() => setStep(3)} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: GRAY, textDecoration: "underline", fontFamily: DM_SANS, fontSize: 13.5, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 6px" }}>Getting a good form check</h1>
            <p style={{ fontFamily: DM_SANS, fontSize: 15, color: "#334155", margin: "0 0 14px" }}>We can check goblet squats today, and more exercises are on the way.</p>
            <Point icon={<Eye size={18} />} title="Film from the side" text="Head to toe, so we can see your whole body." />
            <Point icon={<Sun size={18} />} title="Good light" text="So the camera can see you clearly." />
            <Point icon={<Smartphone size={18} />} title="Keep the phone still" text="Prop it up rather than holding it." />
            <button type="button" onClick={() => setStep(4)} style={{ ...nextButton, marginTop: 14 }}>Next</button>
          </>
        )}

        {step === 4 && <ShareChoice onChoose={async (share) => { await chooseSharing(share); navigate("/home", { replace: true }) }} />}
      </div>
    </div>
  )
}
