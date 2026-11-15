import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK, PURPLE, cardStyle } from "../components/planUi"
import { useUser } from "../context/UserContext"
import { getVideoItem, reviewVideo } from "../services/adminService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { timeAgo } from "../utils/timeAgo"

const VERDICTS = [["good", "Good", "#15803D", "#DCFCE7"], ["mixed", "Mixed", "#92400E", "#FEF3C7"], ["wrong", "Wrong", "#B91C1C", "#FEE2E2"]]
const SCORE_LABELS = { range_of_motion: "Range of motion", posture: "Posture", stability: "Stability", movement_quality: "Movement quality", tempo: "Tempo" }

// One shared video next to what the AI told the person, with a verdict and a private note
export default function AdminVideoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeUser } = useUser()
  const isAdmin = activeUser?.role === "admin"
  const [item, setItem] = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (activeUser && !isAdmin) navigate("/profile", { replace: true }) }, [activeUser, isAdmin, navigate])
  useEffect(() => {
    if (!isAdmin) return
    getVideoItem(id).then((v) => { setItem(v); setVerdict(v.review?.verdict ?? null); setNote(v.review?.note ?? ""); setSaved(Boolean(v.review)) })
      .catch((e) => setError(e.status === 404 ? "This video isn't shared with the team (or the person has turned sharing off)." : e.message))
  }, [id, isAdmin])
  if (!isAdmin) return null

  const save = async () => {
    setSaving(true); setError("")
    try { await reviewVideo(id, { verdict, note }); setSaved(true) } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const r = item?.results
  const said = r?.coaching_output?.verdict_summary ?? r?.coaching_output?.summary_paragraph

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "16px 16px 120px" }}>
      <button type="button" onClick={() => navigate("/admin")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={18} /> Back to videos
      </button>
      {error && <p role="alert" style={{ fontFamily: DM_SANS, fontSize: 13, color: "#DC2626", marginTop: 12 }}>{error}</p>}
      {item && (
        <>
          <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, color: INK, margin: "8px 0 2px" }}>{item.exercise || "Video"} · {item.from}</h1>
          <div style={{ fontFamily: DM_SANS, fontSize: 12.5, color: GRAY, marginBottom: 10 }}>{[timeAgo(item.created_at), item.weight, item.email].filter(Boolean).join(" · ")} · shared with the team by the person</div>

          <video src={item.video_url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 520, borderRadius: 12, background: "#0F172A", marginBottom: 10 }} />

          <div style={cardStyle}>
            <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK, marginBottom: 6 }}>What the AI told them</div>
            {!r && <div style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>No results saved yet ({item.status}).</div>}
            {r && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {[`${r.rep_count ?? "?"} reps counted`, r.overall_form_score != null ? `form score ${Math.round(r.overall_form_score)}` : null, r.camera_angle ? `${r.camera_angle} view` : null,
                    ...Object.entries(r.scores).filter(([, v]) => v != null).map(([k, v]) => `${SCORE_LABELS[k]} ${v}`)].filter(Boolean)
                    .map((t) => <span key={t} style={{ fontFamily: DM_SANS, fontSize: 11.5, fontWeight: 600, background: "rgba(129,51,255,0.1)", color: "#4C1D95", borderRadius: 10, padding: "3px 8px" }}>{t}</span>)}
                </div>
                {said && <p style={{ fontFamily: DM_SANS, fontSize: 14, lineHeight: 1.5, margin: "0 0 8px", color: INK }}>{typeof said === "string" ? said : JSON.stringify(said)}</p>}
                <details>
                  <summary style={{ fontFamily: DM_SANS, fontSize: 12.5, color: PURPLE, cursor: "pointer" }}>Everything the system saved</summary>
                  <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#334155", margin: "6px 0 0" }}>{JSON.stringify({ coaching: r.coaching_output, issues: r.issues, rep_scores: r.rep_scores }, null, 2)}</pre>
                </details>
              </>
            )}
          </div>

          <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: 13, color: GRAY, margin: "6px 0 6px" }}>Your verdict: is the AI feedback right for this video?</div>
          <div role="radiogroup" aria-label="Verdict" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {VERDICTS.map(([v, label, fg, bg]) => (
              <button key={v} type="button" role="radio" aria-checked={verdict === v} onClick={() => { setVerdict(v); setSaved(false) }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer", fontFamily: DM_SANS, fontWeight: 700, fontSize: 14, border: `2px solid ${verdict === v ? fg : "transparent"}`, background: bg, color: fg }}>{label}</button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => { setNote(e.target.value); setSaved(false) }} rows={3} maxLength={2000} aria-label="Private note" placeholder="Note, for example: counted 8, I see 7"
            style={{ ...cardStyle, width: "100%", boxSizing: "border-box", fontFamily: DM_SANS, fontSize: 14, outline: "none", resize: "none" }} />
          <button type="button" disabled={!verdict || saving || saved} onClick={save} style={{ width: "100%", height: 50, borderRadius: 14, border: "none", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", color: "#fff", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: !verdict || saving || saved ? 0.5 : 1 }}>
            {saving ? "Saving…" : saved ? "Saved" : "Save review"}
          </button>
        </>
      )}
    </div>
  )
}
