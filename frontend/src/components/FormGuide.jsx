import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { getGuidance, guidanceToSpeech } from "../data/exerciseGuidance"
import ListenButton from "./ListenButton"

const heading = {
  fontSize: "12px",
  fontWeight: 600,
  fontFamily: "'DM Sans'",
  color: "#6C5CE7",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "14px 0 6px 0",
}
const body = { fontSize: "13px", fontFamily: "'DM Sans'", color: "#0F172A", lineHeight: 1.5 }

// "Before you start" card shown at the top of an exercise, above the sets.
// Open by default until the first set is done, then it folds away but stays one tap away.
export default function FormGuide({ exerciseId, name, startOpen }) {
  const [open, setOpen] = useState(startOpen)
  const g = getGuidance(exerciseId)

  return (
    <div style={{ background: "#FCF9FF", border: "1px solid #A36CFB", borderRadius: "8px", marginBottom: "16px" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "12px 14px", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#8133FF" }}>
          Before you start: form guide
        </span>
        <ChevronDown size={20} color="#8133FF"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px 14px" }}>
          <p style={{ ...body, margin: "0 0 10px 0" }}>{g.summary}</p>
          <ListenButton variant="light" text={guidanceToSpeech(name, g)} />

          <p style={heading}>Setup</p>
          <ol style={{ ...body, margin: 0, paddingLeft: "18px" }}>
            {g.setup.map((step, i) => <li key={i} style={{ marginBottom: "4px" }}>{step}</li>)}
          </ol>

          <p style={heading}>Key cues</p>
          <ul style={{ ...body, margin: 0, paddingLeft: "18px" }}>
            {g.cues.map((cue, i) => <li key={i} style={{ marginBottom: "4px" }}>{cue}</li>)}
          </ul>

          {g.mistakes.length > 0 && (
            <>
              <p style={heading}>Common mistakes</p>
              {g.mistakes.map((m, i) => (
                <p key={i} style={{ ...body, margin: "0 0 6px 0" }}>
                  <strong>{m.mistake}.</strong> {m.fix}
                </p>
              ))}
            </>
          )}

          {g.warmup.length > 0 && (
            <>
              <p style={heading}>Warm-up (before your first set)</p>
              {g.warmup.map((w, i) => (
                <p key={i} style={{ ...body, margin: "0 0 4px 0" }}>
                  {w.drill} <span style={{ color: "#454850" }}>— {w.dose}</span>
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
