import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "../components/planUi"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

export const CONTACT_EMAIL = "amrita.balaji@gmail.com"

// The plain page used for the Terms and the Privacy policy. Reachable without signing in (the sign-in screen links to both).
export default function LegalPage({ title, updated, sections }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 20px 80px", maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "10px 0 2px" }}>{title}</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, margin: "0 0 18px" }}>Last updated {updated}</p>
      {sections.map((s) => (
        <section key={s.heading} style={{ marginBottom: 18 }}>
          <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, margin: "0 0 6px" }}>{s.heading}</h2>
          {s.body.map((p, i) => Array.isArray(p)
            ? <ul key={i} style={{ margin: "0 0 8px", paddingLeft: 20, fontFamily: DM_SANS, fontSize: 14.5, lineHeight: 1.55, color: "#1E293B" }}>{p.map((li) => <li key={li} style={{ marginBottom: 4 }}>{li}</li>)}</ul>
            : <p key={i} style={{ fontFamily: DM_SANS, fontSize: 14.5, lineHeight: 1.55, color: "#1E293B", margin: "0 0 8px" }}>{p}</p>)}
        </section>
      ))}
    </div>
  )
}
