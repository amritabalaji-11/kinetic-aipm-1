import { useState } from "react"
import { Link } from "react-router-dom"
import { Info } from "lucide-react"
import { BRICOLAGE, BottomSheet, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"
import { CREATOR_NOTE } from "../data/legalText"

// A small "About these videos" link that opens the note about other creators' videos
export default function CreatorNoteLink() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 11.5 }}>
        <Info size={12} /> {CREATOR_NOTE.title}
      </button>
      {open && (
        <BottomSheet title={CREATOR_NOTE.title} onClose={() => setOpen(false)}
          footer={<button type="button" onClick={() => setOpen(false)} style={{ width: "100%", height: 48, borderRadius: 14, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Got it</button>}>
          {CREATOR_NOTE.paragraphs.map((p) => <p key={p} style={{ fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.5, color: INK, margin: "0 0 10px" }}>{p}</p>)}
          <p style={{ fontFamily: DM_SANS, fontSize: 13, lineHeight: 1.5, color: GRAY, margin: 0 }}>{CREATOR_NOTE.takedown} <Link to="/terms" style={{ color: PURPLE, fontWeight: 600 }}>Full terms ›</Link></p>
        </BottomSheet>
      )}
    </>
  )
}
