import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, INK, PURPLE } from "../components/planUi"
import { LegalBody } from "./LegalPage"
import { PRIVACY } from "./PrivacyPage"
import { TERMS } from "./TermsPage"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const TABS = [["privacy", "Privacy", PRIVACY], ["terms", "Terms", TERMS]]

// One place for both documents, reached from Profile. The separate /privacy and /terms pages stay for the links on the sign-in screen.
export default function PrivacyTermsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get("tab") === "terms" ? "terms" : "privacy"))
  const doc = TABS.find(([id]) => id === tab)[2]
  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 20px 100px", maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "10px 0 12px" }}>Privacy &amp; Terms</h1>
      <div role="tablist" aria-label="Privacy and Terms" style={{ display: "flex", background: "#E4E1F7", borderRadius: 999, padding: 4, marginBottom: 16 }}>
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: "9px 6px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 13.5, background: tab === id ? "#fff" : "transparent", color: tab === id ? PURPLE : "#64748B", boxShadow: tab === id ? "0 1px 4px rgba(129,51,255,0.2)" : "none" }}>
            {label}
          </button>
        ))}
      </div>
      <LegalBody updated={doc.updated} sections={doc.sections} />
    </div>
  )
}
