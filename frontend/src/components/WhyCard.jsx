import { DM_SANS, GRAY, INK } from "./planUi"

// The explanation that opens under an exercise: peach, lavender and mint like the onboarding screens, with weight, rest and progress in three rows.
export default function WhyCard({ why }) {
  const row = (label, value) => (
    <div style={{ display: "flex", gap: 8, fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.7)" }}>
      <span style={{ width: 84, flexShrink: 0, color: GRAY, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", paddingTop: 1 }}>{label}</span>
      <span style={{ color: INK }}>{value}</span>
    </div>
  )
  return (
    <div role="region" aria-label={why.title} style={{ margin: "6px 0 10px", padding: "9px 12px", borderRadius: 12, fontFamily: DM_SANS, fontSize: 12.5, lineHeight: 1.45, color: INK, background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 48%, #D6F5EA 100%)", border: "1px solid rgba(129,51,255,0.18)" }}>
      <b style={{ color: "#4C1D95" }}>{why.title}</b> {why.text}
      {row("Weight", why.weight)}
      {row("Rest", why.rest)}
      {row("To progress", why.progress)}
    </div>
  )
}
