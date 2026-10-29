import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { Clock, Dumbbell, Calendar, ChevronDown, Pencil, Trash2, TrendingUp } from "lucide-react"
import {
  listWorkouts, updateWorkout, deleteWorkout, getExerciseProgress, getPendingWorkouts, syncPendingWorkouts, fromDbTime,
} from "../services/workoutService"

const card = {
  background: "#FFFFFF",
  border: "1px solid rgba(2, 132, 199, 0.4)",
  borderRadius: "16px",
  padding: "16px",
}
const small = { fontSize: "12px", fontFamily: "'DM Sans'", color: "#454850" }
const input = {
  padding: "6px 8px", background: "#EAEAEA", border: "none", borderRadius: "4px",
  fontSize: "13px", width: "60px", boxSizing: "border-box",
}
const pillBtn = (primary) => ({
  display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px",
  cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'",
  background: primary ? "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)" : "#FCF9FF",
  color: primary ? "#FFFFFF" : "#8133FF",
  border: primary ? "none" : "1px solid #A36CFB",
})

const dateLabel = (w) => (fromDbTime(w.started_at || w.created_at) || new Date()).toLocaleDateString()

// Shows personal best + recent sessions for one exercise (loaded when you tap the chart icon)
function ProgressPanel({ name }) {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getExerciseProgress(name).then(setData).catch(() => setFailed(true))
  }, [name])

  if (failed) return <p style={small}>Couldn&apos;t load progress.</p>
  if (!data) return <p style={small}>Loading progress…</p>
  if (data.sessions.length === 0) return <p style={small}>No history yet for {name}.</p>

  const recent = data.sessions.slice(-5)
  const maxVol = Math.max(...recent.map((s) => s.volume || 0), 1)
  return (
    <div style={{ background: "#F7F5FF", borderRadius: "8px", padding: "10px", margin: "6px 0 10px 0" }}>
      <p style={{ ...small, margin: "0 0 8px 0", color: "#0F172A", fontWeight: 600 }}>
        Personal best: {data.personal_best_weight} kg
        {data.personal_best_date && ` (${(fromDbTime(data.personal_best_date) || new Date()).toLocaleDateString()})`}
      </p>
      {recent.map((s) => (
        <div key={s.session_id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ ...small, width: "74px" }}>{(fromDbTime(s.logged_at) || new Date()).toLocaleDateString()}</span>
          <div style={{ flex: 1, background: "#E4DEFF", borderRadius: "4px", height: "8px" }}>
            <div style={{ width: `${((s.volume || 0) / maxVol) * 100}%`, height: "8px", borderRadius: "4px", background: "#8133FF" }} />
          </div>
          <span style={{ ...small, width: "96px", textAlign: "right" }}>
            {s.best_weight} kg · {Math.round(s.volume || 0)} vol
          </span>
        </div>
      ))}
      <p style={{ ...small, margin: "6px 0 0 0" }}>Volume = weight × reps, summed over the sets.</p>
    </div>
  )
}

