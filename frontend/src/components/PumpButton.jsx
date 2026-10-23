// The big gradient call-to-action buttons for starting a workout. On tap the button "pumps" (a quick squeeze-and-swell with a
// glow ring, and a flexing arm), then calls onPumped. People who prefer less motion skip straight to onPumped.
import { useRef, useState } from "react"
import { BicepsFlexed } from "lucide-react"
import { BRICOLAGE, GRADIENT } from "./planUi"

const PUMP_MS = 750
const prefersStill = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export default function PumpButton({ children, onPumped, disabled = false, big = false }) {
  const [pumping, setPumping] = useState(false)
  const timer = useRef(null)

  const press = () => {
    if (disabled || pumping) return
    if (prefersStill()) return onPumped()
    setPumping(true)
    timer.current = setTimeout(() => { setPumping(false); onPumped() }, PUMP_MS)
  }

  return (
    <button
      type="button"
      onClick={press}
      disabled={disabled}
      className={pumping ? "pump-btn-pumping" : ""}
      style={{
        width: "100%", padding: big ? "22px 16px" : 16, borderRadius: big ? 18 : 12, border: "none", color: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontFamily: BRICOLAGE, fontWeight: big ? 800 : 600, fontSize: big ? 21 : 16, letterSpacing: big ? 0.8 : 0,
        background: disabled ? "#DBDBDB" : GRADIENT, cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0px 10px 24px rgba(129, 51, 255, 0.28)",
      }}
    >
      {!disabled && <BicepsFlexed size={big ? 26 : 22} strokeWidth={2.4} className={pumping ? "flex-arm-once" : ""} />}
      {children}
    </button>
  )
}
