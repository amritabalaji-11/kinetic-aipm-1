import { useState } from "react"
import { Check } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"
import { hasSeenTips, markTipsSeen } from "../utils/uploadHelp"

// Six quick filming checks, each with its reason. One tap on "I've got the tips" folds the card to a single green line
// (remembered on this phone); "View" opens it again. Nothing here blocks the upload.
const TIPS = [
  { bold: "Side view", why: "so we can see your back, hip and knee angles" },
  { bold: "Head to toe", why: "fill ~70% of the screen, so nothing gets cut off" },
  { bold: "Portrait view, hip height", why: "so your body stays big and your depth looks true" },
  { bold: "Just you", why: "we can only track one person: no mirrors, no one else" },
  { bold: "Only the reps", why: "5–10 reps. Less to upload, faster results" },
  { bold: "Fitted clothes", why: "Baggy can hide your joints" },
]
const GREEN = "#22C55E"

export default function FilmingTips() {
  const [open, setOpen] = useState(() => !hasSeenTips())

  function gotIt() {
    markTipsSeen()
    setOpen(false)
  }

  if (!open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 16, borderRadius: 16, background: "#FFFFFF", border: `1.5px solid ${GREEN}` }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={13} color="#FFFFFF" strokeWidth={3.2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 14, fontWeight: 700, color: INK }}>Tips checked</span>
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 11, color: GRAY }}>Side view · head to toe · just you</span>
        </span>
        <button type="button" onClick={() => setOpen(true)} style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, background: "none", border: "none", cursor: "pointer" }}>View</button>
      </div>
    )
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, margin: 0 }}>Ready to film?</p>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: 0 }}>Six quick checks</p>
        </div>
        <button type="button" onClick={gotIt} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: GRADIENT, color: "#FFFFFF", fontFamily: DM_SANS, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, border: "1.5px solid #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
          </span>
          I&apos;ve got the tips
        </button>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {TIPS.map((t) => (
          <li key={t.bold} style={{ display: "flex", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: GRADIENT, marginTop: 6, flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 13.5, fontWeight: 700, color: INK }}>{t.bold}</span>
              <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY, lineHeight: "16px" }}>{t.why}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
