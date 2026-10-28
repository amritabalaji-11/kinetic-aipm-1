import { useState } from "react"
import { Check } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"

// Six quick filming checks, each with its reason, and a tick box: "I've got the tips".
// Ticking folds the card to a single green line (remembered on this phone); "View" opens it again.
// `nudge` goes up each time Start is pressed without the box ticked: the card shakes and says so.
const TIPS = [
  { bold: "Side view", why: "so we can see your back, hip and knee angles" },
  { bold: "Head to toe", why: "fill ~70% of the screen, so nothing gets cut off" },
  { bold: "Portrait view, hip height", why: "so your body stays big and your depth looks true" },
  { bold: "Just you", why: "we can only track one person: no mirrors, no one else" },
  { bold: "Only the reps", why: "5–10 reps. Less to upload, faster results" },
  { bold: "Fitted clothes", why: "Baggy can hide your joints" },
]
const GREEN = "#22C55E"

export default function FilmingTips({ checked, onCheck, nudge = 0 }) {
  const [viewing, setViewing] = useState(false) // reopened from the folded line

  if (checked && !viewing) {
    return (
      <div id="filming-tips" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 16, borderRadius: 16, background: "#FFFFFF", border: `1.5px solid ${GREEN}` }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={13} color="#FFFFFF" strokeWidth={3.2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 14, fontWeight: 700, color: INK }}>Tips checked</span>
          <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 11, color: GRAY }}>Side view · head to toe · just you</span>
        </span>
        <button type="button" onClick={() => setViewing(true)} style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, background: "none", border: "none", cursor: "pointer" }}>View</button>
      </div>
    )
  }

  const skipped = nudge > 0 && !checked
  function toggle() {
    if (!checked) onCheck()
    setViewing(false) // ticking (or un-viewing) folds the card
  }

  return (
    <div
      id="filming-tips"
      key={`tips-${nudge}`}
      className={skipped ? "tips-shake" : undefined}
      style={{ background: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 16, border: skipped ? "1.5px solid #DC2626" : "1px solid #F3F4F6", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: skipped ? 8 : 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, margin: 0 }}>Ready to film?</p>
          <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: 0 }}>{checked ? "Six quick checks" : "Read these, then tick the box"}</p>
        </div>
        <button type="button" role="checkbox" aria-checked={checked} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px 6px 10px", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ fontFamily: DM_SANS, fontSize: 12.5, fontWeight: 700, color: checked ? GREEN : PURPLE }}>I&apos;ve got the tips</span>
          <span className={checked ? undefined : "tips-box-pulse"} style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: checked ? GREEN : "#FFFFFF", border: checked ? "none" : `2px solid ${PURPLE}` }}>
            {checked && <Check size={16} color="#FFFFFF" strokeWidth={3.4} />}
          </span>
        </button>
      </div>
      {skipped && (
        <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12.5, fontWeight: 600, color: "#DC2626", margin: "0 0 10px" }}>
          Tick “I&apos;ve got the tips” before you start.
        </p>
      )}
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
