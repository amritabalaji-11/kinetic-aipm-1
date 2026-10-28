import { useState } from "react"
import { ChevronDown, ExternalLink, Play } from "lucide-react"

// "A tip from the founder" on the Home screen. The words are the founder's own, so they are easy to change here.
const FOUNDER = { initial: "A", name: "Amrita", role: "Founder of Kinetic" }

const VIDEO = {
  id: "LZtggiXUpkc",
  label: "Lymphatic & fascia flow",
  length: "9:24",
  credit: "Move with Erin",
  creditUrl: "https://www.youtube.com/@MoveWithErin",
  watchUrl: "https://www.youtube.com/watch?v=LZtggiXUpkc",
}

const TIP =
  "I do this lymphatic and fascia flow every single day, and I see great benefits. It's gentle, needs no equipment, and I treat it as part of my training, not an extra. Try it as a warm-up, a cool-down, or on a rest day."

// Kept to what the research supports (see SOURCES). No "detox" or fat-loss claims.
const WHY = [
  "Unlike your blood, your lymph has no heart pumping it. Moving your muscles and breathing deeply help keep it flowing.",
  "Exercise is a standard part of care for people with lymphedema (swelling after some cancer treatments), and studies show it is safe and helps symptoms. For everyone else, the research is still thin, so I'd call this a gentle way to move, breathe and loosen up.",
  "It is not a detox. There is no good evidence that it flushes out toxins, so we won't promise that.",
]

const SOURCES = [
  { label: "Cleveland Clinic: Lymphatic drainage massage (medically reviewed 2024)", url: "https://my.clevelandclinic.org/health/treatments/21768-lymphatic-drainage-massage" },
  { label: "The effect of exercise in patients with lower limb lymphedema: a systematic review", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11977414/" },
  { label: "The physiology of thoracic duct pressure and flow: a review of the literature (2025)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12828174/" },
]

const font = "'Bricolage Grotesque'"
const body = { fontSize: "13px", fontFamily: "'DM Sans'", color: "#1E293B", lineHeight: 1.5, margin: 0 }

export default function FounderTip() {
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)", borderRadius: "8px", padding: "15px", marginBottom: "20px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
        <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontWeight: 700, fontSize: 16 }}>{FOUNDER.initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: font, color: "#000000", margin: 0 }}>A tip from the founder</h3>
          <p style={{ fontSize: "12px", fontFamily: "'DM Sans'", color: "#64748B", margin: 0 }}>{FOUNDER.name}, {FOUNDER.role}</p>
        </div>
        <span style={{ padding: "3px 9px", borderRadius: 10, background: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: "#6D28D9", flexShrink: 0 }}>Daily mobility</span>
      </div>

      <p style={{ ...body, fontSize: "14px", marginBottom: 12 }}>&ldquo;{TIP}&rdquo;</p>

      {/* a picture first; the video player only loads when it is tapped */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#0F172A" }}>
        {playing ? (
          <iframe
            title={VIDEO.label}
            src={`https://www.youtube-nocookie.com/embed/${VIDEO.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <button type="button" aria-label={`Play: ${VIDEO.label}`} onClick={() => setPlaying(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", padding: 0, cursor: "pointer", background: "linear-gradient(135deg, #0F172A 0%, #312E81 55%, #6D28D9 100%)" }}>
            {/* a neutral cover rather than the video's own thumbnail, which carries claims we do not make */}
            <span style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%, -50%)", width: 56, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={24} color="#4C1D95" fill="#4C1D95" style={{ marginLeft: 3 }} />
            </span>
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              {VIDEO.label} · {VIDEO.length}
            </span>
          </button>
        )}
      </div>
      <p style={{ ...body, fontSize: "11px", color: "#475569", marginTop: 6 }}>
        {VIDEO.label}, {VIDEO.length}. Video by{" "}
        <a href={VIDEO.creditUrl} target="_blank" rel="noreferrer" style={{ color: "#6D28D9", fontWeight: 600 }}>{VIDEO.credit}</a>
        {" "}on YouTube{" "}
        <a href={VIDEO.watchUrl} target="_blank" rel="noreferrer" aria-label="Watch on YouTube" style={{ color: "#6D28D9" }}><ExternalLink size={11} style={{ display: "inline", verticalAlign: "-1px" }} /></a>
      </p>

      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "10px 0 2px", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1, fontFamily: font, fontWeight: 700, fontSize: 14, color: "#0F172A" }}>Why it&apos;s worth doing</span>
        <ChevronDown size={18} color="#6D28D9" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div style={{ paddingTop: 6 }}>
          <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
            {WHY.map((w, i) => <li key={i} style={{ ...body, marginBottom: 8 }}>{w}</li>)}
          </ul>
          <p style={{ ...body, fontSize: "11px", color: "#475569", margin: "6px 0 8px" }}>
            General information, not medical advice. If you have swelling, a blood clot, an infection, or a heart or kidney condition, check with your doctor before starting.
          </p>
          <p style={{ ...body, fontSize: "11px", fontWeight: 700, color: "#475569", margin: "0 0 2px" }}>Sources</p>
          <ul style={{ margin: 0, paddingLeft: 16, listStyle: "disc" }}>
            {SOURCES.map((s) => (
              <li key={s.url} style={{ ...body, fontSize: "11px", marginBottom: 2 }}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#6D28D9" }}>{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
