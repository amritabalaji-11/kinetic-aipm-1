import { useEffect, useRef } from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { shortSectionName } from "../utils/workoutModel"

const PURPLE = "#8133FF"
const GREEN = "#16A34A"
const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const DM_SANS = "'DM Sans', sans-serif"

const arrow = (off) => ({
  width: 40, height: 40, borderRadius: 20, border: "none", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(129,51,255,0.1)", opacity: off ? 0.35 : 1, cursor: off ? "default" : "pointer",
})

// The top of the logging screen: previous / next, where you are, how much is done, and every section by name.
// `sections` is [{ id, tag, state: "done" | "current" | "todo" }] in workout order.
export default function SectionNav({ sections, viewIndex, onPrev, onNext, onJump, onOpenList }) {
  const done = sections.filter((s) => s.done).length
  const pct = sections.length ? Math.round((done / sections.length) * 100) : 0
  const strip = useRef(null)
  // two sections with the same short name get numbers, e.g. "Warm-up 1" and "Warm-up 2"
  const names = sections.map((x) => shortSectionName(x.tag))
  const label = (i) => (names.filter((n) => n === names[i]).length > 1 ? `${names[i]} ${names.slice(0, i + 1).filter((n) => n === names[i]).length}` : names[i])

  // keep the section being viewed in the middle of the strip
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-current="step"]')
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [viewIndex])

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "10px 12px 12px", boxShadow: "0 2px 10px rgba(80,40,160,0.08)", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" aria-label="Previous section" disabled={viewIndex <= 0} onClick={onPrev} style={arrow(viewIndex <= 0)}><ChevronLeft size={22} color={PURPLE} strokeWidth={2.6} /></button>
        <button type="button" onClick={onOpenList} aria-label="Open the list of sections" style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: 0 }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sections[viewIndex]?.tag}</span>
            <ChevronDown size={16} color={PURPLE} />
          </span>
          <span style={{ fontFamily: DM_SANS, fontSize: 11.5, color: "#64748B" }}>Section {viewIndex + 1} of {sections.length} · {pct}% done</span>
        </button>
        <button type="button" aria-label="Next section" disabled={viewIndex >= sections.length - 1} onClick={onNext} style={arrow(viewIndex >= sections.length - 1)}><ChevronRight size={22} color={PURPLE} strokeWidth={2.6} /></button>
      </div>

      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Workout progress" style={{ height: 6, borderRadius: 3, background: "rgba(129,51,255,0.12)", overflow: "hidden", margin: "10px 0 8px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GREEN}, #22C55E)`, transition: "width 0.3s" }} />
      </div>

      <div ref={strip} style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", margin: "0 -4px", padding: "2px 4px" }}>
        {sections.map((s, i) => {
          const current = i === viewIndex
          return (
            <button
              key={s.id}
              type="button"
              aria-current={current ? "step" : undefined}
              onClick={() => onJump(i)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 4, height: 30, padding: "0 12px", borderRadius: 15, cursor: "pointer",
                fontFamily: DM_SANS, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap",
                color: current ? "#fff" : s.done ? "#15803D" : "#64748B",
                background: current ? GRADIENT : s.done ? "rgba(34,197,94,0.14)" : "rgba(100,116,139,0.1)",
                border: current ? "none" : s.done ? "1px solid rgba(34,197,94,0.4)" : "1px solid transparent",
              }}
            >
              {s.done && <Check size={12} strokeWidth={3.2} />}
              {label(i)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
