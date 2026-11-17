import { useNavigate } from "react-router-dom"
import { ChevronLeft, MessageSquareHeart } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

// There is nothing to buy yet: Kinetic is open to a small group of beta testers, free of charge, to help shape the roadmap.
export default function SubscriptionPage() {
  const navigate = useNavigate()
  const point = (text) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "8px 0", fontFamily: DM_SANS, fontSize: 14.5, lineHeight: 1.5, color: "#1E293B" }}>
      <span style={{ width: 20, height: 20, borderRadius: 10, background: "rgba(129,51,255,0.12)", color: PURPLE, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>✓</span>
      <span>{text}</span>
    </div>
  )
  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 20px 120px", maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "10px 0 14px" }}>Subscription</h1>

      <div style={{ background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)", borderRadius: 18, padding: "18px 18px 20px", border: "1px solid rgba(129,51,255,0.18)" }}>
        <span style={{ display: "inline-block", background: PURPLE, color: "#fff", borderRadius: 8, fontFamily: DM_SANS, fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", padding: "3px 9px" }}>BETA</span>
        <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: INK, margin: "10px 0 8px" }}>You&apos;re in the beta, and it&apos;s free</h2>
        <p style={{ fontFamily: DM_SANS, fontSize: 14.5, lineHeight: 1.5, color: "#1E293B", margin: 0 }}>
          Kinetic is open to a small group of beta testers, free of charge, to help shape the product roadmap. There&apos;s nothing to buy and nothing to set up.
        </p>
      </div>

      <h3 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, margin: "22px 0 4px" }}>What that means for you</h3>
      {point("Everything in the app is free while we build it with you.")}
      {point("Your feedback decides what we build next. Tell us what works, what doesn't and what you'd like to see.")}

      <button type="button" onClick={() => navigate("/feedback", { state: { from: "/profile/subscription" } })}
        style={{ width: "100%", height: 54, marginTop: 22, borderRadius: 16, border: "none", cursor: "pointer", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <MessageSquareHeart size={19} /> Tell us what you think
      </button>
      <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, textAlign: "center", margin: "10px 0 0" }}>It takes a minute, and you can add a photo or a short video.</p>
    </div>
  )
}
