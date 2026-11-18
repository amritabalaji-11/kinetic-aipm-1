import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BottomSheet, BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { QUESTIONS } from "../data/aboutYou"
import { fetchAbout, saveAboutYou } from "../services/authService"
import { ROWS, rowSummary } from "../utils/aboutYou"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const chip = (on) => ({ padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, border: `1.2px solid ${on ? PURPLE : "rgba(129,51,255,0.35)"}`, background: on ? PURPLE : "#fff", color: on ? "#fff" : PURPLE })

// What the person told us when they joined ("A little about you"), to see and change. Only they can see it; gender and injuries show
// only whether they are set on the list, and their detail opens when tapped.
export default function AboutYouPage() {
  const navigate = useNavigate()
  const [about, setAbout] = useState(null) // null while loading
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(null) // the row being changed
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = () => fetchAbout().then((a) => { setAbout(a); setFailed(false) }).catch(() => setFailed(true))
  useEffect(() => { load() }, [])

  const open = (row) => {
    setError("")
    setEditing(row)
    setDraft({ ...about, injury_details: about.injury_details ?? "" })
  }
  const questionOf = (key) => QUESTIONS.find((q) => q.key === key)

  const pick = (q, value) => setDraft((d) => {
    if (q.multi) { const have = d[q.key] || []; return { ...d, [q.key]: have.includes(value) ? have.filter((v) => v !== value) : [...have, value] } }
    return { ...d, [q.key]: d[q.key] === value ? null : value } // tapping the chosen one again un-chooses it
  })

  const save = async () => {
    setBusy(true); setError("")
    try {
      const key = editing.key
      const body = { clear: [] }
      if (key === "injuries") {
        if (draft.has_injury === true) { body.has_injury = true; body.injury_details = (draft.injury_details || "").trim() }
        else if (draft.has_injury === false) { body.has_injury = false }
        else body.clear.push("has_injury")
      } else if (key === "training_types") {
        if ((draft.training_types || []).length) body.training_types = draft.training_types; else body.clear.push("training_types")
      } else if (draft[key]) body[key] = draft[key]
      else body.clear.push(key)
      if (!body.clear.length) delete body.clear
      await saveAboutYou(body)
      await load()
      setEditing(null)
    } catch (e) { setError(e.message || "We couldn't save that. Please try again.") } finally { setBusy(false) }
  }

  const q = editing && editing.key !== "injuries" ? questionOf(editing.key) : null
  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 20px 120px", maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Profile
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "10px 0 2px" }}>About you</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 13.5, color: GRAY, margin: "0 0 14px", lineHeight: 1.45 }}>What you told us when you joined. Change or take back any answer.</p>

      {failed && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 14, color: "#DC2626" }}>We couldn&apos;t load your answers. <button type="button" onClick={load} style={{ background: "none", border: "none", color: PURPLE, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: DM_SANS }}>Try again</button></p>}
      {!failed && !about && <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>Loading…</p>}
      {about && ROWS.map((row) => {
        const summary = rowSummary(row.key, about)
        return (
          <button key={row.key} type="button" onClick={() => open(row)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: "#fff", border: "1px solid #F1F1F6", borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontFamily: DM_SANS, fontSize: 14, color: INK }}>{row.title}</b>
              <span style={{ fontFamily: DM_SANS, fontSize: 12.5, color: summary === "Not set" ? "#94A3B8" : "#64748B" }}>{summary}</span>
            </span>
            <ChevronRight size={18} color="#C4C4CF" />
          </button>
        )
      })}
      {about && <p style={{ fontFamily: DM_SANS, fontSize: 11.5, color: GRAY, margin: "6px 4px 0", lineHeight: 1.45 }}>Only you can see your answers. They never appear on the pages our team uses to look at how Kinetic is used.</p>}

      {editing && (
        <BottomSheet title={editing.title} onClose={() => setEditing(null)}
          footer={<button type="button" onClick={save} disabled={busy} style={{ width: "100%", height: 50, borderRadius: 14, border: "none", cursor: "pointer", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save"}</button>}>
          {q && (
            <div role={q.multi ? "group" : "radiogroup"} aria-label={q.label} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {q.options.map(([value, label]) => {
                const on = q.multi ? (draft[q.key] || []).includes(value) : draft[q.key] === value
                return <button key={value} type="button" role={q.multi ? "checkbox" : "radio"} aria-checked={on} style={chip(on)} onClick={() => pick(q, value)}>{label}</button>
              })}
            </div>
          )}
          {editing.key === "injuries" && (
            <>
              <div role="radiogroup" aria-label="Past injuries or pain" style={{ display: "flex", gap: 6 }}>
                {[[true, "Yes"], [false, "No"]].map(([v, label]) => (
                  <button key={label} type="button" role="radio" aria-checked={draft.has_injury === v} style={chip(draft.has_injury === v)} onClick={() => setDraft((d) => ({ ...d, has_injury: d.has_injury === v ? null : v }))}>{label}</button>
                ))}
              </div>
              {draft.has_injury === true && (
                <textarea value={draft.injury_details ?? ""} onChange={(e) => setDraft((d) => ({ ...d, injury_details: e.target.value.slice(0, 1000) }))} rows={3} aria-label="Injury details" placeholder="For example: left knee, a sprain in 2023. Only what you are comfortable sharing."
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(129,51,255,0.3)", background: "#fff", fontFamily: DM_SANS, fontSize: 14, color: INK, resize: "vertical" }} />
              )}
              <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "8px 0 0", lineHeight: 1.4 }}>Only you can see this. Tap the chosen answer again to take it back.</p>
            </>
          )}
          {editing.key !== "injuries" && <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "10px 0 0", lineHeight: 1.4 }}>Tap a chosen answer again to take it back, then Save.</p>}
          {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", margin: "8px 0 0" }}>{error}</p>}
        </BottomSheet>
      )}
    </div>
  )
}
