import { useState, useEffect } from "react"

// Floating countdown shown after a set is saved. The parent owns `endsAt` (a timestamp)
// so the timer survives re-renders; this component only ticks and displays.
export default function RestTimer({ endsAt, onAdd, onSkip }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const done = left === 0
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`

  const pill = {
    border: "none", borderRadius: "999px", padding: "6px 12px", cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans'",
    background: "rgba(255,255,255,0.2)", color: "#FFFFFF",
  }

  return (
    <div style={{
      position: "fixed", bottom: "210px", left: 0, right: 0, display: "flex",
      justifyContent: "center", padding: "0 24px", zIndex: 500,
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", padding: "10px 14px", borderRadius: "12px",
        background: done ? "#2ECD70" : "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)",
        color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 600 }}>
          {done ? "Rest over — next set!" : `Rest ${mmss}`}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {!done && <button style={pill} onClick={() => onAdd(15)}>+15s</button>}
          <button style={pill} onClick={onSkip}>{done ? "Dismiss" : "Skip"}</button>
        </div>
      </div>
    </div>
  )
}
