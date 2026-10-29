// Pieces of the Plan screen: suggestion card, plan cards, shelves, filter sheet and plan preview.
import { ChevronRight, RefreshCw } from "lucide-react"
import { BottomSheet, Chip, FilterLabel, GradientButton, BRICOLAGE, DM_SANS, GRADIENT, GRAY, INK, PURPLE, cardStyle } from "./planUi"
import { EQUIPMENT, GOALS, STYLES, TIMES, WORKOUT_TYPES, planProfile, workoutType } from "../utils/planProfile"
import { TypeBadge, TypePill } from "./WorkoutTypeUi"

const minutesText = (plan) => `about ${plan.minutes} min`

// One line that says what the plan is for and how long it takes, e.g. "Build muscle · about 55 min"
const headline = (plan) => `${GOALS[planProfile(plan).goal].short} · ${minutesText(plan)}`

// Second line: the style and typical reps, e.g. "Big lifts · 10-12 reps"
function styleLine(plan) {
  const p = planProfile(plan)
  return p.reps ? `${STYLES[p.style].label} · ${p.reps} reps` : STYLES[p.style].label
}

// ---------- suggestion ("Suggested for you") ----------
export function HeroCard({ suggestion, onStart, onDetails, onNext, canCycle }) {
  if (!suggestion) return null
  const { plan, reason } = suggestion
  return (
    <div style={{ borderRadius: 20, padding: 18, background: "linear-gradient(100deg, #0284C7 0%, #5E45E8 55%, #7A2CE0 100%)", border: "1.5px solid rgba(255,255,255,0.85)", color: "#fff", boxShadow: "0px 12px 28px rgba(76,29,149,0.38)" }}>
      <div style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.85 }}>SUGGESTED FOR YOU</div>
      <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 22, lineHeight: 1.2, margin: "6px 0 4px" }}>{plan.title}</div>
      <div style={{ fontFamily: DM_SANS, fontSize: 13, opacity: 0.95 }}>{headline(plan)} · {styleLine(plan)}</div>
      <div style={{ display: "inline-block", marginTop: 10, padding: "5px 10px", borderRadius: 10, background: "rgba(255,255,255,0.2)", fontFamily: DM_SANS, fontSize: 12, fontWeight: 600 }}>
        {reason}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <button type="button" onClick={onStart} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", background: "#fff", color: PURPLE, fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Let&apos;s go
        </button>
        <button type="button" onClick={onDetails} style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.6)", background: "transparent", color: "#fff", fontFamily: DM_SANS, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          What’s inside
        </button>
      </div>
      {canCycle && (
        <button type="button" onClick={onNext} style={{ marginTop: 10, padding: 0, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#fff", fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: 0.95 }}>
          <RefreshCw size={14} /> Not this one
        </button>
      )}
    </div>
  )
}

// ---------- plan card (list row, or narrower card inside a shelf) ----------
export function PlanCard({ plan, onOpen, lastDone, shelf = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        ...(shelf ? { width: 312, flexShrink: 0, scrollSnapAlign: "start" } : { width: "100%" }),
        display: "flex", alignItems: "center", gap: 12, padding: 12, textAlign: "left", cursor: "pointer",
        border: "1px solid transparent", borderRadius: 14,
        background: "linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(135deg, rgba(2,132,199,0.5), rgba(151,71,255,0.5)) border-box",
        boxShadow: "0px 4px 14px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ position: "relative", width: 48, height: 58, flexShrink: 0, borderRadius: 10, background: "rgba(129,51,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={plan.image} alt="" style={{ maxWidth: 38, maxHeight: 48, objectFit: "contain" }} />
        <TypeBadge plan={plan} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {plan.title}
        </div>
        <div style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: PURPLE, marginTop: 3 }}>{headline(plan)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <TypePill plan={plan} />
          <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{styleLine(plan)}</span>
        </div>
        {lastDone && <div style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY, marginTop: 3, opacity: 0.85 }}>{lastDone}</div>}
      </div>
      <ChevronRight size={18} color={PURPLE} style={{ flexShrink: 0 }} />
    </button>
  )
}

// ---------- shelf: a titled row you swipe sideways ----------
export function Shelf({ title, subtitle, plans, onOpen, onSeeAll, lastDoneOf }) {
  if (!plans.length) return null
  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 4, height: 18, borderRadius: 2, background: GRADIENT }} />
          <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 17, color: INK }}>{title}</span>
          {subtitle && <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{subtitle}</span>}
        </div>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} style={{ padding: 0, background: "none", border: "none", color: "#6A1FD6", fontFamily: DM_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            See all
          </button>
        )}
      </div>
      {/* the last card sticks out past the edge, so it's clear the row scrolls */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", scrollPaddingLeft: 24, scrollbarWidth: "none", margin: "0 -24px", padding: "2px 24px 8px" }}>
        {plans.slice(0, 6).map((p) => (
          <PlanCard key={p.id} plan={p} shelf onOpen={() => onOpen(p)} lastDone={lastDoneOf(p)} />
        ))}
      </div>
    </section>
  )
}

