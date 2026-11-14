import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Check, ChevronLeft, Film, Plus, X } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE } from "../components/planUi"
import { MAX_FILES, MAX_MESSAGE, TOPICS, fileProblem, sendFeedback } from "../services/feedbackService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

const box = { background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14 }

// Send a message to the Kinetic team, with photos or videos if it helps.
export default function FeedbackPage() {
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? "/profile"
  const [topic, setTopic] = useState(null)
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState([])
  const [includeAnalysis, setIncludeAnalysis] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const picker = useRef(null)
  const previews = useRef(new Map())

  const previewOf = (file) => {
    if (!file.type.startsWith("image/")) return null
    if (!previews.current.has(file)) previews.current.set(file, URL.createObjectURL(file))
    return previews.current.get(file)
  }
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const addFiles = (list) => {
    const chosen = [...list]
    const bad = chosen.map(fileProblem).find(Boolean)
    const room = MAX_FILES - files.length
    if (bad) setError(bad)
    else if (chosen.length > room) setError(`You can attach up to ${MAX_FILES} files.`)
    else setError("")
    if (!bad) setFiles((f) => [...f, ...chosen.slice(0, Math.max(0, room))])
    if (picker.current) picker.current.value = ""
  }

  const canSend = topic && (message.trim() || files.length) && !sending
  const send = async () => {
    setSending(true); setError(""); setProgress(0)
    try {
      await sendFeedback({ topic, message: message.trim(), files, includeAnalysis, onProgress: setProgress })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const page = { minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }
  if (done) {
    return (
      <div style={{ ...page, textAlign: "center", paddingTop: 90 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Check size={32} strokeWidth={3} /></div>
        <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 26, color: INK, margin: "0 0 8px" }}>Thank you</h1>
        <p style={{ fontFamily: DM_SANS, fontSize: 14.5, color: GRAY, lineHeight: 1.5, margin: "0 0 26px" }}>We read every message. If we have a question, we’ll get in touch.</p>
        <button type="button" onClick={() => navigate(from)} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, cursor: "pointer" }}>Back</button>
      </div>
    )
  }

  return (
    <div style={page}>
      <button type="button" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 24, color: INK, margin: "8px 0 4px" }}>Give feedback</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, lineHeight: 1.45, margin: "0 0 14px" }}>Tell us what worked, what didn’t, or what you wish it did. We read every message.</p>

      <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: GRAY, marginBottom: 6 }}>What is it about?</div>
      <div role="radiogroup" aria-label="Topic" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {TOPICS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} onClick={() => setTopic(t.id)}
            style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13.5, border: `1.2px solid ${topic === t.id ? PURPLE : "rgba(129,51,255,0.35)"}`, background: topic === t.id ? PURPLE : "#fff", color: topic === t.id ? "#fff" : PURPLE }}>
            {t.label}
          </button>
        ))}
      </div>

      <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))} rows={6} aria-label="Your message" placeholder="What happened? What did you expect?"
        style={{ ...box, width: "100%", boxSizing: "border-box", padding: 12, fontFamily: DM_SANS, fontSize: 15, lineHeight: 1.45, outline: "none", resize: "none" }} />

      <div style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: "12px 0 6px" }}><b>Add a photo or video</b> · up to {MAX_FILES}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} style={{ position: "relative", width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg,#0F172A,#312E81 55%,#6D28D9)", color: "#fff" }}>
            {previewOf(f) ? <img src={previewOf(f)} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Film size={22} style={{ position: "absolute", left: 8, bottom: 8 }} />}
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((all) => all.filter((_, k) => k !== i))} disabled={sending}
              style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.92)", color: GRAY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><X size={12} /></button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <button type="button" onClick={() => picker.current?.click()} disabled={sending} style={{ width: 72, height: 72, borderRadius: 12, border: `1.5px dashed ${PURPLE}`, background: "#FCF9FF", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
            <Plus size={20} /> Add
          </button>
        )}
        <input ref={picker} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      <label style={{ ...box, display: "flex", gap: 10, alignItems: "flex-start", padding: 12, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={includeAnalysis} onChange={(e) => setIncludeAnalysis(e.target.checked)} style={{ width: 20, height: 20, accentColor: PURPLE, marginTop: 1 }} />
        <span style={{ fontFamily: DM_SANS, fontSize: 13.5, lineHeight: 1.4 }}><b>Include my latest analysis</b><br /><span style={{ color: GRAY }}>So the team can see what the app told you.</span></span>
      </label>

      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", margin: "0 0 10px" }}>{error}</p>}
      <button type="button" disabled={!canSend} onClick={send} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: GRADIENT, color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, cursor: canSend ? "pointer" : "not-allowed", opacity: canSend ? 1 : 0.5 }}>
        {sending ? (files.length ? `Sending… ${Math.round(progress * 100)}%` : "Sending…") : "Send feedback"}
      </button>
      <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, textAlign: "center", margin: "8px 0 0" }}>Photos up to 10 MB, videos up to 100 MB. Only the Kinetic team sees this.</p>
    </div>
  )
}
