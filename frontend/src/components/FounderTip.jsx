import { ExternalLink, Play } from "lucide-react"
import ExpandableVideo from "./ExpandableVideo"

// A personal tip on the Home screen. The words are Amrita's own, so they are easy to change here.
const AUTHOR = { initial: "A", name: "Amrita" }
const TITLE = "My 8 min pre-lift ritual"

const VIDEO = {
  id: "LZtggiXUpkc",
  label: "Lymphatic & fascia flow",
  credit: "Move with Erin",
  creditUrl: "https://www.youtube.com/@MoveWithErin",
  watchUrl: "https://www.youtube.com/watch?v=LZtggiXUpkc",
}

const TIP =
  "I start my workouts with warm-ups, followed by this 8 min lymphatic and fascia flow, especially on the days before strength training. It gets blood moving to my legs and warms them up before heavy sets. I've seen great benefits, and it needs no equipment."

const font = "'Bricolage Grotesque'"

// A neutral cover rather than the video's own thumbnail, which carries claims we do not make
const cover = (
  <span style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0F172A 0%, #312E81 55%, #6D28D9 100%)" }}>
    <span style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%, -50%)", width: 56, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Play size={24} color="#4C1D95" fill="#4C1D95" style={{ marginLeft: 3 }} />
    </span>
    <span style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{VIDEO.label}</span>
  </span>
)

export default function FounderTip() {
  return (
    <div style={{ background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)", borderRadius: "8px", padding: "15px", marginBottom: "20px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
        <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontWeight: 700, fontSize: 16 }}>{AUTHOR.initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: font, color: "#000000", margin: 0 }}>{TITLE}</h3>
          <p style={{ fontSize: "12px", fontFamily: "'DM Sans'", color: "#64748B", margin: 0 }}>A tip from {AUTHOR.name}</p>
        </div>
      </div>

      <p style={{ fontSize: "14px", fontFamily: "'DM Sans'", color: "#1E293B", lineHeight: 1.5, margin: "0 0 12px" }}>&ldquo;{TIP}&rdquo;</p>

      <ExpandableVideo youtubeId={VIDEO.id} title={VIDEO.label} cover={cover} />
      <p style={{ fontSize: "11px", fontFamily: "'DM Sans'", color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
        {VIDEO.label}. Video by{" "}
        <a href={VIDEO.creditUrl} target="_blank" rel="noreferrer" style={{ color: "#6D28D9", fontWeight: 600 }}>{VIDEO.credit}</a>
        {" "}on YouTube{" "}
        <a href={VIDEO.watchUrl} target="_blank" rel="noreferrer" aria-label="Watch on YouTube" style={{ color: "#6D28D9" }}><ExternalLink size={11} style={{ display: "inline", verticalAlign: "-1px" }} /></a>
      </p>
    </div>
  )
}
