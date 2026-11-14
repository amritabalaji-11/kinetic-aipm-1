import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, MessageCircle } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"
import { DEMO_USERS, useUser } from "../context/UserContext"
import { myFeedbackCount } from "../services/feedbackService"

// A card on Home inviting feedback. It goes away for good once the person has sent some (and never shows for demo accounts).
export default function FeedbackCard() {
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const [sent, setSent] = useState(null)
  const real = Boolean(activeUser) && !DEMO_USERS[activeUser.id]

  useEffect(() => { if (real) myFeedbackCount().then(setSent) }, [real])
  if (!real || sent === null || sent > 0) return null

  return (
    <button type="button" onClick={() => navigate("/feedback", { state: { from: "/home" } })}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "#fff", borderRadius: 14, padding: 14, marginBottom: 20, cursor: "pointer", border: "1.5px solid rgba(129,51,255,0.35)" }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, background: GRADIENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageCircle size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: INK }}>Help shape Kinetic</span>
        <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 13, color: GRAY, lineHeight: 1.35 }}>Tell us what works and what doesn’t. Photos and videos welcome.</span>
      </span>
      <ChevronRight size={22} color={PURPLE} />
    </button>
  )
}
