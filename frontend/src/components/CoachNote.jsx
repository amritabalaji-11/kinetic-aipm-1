import { useEffect, useId, useRef } from "react"

// The friendly note from the AI coach, in one place so every screen says the same thing in the same voice.
// It is humble on purpose: it is not here to replace a trainer, and it only gives feedback on what it can see clearly.

export const COACH_NOTE = {
  title: "Hi, I'm Kinetic, your AI coach.",
  paragraphs: [
    "I'm not here to replace a personal trainer. A good one knows your body, your history and your diet far better than I do. But a personal trainer isn't within reach for everyone, so I'm doing my best to help.",
    "I use computer vision to analyse your video, so I only see what a camera sees. A real trainer in the room can watch you from every angle and notice things like your breathing. I can't do that, so I only give feedback on what I can see clearly, and I'll stay quiet about the rest.",
    "The more you share with me, like your form and your workout logs, the better I get to know you, and the more personal your coaching gets.",
  ],
}

const GRADIENT = "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)"

// A friendly bot: round face, antenna, a smile. `ring` adds a thin outline for use on white backgrounds.
export function CoachIcon({ size = 36, className = "", ring = false }) {
  const id = "coach" + useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <svg className={className} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0284C7" />
          <stop offset="1" stopColor="#9747FF" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19.5" fill="#fff" stroke={ring ? "#e5e7eb" : "none"} strokeWidth="1" />
      <line x1="20" y1="8.5" x2="20" y2="12" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="7.5" r="2" fill={`url(#${id})`} />
      <rect x="9" y="12" width="22" height="18" rx="7" fill={`url(#${id})`} />
      <rect x="6" y="18" width="3" height="6" rx="1.5" fill={`url(#${id})`} />
      <rect x="31" y="18" width="3" height="6" rx="1.5" fill={`url(#${id})`} />
      <circle cx="15.5" cy="20" r="2.2" fill="#fff" />
      <circle cx="24.5" cy="20" r="2.2" fill="#fff" />
      <path d="M15.5 25c1.2 1.6 2.7 2.3 4.5 2.3s3.3-.7 4.5-2.3" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// The full note as a card. Used on the loading screen, below the stages. The icon floats top right so the text can run the full width.
export function CoachNoteCard() {
  return (
    <div className="rounded-2xl px-4 py-4 text-sm text-white leading-relaxed" style={{ background: GRADIENT }}>
      <CoachIcon size={36} className="float-right ml-3 mb-1" />
      <p className="font-semibold mb-2">{COACH_NOTE.title}</p>
      {COACH_NOTE.paragraphs.map((text, i) => (
        <p key={i} className={i < COACH_NOTE.paragraphs.length - 1 ? "mb-2" : ""}>{text}</p>
      ))}
    </div>
  )
}

// One quiet line under the coach's reminder on the results screen. Tapping it opens the full note.
export function CoachNoteLine({ onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="mx-4 mb-4 flex items-center gap-2 text-left" style={{ maxWidth: "calc(100% - 2rem)" }}>
      <CoachIcon size={22} ring />
      <span className="text-[11.5px] leading-snug text-gray-500">
        I only comment on what I can see clearly. <span className="font-semibold" style={{ color: "#0284C7" }}>Read more</span>
      </span>
    </button>
  )
}

// The full note as a bottom sheet. Closes with "Got it", a tap outside, or Escape.
export function CoachNoteSheet({ open, onClose }) {
  const okRef = useRef(null)
  const closeRef = useRef(onClose)           // the page may re-render while the sheet is open: keep the effect from re-running and stealing focus
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === "Escape") closeRef.current() }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    okRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 80, background: "rgba(15,15,26,0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-note-title"
        className="w-full max-w-sm bg-white overflow-y-auto"
        style={{ borderRadius: "24px 24px 0 0", padding: "22px 22px 28px", maxHeight: "86%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-2.5"><CoachIcon size={48} ring /></div>
        <h2 id="coach-note-title" className="text-base font-bold text-gray-900 text-center mb-2.5">{COACH_NOTE.title}</h2>
        {COACH_NOTE.paragraphs.map((text, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed text-gray-700 mb-2.5">{text}</p>
        ))}
        <button
          ref={okRef}
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: GRADIENT }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