// ---------- filter sheet ----------
function Group({ title, options, value, onChange }) {
  return (
    <>
      <FilterLabel>{title}</FilterLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(options).map(([key, o]) => (
          <Chip key={key} label={o.sub ? `${o.label} · ${o.sub}` : o.label} active={value === key} onClick={() => onChange(value === key ? null : key)} />
        ))}
      </div>
    </>
  )
}

export function FilterSheet({ filters, onChange, onClear, resultCount, onClose }) {
  const goals = Object.fromEntries(Object.entries(GOALS).map(([k, g]) => [k, { label: g.label }]))
  return (
    <BottomSheet
      title="Filters"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <GradientButton onClick={onClose}>{resultCount === 0 ? "No workouts match" : `Show ${resultCount} workout${resultCount === 1 ? "" : "s"}`}</GradientButton>
          <button type="button" onClick={onClear} style={{ padding: 8, background: "none", border: "none", color: GRAY, fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Clear filters
          </button>
        </div>
      }
    >
      <Group title="HOW LONG" options={TIMES} value={filters.time} onChange={(v) => onChange({ ...filters, time: v })} />
      <Group title="WHAT FOR" options={goals} value={filters.goal} onChange={(v) => onChange({ ...filters, goal: v })} />
      <Group title="EQUIPMENT" options={EQUIPMENT} value={filters.equip} onChange={(v) => onChange({ ...filters, equip: v })} />
    </BottomSheet>
  )
}

// ---------- plan preview ----------
function Row({ label, value, hint }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid rgba(100,116,139,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY }}>{label}</span>
        <span style={{ fontFamily: DM_SANS, fontSize: 14, fontWeight: 600, color: INK, textAlign: "right" }}>{value}</span>
      </div>
      {hint && <div style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, marginTop: 2, lineHeight: 1.35 }}>{hint}</div>}
    </div>
  )
}

const SECTION_TITLE = { warmup: "Warm-up", workout: "Workout", conditioning: "Finisher" }

export function PreviewSheet({ plan, lastDone, onStart, onClose }) {
  const p = planProfile(plan)
  const goal = GOALS[p.goal]
  const style = STYLES[p.style]
  // names per section, rests left out; the warm-up is just a count to keep the sheet short
  const sections = ["warmup", "workout", "conditioning"].map((sec) => {
    const names = plan.blocks.filter((b) => b.section === sec).flatMap((b) => b.items).filter((i) => !i.rest).map((i) => i.name)
    return { sec, names }
  }).filter((s) => s.names.length)

  return (
    <BottomSheet title={plan.title} onClose={onClose} footer={<GradientButton onClick={onStart}>View &amp; customise</GradientButton>}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", flexWrap: "wrap" }}>
        <TypePill plan={plan} size={12} />
        <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY }}>{WORKOUT_TYPES[workoutType(plan)].snippet}</span>
      </div>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: INK, margin: "0 0 8px", lineHeight: 1.4 }}>{plan.blurb}</p>
      <div style={cardStyle}>
        <Row label="Goal" value={goal.label} hint={goal.hint} />
        <Row label="Style" value={style.label} hint={style.hint} />
        <Row label="Time" value={`${minutesText(plan)} · ${TIMES[p.time].label}`} />
        {p.reps && <Row label="Reps" value={p.reps} />}
        {p.rest && <Row label="Rest" value={`${p.rest.text} between rounds`} />}
        <Row label="Equipment" value={p.equipmentText} />
      </div>
      {lastDone && <p style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, margin: "10px 2px 0" }}>{lastDone}</p>}

      <FilterLabel>WHAT’S INSIDE</FilterLabel>
      <div style={cardStyle}>
        {sections.map((s) => (
          <div key={s.sec} style={{ padding: "9px 0", borderBottom: "1px solid rgba(100,116,139,0.12)" }}>
            <div style={{ fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: PURPLE }}>{SECTION_TITLE[s.sec].toUpperCase()}</div>
            <div style={{ fontFamily: DM_SANS, fontSize: 13, color: INK, marginTop: 2, lineHeight: 1.4 }}>
              {s.sec === "warmup" ? `${s.names.length} mobility and warm-up moves` : s.names.join(" · ")}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