function WorkoutCard({ workout, onChanged, onDeleted, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef(null)
  // arriving from Home with this workout picked: bring it into view
  useEffect(() => { if (defaultOpen) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }) }, [defaultOpen])
  const [draft, setDraft] = useState(null) // non-null while editing
  const [progressFor, setProgressFor] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const view = draft || workout
  const editing = draft !== null

  const startEdit = () => setDraft(JSON.parse(JSON.stringify(workout)))

  const setField = (exIdx, setIdx, field, value) => {
    const next = JSON.parse(JSON.stringify(draft))
    next.exercises[exIdx].sets[setIdx][field] = value === "" ? null : Number(value)
    setDraft(next)
  }

  const save = async () => {
    setBusy(true); setError("")
    try {
      const saved = await updateWorkout(workout.workout_id, draft)
      setDraft(null)
      onChanged(saved)
    } catch {
      setError("Couldn't save your changes. Please try again.")
    } finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true); setError("")
    try { await deleteWorkout(workout.workout_id); onDeleted(workout.workout_id) }
    catch { setError("Couldn't delete this workout. Please try again."); setBusy(false) }
  }

  const totalSets = view.exercises.reduce((n, e) => n + e.sets.length, 0)

  return (
    <div ref={ref} style={card}>
      <button onClick={() => setOpen(!open)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
        {view.name && (
          <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#8133FF", marginBottom: "6px" }}>
            {view.name}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} color="#8133FF" />
            <span style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#0F172A" }}>
              {dateLabel(view)}
            </span>
          </div>
          <ChevronDown size={20} color="#1E293B"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px", fontSize: "12px", color: "#6C5CE7", fontWeight: 500 }}>
          {view.duration_min ? (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14} />{view.duration_min} min</span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Dumbbell size={14} />{view.exercises.length} exercises · {totalSets} sets
          </span>
          <span>Focus: {view.focus_label || "General"}</span>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #f0eeff", marginTop: "12px", paddingTop: "12px" }}>
          {view.exercises.map((ex, exIdx) => (
            <div key={exIdx} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", fontFamily: "'Bricolage Grotesque'" }}>
                  {exIdx + 1}. {ex.exercise_name}
                </span>
                <button
                  title="See progress"
                  onClick={() => setProgressFor(progressFor === ex.exercise_name ? null : ex.exercise_name)}
                  style={{ all: "unset", cursor: "pointer", color: "#8133FF" }}
                >
                  <TrendingUp size={18} />
                </button>
              </div>
              {progressFor === ex.exercise_name && <ProgressPanel name={ex.exercise_name} />}

              {ex.sets.length === 0 && <p style={small}>No sets logged.</p>}
              {ex.sets.map((s, setIdx) => (
                <div key={setIdx} style={{ display: "flex", alignItems: "center", gap: "10px", margin: "6px 0" }}>
                  <span style={{ ...small, width: "40px" }}>Set {s.set_number}</span>
                  {editing ? (
                    <>
                      <input type="number" style={input} value={s.weight ?? ""} onChange={(e) => setField(exIdx, setIdx, "weight", e.target.value)} />
                      <span style={small}>kg ×</span>
                      <input type="number" style={input} value={s.reps ?? ""} onChange={(e) => setField(exIdx, setIdx, "reps", e.target.value)} />
                      <span style={small}>reps</span>
                      {s.duration_sec != null && (
                        <>
                          <input type="number" style={input} value={s.duration_sec ?? ""} onChange={(e) => setField(exIdx, setIdx, "duration_sec", e.target.value)} />
                          <span style={small}>sec</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "13px", color: "#0F172A" }}>
                      {/* only what was logged: any mix of weight, reps and time */}
                      {[
                        s.weight != null && `${s.weight} ${s.weight_unit || "kg"}`,
                        s.reps != null && `${s.reps} reps`,
                        s.duration_sec != null && `${s.duration_sec} sec`,
                      ].filter(Boolean).join(" × ") || "–"}
                    </span>
                  )}
                </div>
              ))}

              {editing ? (
                <textarea
                  value={ex.notes || ""} rows={2} placeholder="Exercise notes"
                  onChange={(e) => { const n = JSON.parse(JSON.stringify(draft)); n.exercises[exIdx].notes = e.target.value; setDraft(n) }}
                  style={{ ...input, width: "100%", marginTop: "4px", fontFamily: "'DM Sans'" }}
                />
              ) : ex.notes ? (
                <p style={{ ...small, margin: "4px 0 0 0", fontStyle: "italic" }}>“{ex.notes}”</p>
              ) : null}
            </div>
          ))}

          {editing ? (
            <textarea
              value={view.notes || ""} rows={2} placeholder="Workout notes"
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              style={{ ...input, width: "100%", fontFamily: "'DM Sans'" }}
            />
          ) : view.notes ? (
            <p style={{ ...small, margin: "0 0 10px 0" }}><strong>Workout notes:</strong> {view.notes}</p>
          ) : null}

          {error && <p style={{ ...small, color: "#DC2626" }}>{error}</p>}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {editing ? (
              <>
                <button style={pillBtn(true)} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
                <button style={pillBtn(false)} disabled={busy} onClick={() => { setDraft(null); setError("") }}>Cancel</button>
              </>
            ) : confirmDelete ? (
              <>
                <button style={{ ...pillBtn(false), color: "#DC2626", border: "1px solid #DC2626" }} disabled={busy} onClick={remove}>
                  {busy ? "Deleting…" : "Yes, delete this workout"}
                </button>
                <button style={pillBtn(false)} disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</button>
              </>
            ) : (
              <>
                <button style={pillBtn(false)} onClick={startEdit}><Pencil size={14} />Edit</button>
                <button style={pillBtn(false)} onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Delete</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const WorkoutLoggerPage = () => {
  const [workouts, setWorkouts] = useState([])
  const [status, setStatus] = useState("loading") // loading | ready | error
  const openWorkoutId = useLocation().state?.openWorkoutId
  const [local, setLocal] = useState([]) // finished workouts that have not reached the server yet
  const [syncing, setSyncing] = useState(false)

  const load = () => {
    setLocal(getPendingWorkouts())
    return listWorkouts()
      .then((rows) => { setWorkouts(rows); setStatus("ready") })
      .catch(() => setStatus("error"))
  }

  // Show what is there straight away, and quietly retry anything that has not reached the server yet
  useEffect(() => {
    load()
    if (getPendingWorkouts().length) syncPendingWorkouts().then(({ sent }) => { if (sent) load() })
  }, [])

  const syncLocal = async () => {
    setSyncing(true)
    await syncPendingWorkouts()
    await load()
    setSyncing(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 24px 140px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#0F172A", margin: "0 0 8px 0" }}>
          History
        </h1>
        <p style={{ fontSize: "14px", fontFamily: "'DM Sans'", color: "#454850", margin: 0 }}>
          Tap a workout to see every set, edit it, or check your progress.
        </p>
      </div>

      {local.length > 0 && (
        <div style={{ ...card, marginBottom: "12px", borderColor: "#A36CFB" }}>
          <p style={{ ...small, margin: "0 0 8px 0", color: "#0F172A" }}>
            {local.length} workout{local.length > 1 ? "s haven't" : " hasn't"} reached your account yet. We keep retrying, or you can sync now.
          </p>
          <button style={pillBtn(true)} disabled={syncing} onClick={syncLocal}>
            {syncing ? "Syncing…" : "Sync to my account"}
          </button>
        </div>
      )}

      {local.map((w) => (
        <div key={w.id} style={{ ...card, marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: "16px", color: "#0F172A" }}>
                {w.presetTitle || w.focusLabel || "Workout"}
              </p>
              <p style={{ ...small, margin: "4px 0 0 0" }}>
                {new Date(w.id).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {(w.exercises || []).length} exercise{(w.exercises || []).length === 1 ? "" : "s"}
              </p>
            </div>
            <span style={{ padding: "3px 8px", borderRadius: "10px", background: "rgba(129,51,255,0.12)", color: "#7C3AED", fontFamily: "'DM Sans'", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
              Not synced yet
            </span>
          </div>
        </div>
      ))}

      {status === "loading" && <p style={small}>Loading your workouts…</p>}
      {status === "error" && (
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#454850", margin: "0 0 10px 0" }}>
            Couldn&apos;t reach the server to load your workouts.
          </p>
          <button style={{ ...pillBtn(true), margin: "0 auto" }} onClick={load}>Try again</button>
        </div>
      )}

      {status === "ready" && workouts.length === 0 && local.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: "16px", color: "#454850", margin: 0 }}>
            No workouts logged yet. Start by creating a new workout!
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {workouts.map((w) => (
          <WorkoutCard
            key={w.workout_id}
            workout={w}
            defaultOpen={w.workout_id === openWorkoutId}
            onChanged={(saved) => setWorkouts((prev) => prev.map((x) => (x.workout_id === saved.workout_id ? saved : x)))}
            onDeleted={(id) => setWorkouts((prev) => prev.filter((x) => x.workout_id !== id))}
          />
        ))}
      </div>
    </div>
  )
}

export default WorkoutLoggerPage
