// Between choosing a workout and doing it: a moment to commit, jot a note for the session, and press START WORKOUT.
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BicepsFlexed, ChevronLeft, Flame, Sparkles } from "lucide-react"
import PumpButton from "../components/PumpButton"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { beginWorkout, readDraftWorkout } from "../utils/startWorkout"
import { isActionable } from "../utils/workoutModel"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { listWorkouts, pendingAsRows } from "../services/workoutService"
import { consistencyMessage } from "../utils/consistency"

export default function WorkoutCommitPage() {
  const navigate = useNavigate()
  const [draft] = useState(readDraftWorkout)
  const [notes, setNotes] = useState("")
  const [message, setMessage] = useState(null) // personal line based on your recent workouts; nothing until we know

  useEffect(() => {
    let cancelled = false
    listWorkouts()
      .then((rows) => !cancelled && setMessage(consistencyMessage([...rows, ...pendingAsRows()], true)))
      .catch(() => !cancelled && setMessage(consistencyMessage(pendingAsRows(), false))) // offline: only what is on this device
    return () => { cancelled = true }
  }, [])

  // Nothing to commit to (a refresh after starting, or a stray address): go back to where you can pick a workout
  useEffect(() => {
    if (!draft) navigate(localStorage.getItem("activeWorkout") ? "/workout/active" : "/plan", { replace: true })
  }, [draft, navigate])
  if (!draft) return null

  const exercises = draft.blocks.flatMap((b) => b.items).filter(isActionable).length

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "20px 20px 140px", display: "flex", flexDirection: "column" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontSize: 14, fontWeight: 600, padding: 0 }}>
        <ChevronLeft size={18} /> Change exercises
      </button>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, paddingTop: 12 }}>
        <div className="ring-pulse-loop" style={{ width: 96, height: 96, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BicepsFlexed size={48} color="#FFFFFF" strokeWidth={2.2} className="flex-arm-loop" />
        </div>

        <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 28, lineHeight: 1.15, color: INK, margin: "6px 0 0" }}>
          Great job committing to yourself today.
        </h1>
        <p style={{ fontFamily: DM_SANS, fontSize: 15, color: "#454850", margin: 0, lineHeight: 1.45, maxWidth: 320 }}>
          Showing up is the hardest rep. Now let&apos;s make it count.
        </p>

        {message && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.7)", border: "1.5px solid #FFFFFF", textAlign: "left", maxWidth: 360 }}>
            {message.icon === "flame" ? <Flame size={24} color="#EA580C" fill="#FDBA74" strokeWidth={2} style={{ flexShrink: 0 }} /> : <Sparkles size={22} color={PURPLE} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
            <span style={{ fontFamily: DM_SANS, fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.35 }}>{message.text}</span>
          </div>
        )}

        <div style={{ width: "100%", marginTop: 6, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.85)", border: "1px solid #FFFFFF", textAlign: "left" }}>
          <p style={{ margin: 0, fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase" }}>Today&apos;s workout</p>
          <p style={{ margin: "4px 0 0", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 19, color: INK }}>{draft.presetTitle || `${draft.focusLabel} workout`}</p>
          <p style={{ margin: "2px 0 0", fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>
            {exercises} exercise{exercises === 1 ? "" : "s"}{draft.minutes ? ` · about ${draft.minutes} min` : ""}
          </p>
        </div>

        <label style={{ width: "100%", textAlign: "left" }}>
          <span style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 700, color: GRAY }}>NOTES FOR TODAY (OPTIONAL)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="How are you feeling? Any goal for this session, or anything to remember?"
            style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E6E3F8", background: "#FFFFFF", fontFamily: DM_SANS, fontSize: 14, color: INK, resize: "none", outline: "none" }}
          />
        </label>
      </div>

      <div style={{ marginTop: 18 }}>
        <PumpButton big onPumped={() => beginWorkout(navigate, notes)}>START WORKOUT</PumpButton>
      </div>
    </div>
  )
}
