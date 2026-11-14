import { Play } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK } from "./planUi"

// A guide as a small poster: a dark gradient with a play mark, the name and the movement. Used in Home's row and on the guides page.
export default function GuidePoster({ name, caption, onOpen, width = 128 }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`${name}: how to do it`} style={{ width, flexShrink: 0, height: "100%", textAlign: "left", padding: 0, background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(129,51,255,0.25)", cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 86, background: "linear-gradient(135deg, #0F172A 0%, #312E81 55%, #6D28D9 100%)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Play size={15} color="#4C1D95" fill="#4C1D95" style={{ marginLeft: 2 }} />
        </span>
      </span>
      <span style={{ display: "block", padding: "8px 9px 9px" }}>
        <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 13, color: INK, lineHeight: 1.2 }}>{name}</span>
        <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 11, color: GRAY, marginTop: 2 }}>{caption}</span>
      </span>
    </button>
  )
}
