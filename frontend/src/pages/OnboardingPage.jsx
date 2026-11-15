import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, GraduationCap, Play, Eye, ShieldCheck, Smartphone, Sun } from "lucide-react"
import ShareChoice from "../components/ShareChoice"
import SquatFigure from "../components/SquatFigure"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { DEMO_USERS, useUser } from "../context/UserContext"
import { saveAboutYou } from "../services/authService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const STEPS = 4

// One question each. `multi` ones can have several answers. Every answer is optional.
const QUESTIONS = [
  { key: "experience", label: "How long have you been training?", options: [["new", "Just starting"], ["1-2", "1–2 years"], ["3+", "3+ years"]] },
  { key: "training_types", multi: true, label: "What do you mostly do to train? Pick any.", options: [["cardio", "Cardio"], ["strength", "Strength training"], ["yoga_pilates", "Yoga / Pilates"], ["group_classes", "Group classes"]] },
  { key: "age_range", label: "Age range", options: [["18-29", "18–29"], ["30-39", "30–39"], ["40+", "40+"]] },
  { key: "gender", label: "Gender", options: [["woman", "Woman"], ["man", "Man"], ["non_binary", "Non-binary"], ["prefer_not_to_say", "Prefer not to say"]] },
]

const chip = (on) => ({ padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })
const nextButton = { width: "100%", height: 54, borderRadius: 16, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, cursor: "pointer" }
const heading = { fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 6px" }
const lead = { fontFamily: DM_SANS, fontSize: 15, color: "#334155", margin: "0 0 14px", lineHeight: 1.45 }

// A line that slides in a moment after the one before it (it just appears when the phone is set to reduce motion)
const FADE_CSS = `@keyframes onbIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes onbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes onbRing{0%{transform:scale(.8);opacity:.5}100%{transform:scale(1.5);opacity:0}}
@media (prefers-reduced-motion: reduce){.onb-in,.onb-pulse,.onb-ring{animation:none!important}}`
const inStyle = (i) => ({ animation: `onbIn .5s ease both`, animationDelay: `${0.12 * i}s` })

function Point({ icon, title, text, i }) {
  return (
    <div className="onb-in" style={{ ...inStyle(i), display: "flex", gap: 12, alignItems: "center", background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
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

  const toggle = (q, value) => setAbout((a) => {
    const next = { ...a }
    if (q.multi) { const list = new Set(next[q.key] ?? []); list.has(value) ? list.delete(value) : list.add(value); if (list.size) next[q.key] = [...list]; else delete next[q.key] }
    else if (next[q.key] === value) delete next[q.key]
    else next[q.key] = value
    return next
  })
  const picked = (q, value) => (q.multi ? (about[q.key] ?? []).includes(value) : about[q.key] === value)
  const saveAbout = () => {
    const body = { ...about }
    if (typeof about.has_injury === "boolean") body.injury_details = about.has_injury ? (about.injury_details ?? "").trim() : null
    if (Object.keys(body).length) saveAboutYou(body).catch(() => {}) // optional: a failed save never blocks anyone
    setStep(3)
  }
  const firstName = (activeUser?.name || "").split(" ")[0]

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "28px 24px 40px" }}>
      <style>{FADE_CSS}</style>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} style={{ display: "flex", gap: 5, marginBottom: 22 }}>
          {Array.from({ length: STEPS }, (_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? PURPLE : "#D4D0EA", transition: "background .3s" }} />)}
        </div>
        <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 11.5, color: GRAY, marginBottom: 4 }}>STEP {step} OF {STEPS}</div>

        {step === 1 && (
          <>
            <div aria-hidden="false" style={{ display: "flex", justifyContent: "center", margin: "4px 0 6px", background: "radial-gradient(circle at 50% 55%, rgba(129,51,255,0.16), rgba(129,51,255,0) 68%)" }}>
              <SquatFigure size={190} />
            </div>
            <h1 className="onb-in" style={{ ...heading, ...inStyle(0) }}>{firstName ? `Hi ${firstName}, welcome` : "Welcome"}</h1>
            <p className="onb-in" style={{ ...lead, ...inStyle(1) }}>Here is what Kinetic does for you:</p>
            <Point i={2} icon={<ClipboardList size={18} />} title="Plan and log your workouts" text="Pick a plan or build your own." />
            <Point i={3} icon={<Play size={18} />} title="Check your form" text="Film a set and get feedback on your technique." />
            <Point i={4} icon={<GraduationCap size={18} />} title="Get cues & tips for each exercise" text="Do’s and don’ts, with short videos." />
            <button type="button" onClick={() => setStep(2)} style={{ ...nextButton, marginTop: 14 }}>Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={heading}>A little about you</h1>
            <p style={lead}>Helps us tailor tips. Skip anything you like.</p>
            {QUESTIONS.map((q) => (
              <div key={q.key} role={q.multi ? "group" : "radiogroup"} aria-label={q.label} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13.5, color: INK, marginBottom: 7 }}>{q.label}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {q.options.map(([value, label]) => (
                    <button key={value} type="button" role={q.multi ? "checkbox" : "radio"} aria-checked={picked(q, value)} style={chip(picked(q, value))} onClick={() => toggle(q, value)}>{label}</button>
                  ))}
                </div>
              </div>
            ))}
            <div role="radiogroup" aria-label="Past injuries or pain" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13.5, color: INK, marginBottom: 7 }}>Do you have any past injuries or pain we should be aware of?</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[[true, "Yes"], [false, "No"]].map(([v, label]) => (
                  <button key={label} type="button" role="radio" aria-checked={about.has_injury === v} style={chip(about.has_injury === v)}
                    onClick={() => setAbout((a) => { const next = { ...a }; if (next.has_injury === v) { delete next.has_injury; delete next.injury_details } else next.has_injury = v; return next })}>{label}</button>
                ))}
              </div>
              {about.has_injury === true && (
                <>
                  <textarea value={about.injury_details ?? ""} onChange={(e) => setAbout((a) => ({ ...a, injury_details: e.target.value.slice(0, 1000) }))} rows={3} aria-label="Tell us about it"
                    placeholder="For example: left knee, a sprain in 2023. Only what you are comfortable sharing."
                    style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(129,51,255,0.3)", background: "#fff", fontFamily: DM_SANS, fontSize: 14, outline: "none", resize: "none" }} />
                  <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "6px 0 0", lineHeight: 1.4 }}>Only you can see this. It never appears on the pages our team uses to look at how Kinetic is used.</p>
                </>
              )}
            </div>
            <button type="button" onClick={saveAbout} style={nextButton}>Next</button>
            <button type="button" onClick={() => setStep(3)} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: GRAY, textDecoration: "underline", fontFamily: DM_SANS, fontSize: 13.5, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={heading}>Getting a good form check</h1>
            <p style={lead}>We can check goblet squats today, and more exercises are on the way.</p>
            <div style={{ position: "relative", borderRadius: 18, background: "linear-gradient(135deg, #0F172A 0%, #312E81 60%, #6D28D9 100%)", padding: "14px 0 8px", marginBottom: 14, display: "flex", justifyContent: "center" }}>
              <SquatFigure skeleton size={190} />
              <span style={{ position: "absolute", left: 12, bottom: 10, fontFamily: DM_SANS, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>This is how Kinetic sees your joints</span>
            </div>
            <Point i={0} icon={<Eye size={18} />} title="Film from the side" text="Head to toe, so we can see your whole body." />
            <Point i={1} icon={<Sun size={18} />} title="Good light" text="So the camera can see you clearly." />
            <Point i={2} icon={<Smartphone size={18} />} title="Keep the phone still" text="Prop it up rather than holding it." />
            <button type="button" onClick={() => setStep(4)} style={{ ...nextButton, marginTop: 14 }}>Next</button>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ position: "relative", width: 84, height: 84, margin: "6px auto 14px" }} aria-hidden="true">
              <span className="onb-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${PURPLE}`, animation: "onbRing 2.4s ease-out infinite" }} />
              <span className="onb-pulse" style={{ position: "absolute", inset: 8, borderRadius: "50%", background: GRADIENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", animation: "onbPulse 2.4s ease-in-out infinite" }}><ShieldCheck size={34} /></span>
            </div>
            <ShareChoice onChoose={async (share) => { await chooseSharing(share); navigate("/home", { replace: true }) }} />
          </>
        )}
      </div>
    </div>
  )
}
