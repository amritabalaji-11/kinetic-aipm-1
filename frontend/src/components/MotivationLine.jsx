import { useState } from "react"
import { Pencil } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "./planUi"

const MAX = 80

// The line under a person's name on Profile: their favourite motivational line. Tap it to write or change it.
// `onSave` is missing for demo accounts, which just show their line.
export default function MotivationLine({ line, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const open = () => { setDraft(line || ""); setError(""); setEditing(true) }
  const save = async () => {
    setBusy(true); setError("")
    try { await onSave(draft); setEditing(false) } catch (e) { setError(e.message || "We couldn't save that. Please try again.") } finally { setBusy(false) }
  }

  if (editing) {
    return (
      <div style={{ width: "100%", maxWidth: 320, margin: "2px auto 0" }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, MAX))} maxLength={MAX} autoFocus aria-label="Your favourite motivational line" placeholder="e.g. Show up. Lift. Repeat."
          onKeyDown={(e) => { if (e.key === "Enter" && !busy) save(); if (e.key === "Escape") setEditing(false) }}
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid rgba(129,51,255,0.45)", borderRadius: 12, padding: "10px 12px", fontFamily: DM_SANS, fontSize: 14, color: INK, outline: "none", textAlign: "center", background: "#fff" }} />
        <div style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, textAlign: "right", margin: "3px 4px 0" }}>{draft.length}/{MAX}</div>
        {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 12, color: "#DC2626", margin: "2px 0 0", textAlign: "center" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={() => setEditing(false)} disabled={busy} style={{ flex: 1, height: 40, borderRadius: 12, cursor: "pointer", background: "transparent", border: "1.2px solid rgba(129,51,255,0.5)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 14 }}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} style={{ flex: 1, height: 40, borderRadius: 12, cursor: "pointer", border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 14, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    )
  }

  if (!onSave) return line ? <p className="text-sm text-gray-500 text-center">{line}</p> : null
  return (
    <button type="button" onClick={open} aria-label={line ? "Change your motivational line" : "Add your favourite motivational line"}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "2px 6px", cursor: "pointer", fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.35, textAlign: "center", color: line ? "#6B7280" : PURPLE, fontWeight: line ? 400 : 600, fontStyle: line ? "italic" : "normal" }}>
      <span>{line ? `“${line}”` : "Add your favourite motivational line"}</span>
      <Pencil size={13} color={PURPLE} style={{ flexShrink: 0 }} />
    </button>
  )
}
