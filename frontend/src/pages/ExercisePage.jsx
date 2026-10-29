import { useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { ChevronDown, ChevronLeft, ExternalLink } from "lucide-react"
import ExpandableVideo from "../components/ExpandableVideo"
import ListenButton from "../components/ListenButton"
import MuscleMap from "../components/MuscleMap"
import { useCoachScript } from "../utils/useCoachScript"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { getExerciseGuide, guideToSpeech, hasExerciseGuide } from "../data/exerciseGuides"
import { equipmentLabel, getExercise } from "../utils/exerciseCatalog"
import { FLAT_LILAC } from "../utils/pageBackground"

const small = { fontFamily: DM_SANS, fontSize: 13, color: INK, lineHeight: 1.5, margin: 0 }

export default function ExercisePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const exercise = getExercise(id)
  const guide = getExerciseGuide(id)

  const coachScript = useCoachScript(id)?.full ?? null // trainer-style script for the Listen button (null: read the points instead)

  // Where Back goes: the page you came from. If there is nothing to go back to (the page was opened directly),
  // go to the workout in progress, or the plan screen.
  const from = location.state?.from
  const workoutInProgress = Boolean(localStorage.getItem("activeWorkout"))
  const fallback = from ?? (workoutInProgress ? "/workout/active" : "/plan")
  const backLabel = fallback.startsWith("/workout/active") ? "Back to workout" : fallback.startsWith("/plan") ? "Back to plan" : "Back"
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback, { replace: true }))

  // stays at the top of the screen while you scroll the guide
  const back = (
    <div style={{ position: "sticky", top: 0, zIndex: 30, background: FLAT_LILAC, margin: "-24px -16px 8px", padding: "12px 16px 8px" }}>
      <button type="button" onClick={goBack} aria-label={backLabel} style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 40, padding: "0 16px 0 10px", borderRadius: 20, border: "1.2px solid rgba(129,51,255,0.45)", background: "#FFFFFF", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14 }}>
        <ChevronLeft size={20} /> {backLabel}
      </button>
    </div>
  )

  if (!exercise || !guide) {
    return (
      <div style={{ minHeight: "100vh", background: FLAT_LILAC, padding: "24px 16px 120px" }}>
        {back}
        <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, color: INK, margin: "14px 0 6px" }}>{exercise?.name ?? "Exercise"}</h1>
        <p style={{ ...small, color: GRAY }}>The form guide for this exercise is coming soon.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: FLAT_LILAC, padding: "24px 16px 120px" }}>
      {back}
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "12px 0 6px" }}>{exercise.name}</h1>
      <p style={{ ...small, color: GRAY, marginBottom: 10 }}>{guide.summary}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {[guide.level, equipmentLabel(exercise), exercise.category].map((t) => <Pill key={t}>{t}</Pill>)}
      </div>

      {/* The short version: video beside the three cues */}
      <div style={{ ...cardStyle, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, width: 150 }}>
          <ExpandableVideo youtubeId={guide.video.youtubeId} title={`${exercise.name} demo`} vertical={guide.video.vertical} width={150} loop />
          <a href={guide.video.watchUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontFamily: DM_SANS, fontSize: 11, color: GRAY, textDecoration: "none" }}>
            {guide.video.credit} on YouTube <ExternalLink size={11} />
          </a>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK, margin: "0 0 8px" }}>3 key cues</p>
          <ol style={{ margin: 0, paddingLeft: 18, listStyle: "decimal" }}>
            {guide.keyCues.map((c, i) => <li key={i} style={{ ...small, marginBottom: 8 }}>{c}</li>)}
          </ol>
          <ListenButton variant="light" coach text={coachScript ?? guideToSpeech(exercise.name, guide)} />
        </div>
      </div>

      {guide.stance && (
        <div style={{ marginTop: 10 }}><Tile label="Stance" value={guide.stance} /></div>
      )}
      {guide.depth && (
        <div style={{ ...cardStyle, padding: "10px 12px", marginTop: 8 }}>
          <p style={{ fontFamily: DM_SANS, fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Depth</p>
          <p style={{ ...small, fontWeight: 600 }}>{guide.depth.goal}</p>
          <p style={{ ...small, fontWeight: 700, marginTop: 8 }}>Stop going down when:</p>
          <ul style={{ margin: "2px 0 0", paddingLeft: 18, listStyle: "disc" }}>
            {guide.depth.stopWhen.map((w) => <li key={w} style={small}>{w}</li>)}
          </ul>
          <p style={{ ...small, marginTop: 8 }}>{guide.depth.afterStop}</p>
          <p style={{ ...small, color: GRAY, marginTop: 6 }}>{guide.depth.posture}</p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
        <Tile label="Breathing" value={guide.breathing} />
        <Tile label="Tempo" value={guide.tempo} />
        <Tile label="Sets and reps" value={guide.setsReps} />
      </div>
      <MuscleMap main={guide.muscles.main} helping={guide.muscles.helping} />

      {/* The detail, folded away until asked for */}
      <Section title="How to do it">
        <Label>Setup</Label>
        <ol style={{ margin: 0, paddingLeft: 18, listStyle: "decimal" }}>{guide.setup.map((s, i) => <li key={i} style={{ ...small, marginBottom: 4 }}>{s}</li>)}</ol>
        <Label>Movement</Label>
        <ol style={{ margin: 0, paddingLeft: 18, listStyle: "decimal" }}>{guide.movement.map((s, i) => <li key={i} style={{ ...small, marginBottom: 4 }}>{s}</li>)}</ol>
        <Label>Weight</Label>
        <p style={small}>{guide.startWeight}</p>
      </Section>

      <Section title="Common mistakes" count={guide.mistakes.length}>
        {guide.mistakes.map((m, i) => (
          <p key={i} style={{ ...small, marginBottom: 8 }}><b>{m.mistake}.</b> {m.fix}</p>
        ))}
      </Section>

      <Section title="Too hard? Too easy?" count={guide.easier.length + guide.harder.length}>
        <Label>Make it easier</Label>
        {guide.easier.map((s) => <Step key={s.name} step={s} />)}
        <Label>Make it harder</Label>
        {guide.harder.map((s) => <Step key={s.name} step={s} />)}
      </Section>

      <Section title="Safety">
        <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>{guide.safety.map((s, i) => <li key={i} style={{ ...small, marginBottom: 6 }}>{s}</li>)}</ul>
      </Section>

      {guide.status === "draft" && (
        <p style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, textAlign: "center", margin: "16px 8px 0" }}>
          Draft guide. A trainer has not reviewed it yet. Listen to your body and stop if something hurts.
        </p>
      )}
    </div>
  )
}

function Pill({ children }) {
  return <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(129,51,255,0.1)", color: PURPLE, fontFamily: DM_SANS, fontSize: 12, fontWeight: 600 }}>{children}</span>
}

function Tile({ label, value }) {
  return (
    <div style={{ ...cardStyle, padding: "9px 10px" }}>
      <p style={{ fontFamily: DM_SANS, fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{label}</p>
      <p style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: INK, lineHeight: 1.35, margin: 0 }}>{value}</p>
    </div>
  )
}

function Label({ children }) {
  return <p style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 6px" }}>{children}</p>
}

function Section({ title, count, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ ...cardStyle, padding: 0, marginBottom: 10 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>{title}</span>
        {count != null && <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{count}</span>}
        <ChevronDown size={18} color={PURPLE} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  )
}

function Step({ step }) {
  const name = step.exerciseId && hasExerciseGuide(step.exerciseId)
    ? <Link to={`/exercise/${step.exerciseId}`} style={{ color: PURPLE }}>{step.name}</Link>
    : step.name
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ ...small, fontWeight: 700 }}>{name}</p>
      <p style={small}>{step.what}</p>
      <p style={{ ...small, color: GRAY }}>Pick this if {step.pickIf}.</p>
    </div>
  )
}
