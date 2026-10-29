import { useEffect, useState } from "react"
import { Play, Square } from "lucide-react"
import { beep, unlockAudio } from "../utils/beep"

const PURPLE = "#8133FF"
const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
const DM_SANS = "'DM Sans', sans-serif"

export const clock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`

// The play / stop button that counts down from `target` seconds. When it reaches zero (or is stopped) it beeps and calls
// onDone(seconds actually done). Time comes from the clock, so it stays right if the phone looks away for a moment.
// `children` is shown while idle (the target, or a box to type the seconds into); a running timer shows the countdown instead.
export default function SetTimer({ target, onDone, children, label, disabled = false, height = 28 }) {
  const [endsAt, setEndsAt] = useState(null)
  const [, tick] = useState(0)
  const running = endsAt !== null

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [running])

  const left = running ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : target

  useEffect(() => {
    if (running && left === 0) {
      setEndsAt(null)
      beep()
      onDone(target)
    }
  })

  const start = () => { unlockAudio(); setEndsAt(Date.now() + target * 1000) }
  const stop = () => { setEndsAt(null); onDone(Math.max(1, target - left)) }

  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, height, borderRadius: height / 2, padding: `0 ${height > 30 ? 4 : 2}px 0 ${height > 30 ? 14 : 10}px`, gap: 6, background: running ? "rgba(129,51,255,0.1)" : "rgba(255,255,255,0.9)", border: `1.2px solid ${running ? PURPLE : "rgba(100,116,139,0.2)"}` }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", fontFamily: DM_SANS, fontWeight: 600, fontSize: height > 30 ? 18 : 14, color: running ? PURPLE : "inherit" }}>
        {running ? <span role="timer" aria-live="off">{clock(left)}</span> : children}
      </div>
      <button
        type="button"
        onClick={running ? stop : start}
        disabled={disabled && !running}
        aria-label={running ? `Stop ${label || "timer"}` : `Start ${label || "timer"} for ${clock(target)}`}
        style={{ width: height - 8, height: height - 8, borderRadius: (height - 8) / 2, border: "none", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: running ? "#EF4444" : GRADIENT }}
      >
        {running ? <Square size={height > 30 ? 14 : 10} color="#fff" fill="#fff" /> : <Play size={height > 30 ? 16 : 11} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />}
      </button>
    </div>
  )
}
