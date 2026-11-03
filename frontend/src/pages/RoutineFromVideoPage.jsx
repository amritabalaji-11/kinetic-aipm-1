import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ChevronLeft, ClipboardPaste, Trash2, X } from "lucide-react"
import { BottomSheet, BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { deleteRoutine, listRoutines, readVideo, saveRoutine } from "../services/routineService"
import { activeWorkoutTitle, addRoutineToActiveWorkout } from "../utils/routineBlock"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { TypeTag } from "../components/WorkoutTypeUi"

const AMBER_BG = "#FFFBEB"
const AMBER_BORDER = "#FCD34D"
const card = { background: "#fff", borderRadius: 16, padding: 14, border: "1px solid rgba(129,51,255,0.25)", marginBottom: 12 }
const bigButton = (ghost) => ({ width: "100%", height: ghost ? 48 : 54, borderRadius: 16, cursor: "pointer", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: ghost ? 15 : 16, marginTop: ghost ? 8 : 0, border: ghost ? "1.5px solid rgba(129,51,255,0.5)" : "none", background: ghost ? "#fff" : GRADIENT, color: ghost ? PURPLE : "#fff" })

const SOURCES = [["YouTube", true], ["Instagram", false], ["TikTok", false]]
const READING = ["Opening the video", "Reading what is said", "Building your routine"]
const WHY_NOT = {
  unsupported_site: "Links from that site can't be read yet. Save the video to your phone and upload it instead (coming soon).",
  bad_link: "That doesn't look like a link to a YouTube video.",
  video_unavailable: "This video is private, removed, or can't be viewed publicly.",
  no_captions: "This video has no captions we can read. It works best when the person talks through the moves.",
  no_routine: "We couldn't find a workout in this video. It needs someone naming and explaining the exercises.",
  too_long: "This video is too long for a routine (over 40 minutes). Try a shorter one.",
  daily_limit: "You've read as many videos as you can today. Try again tomorrow.",
}
const REASONS = ["The video is private, or from a private account.", "It has no talking, or no captions we can read.", "The link isn't a video, or is from a site we don't support yet."]

// "8 exercises", "2 sets", "40 s work", "20 s rest", "Warm-up", "Cool-down", "No weights"
const WEIGHTS = { none: "No weights", light: "Light weights", heavy: "Heavy weights" }
function glance(r) {
  const st = r.structure || {}
  const moves = new Set(r.steps.filter((x) => (x.phase || "main") === "main").map((x) => x.name)).size || r.steps.length
  return [
    `${moves} exercise${moves === 1 ? "" : "s"}`,
    st.sets ? `${st.sets} set${st.sets === 1 ? "" : "s"}` : null,
    st.work_seconds ? `${st.work_seconds}s work` : null,
    st.rest_seconds ? `${st.rest_seconds}s rest` : null,
    st.has_warmup ? "Warm-up" : null,
    st.has_cooldown ? "Cool-down" : null,
    WEIGHTS[r.weights] ?? null,
  ].filter(Boolean)
}
const minutesText = (r) => [`${r.steps.length} moves`, r.total_minutes ? `${r.total_minutes} min` : null].filter(Boolean).join(" · ")

export default function RoutineFromVideoPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState("input") // input | reading | result | error
  const [url, setUrl] = useState("")
  const [routine, setRoutine] = useState(null)
  const [error, setError] = useState(null)
  const [readingStep, setReadingStep] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mine, setMine] = useState(null) // my saved routines, null while loading
  const [adding, setAdding] = useState(null) // the routine being added to a workout
  const [where, setWhere] = useState("next")
  const abort = useRef(null)

  const loadMine = () => listRoutines().then(setMine).catch(() => setMine([]))
  useEffect(() => { loadMine() }, [])

  // the three steps move along while the server works
  useEffect(() => {
    if (stage !== "reading") return undefined
    setReadingStep(0)
    const t1 = setTimeout(() => setReadingStep(1), 1500)
    const t2 = setTimeout(() => setReadingStep(2), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [stage])

  const paste = async () => { try { setUrl((await navigator.clipboard.readText()).trim()) } catch { /* the browser said no: they can paste by hand */ } }

  const read = async () => {
    if (!url.trim()) return
    abort.current = new AbortController()
    setStage("reading"); setError(null); setSaved(false)
    try {
      setRoutine(await readVideo(url.trim(), abort.current.signal))
      setStage("result")
    } catch (err) {
      if (err.name === "AbortError") return
      setError({ code: err.code, message: err.message }); setStage("error")
    }
  }
  const cancel = () => { abort.current?.abort(); setStage("input") }

  const editStep = (i, patch) => setRoutine((r) => ({ ...r, steps: r.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) }))
  const removeStep = (i) => setRoutine((r) => ({ ...r, steps: r.steps.filter((_, k) => k !== i) }))

  const save = async () => {
    setSaving(true)
    try { await saveRoutine(routine); setSaved(true); loadMine() } catch (err) { setError({ code: err.code, message: err.message }) } finally { setSaving(false) }
  }

  // the workout in progress, if there is one
  const inProgress = adding ? activeWorkoutTitle() : null
  const confirmAdd = () => {
    if (inProgress && where !== "new") {
      const id = addRoutineToActiveWorkout(adding, where)
      navigate("/workout/active", { state: { focusBlockId: id } })
    } else {
      navigate("/plan/custom", { state: { routine: adding } })
    }
  }

  const back = (label, onClick) => (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0, marginBottom: 10 }}>
      <ChevronLeft size={18} /> {label}
    </button>
  )

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "20px 16px 160px" }}>
      {stage === "input" && (
        <>
          {back("Back", () => navigate(-1))}
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "0 0 4px" }}>Turn a video into a workout</h1>
          <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, lineHeight: 1.4, margin: "0 0 14px" }}>Paste a link to a workout video. We read what the person says and build the routine for you.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 50, borderRadius: 14, border: "1.5px solid #C7D2FE", background: "#fff", padding: "0 6px 0 14px" }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" aria-label="Video link" inputMode="url" autoCapitalize="none" autoCorrect="off"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14 }} />
            <button type="button" onClick={paste} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", borderRadius: 10, padding: "8px 12px", background: "rgba(129,51,255,0.1)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <ClipboardPaste size={14} /> Paste
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
            {SOURCES.map(([name, works]) => (
              <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 17, fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, border: `1.2px solid ${works ? "#16A34A" : "rgba(100,116,139,0.25)"}`, color: works ? "#15803D" : GRAY, background: works ? "#F0FDF4" : "#fff" }}>
                {name} <small style={{ fontWeight: 500, fontSize: 10.5 }}>{works ? "works" : "soon"}</small>
              </span>
            ))}
          </div>

          <div style={{ background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 14, color: "#92400E", marginBottom: 6 }}>Before you paste</div>
            {[[true, <>The video must be <b>public or unlisted</b>.</>], [false, <><b>Private videos and private accounts</b> can&apos;t be read.</>], [true, <>Works best when the person <b>talks through each move</b> and says how long.</>], [false, <>Videos with only music or no talking won&apos;t work well.</>]].map(([ok, text], i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontFamily: DM_SANS, fontSize: 13, lineHeight: 1.4, margin: "5px 0", color: "#451A03" }}>
                <span style={{ color: ok ? "#16A34A" : "#DC2626", fontWeight: 800 }}>{ok ? "✓" : "✕"}</span><span>{text}</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={read} disabled={!url.trim()} style={{ ...bigButton(false), opacity: url.trim() ? 1 : 0.5, cursor: url.trim() ? "pointer" : "not-allowed" }}>Read the video</button>
          <p style={{ fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}>We only use the words in the video, and keep a link and credit to the person who made it.</p>

          <h2 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 18, color: INK, margin: "26px 0 8px" }}>My routines</h2>
          {mine === null && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>Loading…</p>}
          {mine?.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: 0 }}>Routines you save will be here, ready to add to any workout.</p>}
          {mine?.map((m) => (
            <div key={m.routine_id} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>{m.routine.title}</div>
                <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{minutesText(m.routine)}</div>
              </div>
              <button type="button" onClick={() => { setAdding(m.routine); setWhere("next") }} style={{ border: "none", borderRadius: 10, padding: "9px 12px", background: "rgba(129,51,255,0.1)", color: PURPLE, fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add to workout</button>
              <button type="button" aria-label={`Delete ${m.routine.title}`} onClick={async () => { await deleteRoutine(m.routine_id).catch(() => {}); loadMine() }} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}><Trash2 size={18} color={GRAY} /></button>
            </div>
          ))}
        </>
      )}

      {stage === "reading" && (
        <>
          {back("Cancel", cancel)}
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "0 0 4px" }}>Reading the video</h1>
          <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: "0 0 14px" }}>This usually takes under a minute.</p>
          <div style={{ ...card, padding: "6px 14px" }}>
            {READING.map((label, i) => {
              const state = i < readingStep ? "done" : i === readingStep ? "now" : "todo"
              return (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid rgba(100,116,139,0.2)" : "none" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DM_SANS, fontSize: 12, fontWeight: 700, color: state === "todo" ? GRAY : "#fff", background: state === "done" ? "#16A34A" : state === "now" ? PURPLE : "transparent", border: state === "todo" ? "1.5px solid #B6BFCC" : "none" }}>
                    {state === "done" ? <Check size={14} strokeWidth={3.2} /> : state === "now" ? <i className="routine-spin" /> : i + 1}
                  </span>
                  <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: state === "todo" ? "#94A3B8" : state === "now" ? PURPLE : INK }}>{label}</span>
                </div>
              )
            })}
          </div>
          <p style={{ fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, textAlign: "center" }}>Nothing is saved until you choose to add it.</p>
          <style>{`.routine-spin{width:14px;height:14px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:block;animation:rspin .8s linear infinite}@keyframes rspin{to{transform:rotate(360deg)}}`}</style>
        </>
      )}

      {stage === "result" && routine && (
        <>
          {back("New link", () => { setStage("input"); setRoutine(null) })}
          <textarea value={routine.title} rows={routine.title.length > 26 ? 2 : 1} onChange={(e) => setRoutine({ ...routine, title: e.target.value.replace(/\n/g, " ") })} aria-label="Routine name"
            style={{ width: "100%", boxSizing: "border-box", border: "none", background: "transparent", outline: "none", padding: 0, resize: "none", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 21, lineHeight: 1.2, color: INK }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 6px", flexWrap: "wrap" }}>
            <TypeTag type={routine.workout_type} />
            <span style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY }}>{minutesText({ ...routine })}</span>
          </div>
          {routine.source && (
            <a href={routine.source.url} target="_blank" rel="noreferrer" style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: GRAY, textDecoration: "none", marginBottom: 10 }}>
              From a YouTube video{routine.source.author ? ` by ${routine.source.author}` : ""} ↗
            </a>
          )}

          {routine.summary && (
            <div style={{ ...card, padding: "12px 14px" }}>
              <div style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: GRAY, letterSpacing: "0.05em", marginBottom: 4 }}>WHAT THIS IS</div>
              <p style={{ fontFamily: DM_SANS, fontSize: 13.5, color: INK, lineHeight: 1.45, margin: 0 }}>{routine.summary}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {glance(routine).map((g) => <span key={g} style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: "#4C1D95", background: "rgba(129,51,255,0.1)", borderRadius: 10, padding: "4px 9px" }}>{g}</span>)}
              </div>
              {routine.movement && <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, marginTop: 8 }}>Movement: {routine.movement}</div>}
            </div>
          )}

          <div style={{ ...card, padding: "4px 12px" }}>
            {routine.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: i ? "1px solid rgba(100,116,139,0.2)" : "none" }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: PURPLE, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input value={s.name} onChange={(e) => editStep(i, { name: e.target.value })} aria-label={`Move ${i + 1} name`}
                    style={{ width: "100%", boxSizing: "border-box", border: "none", background: "transparent", outline: "none", padding: 0, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: PURPLE }} />
                  <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, lineHeight: 1.35, marginTop: 2 }}>
                    {[s.sides === "each side" ? "Each side" : null, s.how_to, ...(s.cues || [])].filter(Boolean).join(" · ") || "No tips given in the video."}
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, background: "#EDEBF7", borderRadius: 10, padding: "5px 8px", flexShrink: 0, fontFamily: DM_SANS, fontSize: 12, fontWeight: 700 }}>
                  <input type="number" inputMode="numeric" value={(s.seconds ?? s.reps) ?? ""} aria-label={`Move ${i + 1} ${s.reps && !s.seconds ? "reps" : "seconds"}`}
                    onChange={(e) => editStep(i, s.reps && !s.seconds ? { reps: e.target.value === "" ? null : Number(e.target.value) } : { seconds: e.target.value === "" ? null : Number(e.target.value) })}
                    style={{ width: 38, border: "none", background: "transparent", outline: "none", textAlign: "right", fontFamily: DM_SANS, fontSize: 14, fontWeight: 700, color: INK, padding: 0 }} />
                  {s.reps && !s.seconds ? "reps" : "s"}
                </label>
                <button type="button" aria-label={`Remove move ${i + 1}`} onClick={() => removeStep(i)} style={{ border: "none", background: "none", cursor: "pointer", padding: 2, marginTop: 3 }}><X size={16} color="#94A3B8" /></button>
              </div>
            ))}
            {routine.steps.length === 0 && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, padding: "10px 0" }}>No moves left. Go back and read another video.</p>}
          </div>

          {routine.unsure?.length > 0 && (
            <div style={{ background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`, borderRadius: 14, padding: "10px 12px", fontFamily: DM_SANS, fontSize: 12.5, lineHeight: 1.4, color: "#451A03", marginBottom: 12 }}>
              <b style={{ color: "#92400E" }}>The AI wasn&apos;t sure about:</b>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{routine.unsure.slice(0, 5).map((u, i) => <li key={i} style={{ marginBottom: 3 }}>{u}</li>)}</ul>
              <div style={{ marginTop: 6 }}>Watch the video to check before you add it.</div>
            </div>
          )}
          {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626" }}>{error.message}</p>}

          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, padding: "12px 16px 96px", background: "linear-gradient(180deg, rgba(240,239,254,0), #F0EFFE 28%)" }}>
            <div style={{ maxWidth: 430, margin: "0 auto" }}>
              <button type="button" disabled={routine.steps.length === 0} onClick={() => { setAdding(routine); setWhere("next") }} style={{ ...bigButton(false), opacity: routine.steps.length ? 1 : 0.5 }}>Add to today&apos;s workout</button>
              <button type="button" disabled={saved || saving || routine.steps.length === 0} onClick={save} style={bigButton(true)}>{saved ? "✓ Saved to My routines" : saving ? "Saving…" : "Save to My routines"}</button>
            </div>
          </div>
        </>
      )}

      {stage === "error" && error && (
        <>
          {back("Back", () => setStage("input"))}
          <div style={{ textAlign: "center", padding: "26px 8px 10px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: "#FEE2E2", color: "#DC2626", fontSize: 30, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>!</div>
            <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, color: INK, margin: "0 0 6px" }}>We couldn&apos;t read this video</h1>
          </div>
          <div style={card}>
            <p style={{ fontFamily: DM_SANS, fontSize: 14, color: INK, margin: 0, lineHeight: 1.45 }}>{WHY_NOT[error.code] || error.message}</p>
          </div>
          {["video_unavailable", "no_captions"].includes(error.code) && (
            <div style={card}>
              <div style={{ fontFamily: DM_SANS, fontSize: 13, fontWeight: 700, color: GRAY, marginBottom: 4 }}>That usually means one of these:</div>
              {REASONS.map((r) => <div key={r} style={{ display: "flex", gap: 8, fontFamily: DM_SANS, fontSize: 13, lineHeight: 1.4, margin: "5px 0" }}><span style={{ color: "#DC2626" }}>•</span><span>{r}</span></div>)}
            </div>
          )}
          <button type="button" onClick={() => setStage("input")} style={bigButton(false)}>Try another link</button>
          <button type="button" onClick={() => navigate("/plan/custom")} style={bigButton(true)}>Create a workout myself</button>
        </>
      )}

      {adding && (
        <BottomSheet title="Add to today's workout" onClose={() => setAdding(null)}
          footer={<button type="button" onClick={confirmAdd} style={bigButton(false)}>Add</button>}>
          <p style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, margin: "0 0 10px" }}>The routine becomes its own section{adding.source ? ", with a button to watch the video" : ""}.</p>
          {inProgress && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 10, border: where === "new" ? "1.2px solid rgba(100,116,139,0.2)" : `2px solid ${PURPLE}` }}>
              <span style={{ display: "inline-block", fontFamily: DM_SANS, fontSize: 10.5, fontWeight: 700, color: "#15803D", background: "#DCFCE7", borderRadius: 8, padding: "2px 8px", marginBottom: 6 }}>WORKOUT IN PROGRESS</span>
              <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15 }}>Add to my workout now</div>
              <div style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, lineHeight: 1.4, marginTop: 2 }}>{inProgress.title} · {inProgress.done} of {inProgress.total} sections done. Opens your workout.</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[["first", "First"], ["next", "Next"], ["last", "Last"]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setWhere(id)} style={{ flex: 1, padding: "7px 4px", borderRadius: 10, cursor: "pointer", fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, border: `1.2px solid ${where === id ? PURPLE : "rgba(100,116,139,0.25)"}`, color: where === id ? PURPLE : GRAY, background: where === id ? "rgba(129,51,255,0.08)" : "#fff" }}>{label}</button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setWhere("new")} style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: 14, padding: 12, cursor: "pointer", border: !inProgress || where === "new" ? `2px solid ${PURPLE}` : "1.2px solid rgba(100,116,139,0.2)" }}>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>Start a new workout with it</div>
            <div style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, lineHeight: 1.4, marginTop: 2 }}>Opens &quot;Create your own&quot; with the routine as the first section, and you add the rest.</div>
          </button>
        </BottomSheet>
      )}
    </div>
  )
}
