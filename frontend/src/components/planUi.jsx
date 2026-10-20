import { X } from "lucide-react"

// Small building blocks shared by the planner, swap sheet and builder screens.
export const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
export const BRICOLAGE = "'Bricolage Grotesque'"
export const DM_SANS = "'DM Sans'"
export const PURPLE = "#8133FF"
export const GRAY = "#64748B"
export const INK = "#0F172A"

export const cardStyle = {
  border: "1px solid transparent",
  borderRadius: 12,
  background: "linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(135deg, rgba(2,132,199,0.5), rgba(151,71,255,0.5)) border-box",
  boxShadow: "0px 4px 14px rgba(0, 0, 0, 0.05)",
  padding: "6px 14px",
}

export function SectionHeading({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 10px" }}>
      <span style={{ width: 4, height: 18, borderRadius: 2, background: GRADIENT }} />
      <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK, flex: 1 }}>{title}</span>
      {right && <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{right}</span>}
    </div>
  )
}

// Purple box with white text, e.g. SUPERSET 1
export function BlockTag({ children }) {
  return (
    <span style={{ padding: "4px 8px", borderRadius: 6, background: PURPLE, color: "#FFFFFF", fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  )
}

export function PurpleDivider() {
  return <div style={{ height: 2, borderRadius: 1, background: "rgba(129,51,255,0.5)", margin: "4px 0" }} />
}

export function RoundButton({ label, onClick, tone = "purple", size = 30, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: size / 2, flexShrink: 0, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: tone === "purple" ? "rgba(129,51,255,0.1)" : "rgba(100,116,139,0.1)",
      }}
    >
      {children}
    </button>
  )
}

export function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "7px 14px", borderRadius: 32, cursor: "pointer", fontFamily: DM_SANS, fontSize: 13,
        fontWeight: active ? 600 : 400, color: active ? "#FFFFFF" : INK,
        background: active ? GRADIENT : "transparent", border: active ? "1px solid transparent" : "1px solid #D3D3D3",
      }}
    >
      {label}
    </button>
  )
}

export function GradientButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: 16, borderRadius: 12, border: "none", color: "#FFFFFF",
        fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 16,
        background: disabled ? "#DBDBDB" : GRADIENT, cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  )
}

export function ChipRow({ children }) {
  return <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>{children}</div>
}

export function FilterLabel({ children }) {
  return <p style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 600, color: GRAY, margin: "12px 0 6px" }}>{children}</p>
}

// Slides up from the bottom over a dimmed screen
export function BottomSheet({ title, onClose, children, footer }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)" }} />
      <div
        role="dialog"
        aria-label={title}
        style={{
          position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: "100%", maxWidth: 430,
          maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#F4F2FA", borderRadius: "24px 24px 0 0",
        }}
      >
        <div style={{ padding: "10px 20px 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(100,116,139,0.4)", margin: "0 auto 10px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 22, color: INK, margin: 0 }}>{title}</h2>
            <RoundButton label="Close" tone="gray" onClick={onClose}><X size={14} color={GRAY} /></RoundButton>
          </div>
        </div>
        <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "8px 20px 20px" }}>{footer}</div>}
      </div>
    </div>
  )
}

// Purple bold name, small grey line underneath. `right` holds buttons or a tick.
export function ExerciseLine({ name, sub, right, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: muted ? GRAY : PURPLE }}>{name}</div>
        {sub && <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}
