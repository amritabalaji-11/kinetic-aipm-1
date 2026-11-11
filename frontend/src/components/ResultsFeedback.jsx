import { useState } from "react"
import ListenButton from "./ListenButton"
import ComparisonPlayer from "./ComparisonPlayer"
import { spoken } from "../utils/feedbackItems"

// The pieces of the new results screen. Plain language, no scores. Each section can be read aloud.

function SectionHead({ title, speak }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase">{title}</h2>
      {speak ? <ListenButton text={speak} variant="teal" coach /> : null}
    </div>
  )
}

const CARD = { background: "#fff", border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }

// The picture at the top: the user's own frame, shown whole. "Watch the set" swaps it for their video.
export function ResultsPhoto({ imageSrc, fallbackImageSrc, videoSrc, comparison, note, startWithVideo = false, caption, onEnlarge, fallback }) {
  const [watching, setWatching] = useState(startWithVideo)
  const [compareFailed, setCompareFailed] = useState(false)
  const showCompare = !!comparison && !!videoSrc && !watching && !compareFailed
  // If the picture can't load, try the backup one, then show the placeholder instead of a broken-image icon.
  // The count of failed attempts belongs to one picture address: a new address (the page re-fetches and gets a fresh
  // signed link) starts again from the first source.
  const sources = [imageSrc, fallbackImageSrc].filter(Boolean)
  const [attempt, setAttempt] = useState({ for: imageSrc, n: 0 })
  const tried = attempt.for === imageSrc ? attempt.n : 0
  const shown = sources[tried] || null
  const showVideo = watching && videoSrc

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ background: "#0f0f1a" }}>
      {showCompare ? (
        <ComparisonPlayer comparison={comparison} videoSrc={videoSrc} note={note} onFail={() => setCompareFailed(true)} />
      ) : showVideo ? (
        <video src={videoSrc} controls autoPlay playsInline className="w-full" style={{ display: "block", maxHeight: 460, background: "#000" }} />
      ) : shown ? (
        <img
          key={shown}
          src={shown}
          alt="Your set"
          onError={() => setAttempt({ for: imageSrc, n: tried + 1 })}
          onClick={() => onEnlarge?.(shown)}
          className="w-full cursor-pointer"
          style={{ display: "block", maxHeight: 460, objectFit: "contain", background: "#0f0f1a" }}
        />
      ) : (
        fallback
      )}

      {caption && !showVideo && !showCompare && shown && (
        <span className="absolute bottom-3 left-3 text-[11px] font-bold text-white px-3 py-1.5 rounded-full" style={{ background: "rgba(15,15,26,0.7)" }}>
          {caption}
        </span>
      )}

      {videoSrc && (shown || showCompare) && (
        <button
          type="button"
          onClick={() => setWatching((w) => !w)}
          className="absolute bottom-3 right-3 text-[11px] font-bold text-white px-3 py-1.5 rounded-full"
          style={{ background: "rgba(20,184,166,0.95)" }}
        >
          {showVideo ? (comparison && !compareFailed ? "Back to the comparison" : "Show the picture") : "▶ Watch the whole set"}
        </button>
      )}
    </div>
  )
}

// One dot per rep, filled where the item happened. No numbers: the shape shows when in the set it showed up.
function Dots({ flagged, total, color, showAxis = false }) {
  if (!Array.isArray(flagged) || !total || total < 2) return null
  const on = new Set(flagged)
  const size = total > 16 ? 8 : 12
  const gap = total > 16 ? 3 : 4
  return (
    <div className="mt-2" role="img" aria-label={`Happened on ${flagged.length} of ${total} reps`}>
      <div className="flex flex-wrap" style={{ gap }}>
        {Array.from({ length: total }, (_, i) => {
          const hit = on.has(i + 1)
          return <span key={i} style={{ width: size, height: size, borderRadius: size / 2, display: "block", boxSizing: "border-box", border: `1.5px solid ${hit ? color : "#d1d5db"}`, background: hit ? color : "#fff" }} />
        })}
      </div>
      {showAxis && (
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5" style={{ width: total * (size + gap) - gap }}>
          <span>start</span><span>end of set</span>
        </div>
      )}
    </div>
  )
}

function Item({ tone, title, detail, children, tag }) {
  const good = tone === "good"
  const focus = tone === "focus"
  return (
    <div
      className="rounded-2xl px-3 py-3 mb-2 flex gap-3 text-sm"
      style={{
        ...CARD,
        borderLeft: `4px solid ${good ? "#22C55E" : "#F97316"}`,
        ...(focus ? { background: "#fff7ed", border: "1px solid #fed7aa", borderLeft: "4px solid #F97316" } : {}),
      }}
    >
      <span className="text-base leading-tight">{good ? "✅" : focus ? "🎯" : "⚠️"}</span>
      <div className="flex-1 min-w-0">
        {tag && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1" style={{ background: "#ffedd5", color: "#c2410c" }}>
            {tag}
          </span>
        )}
        <div className="text-gray-900 font-medium leading-snug">{title}</div>
        {detail ? <div className="text-xs text-gray-500 mt-1 leading-snug">{detail}</div> : null}
        {children}
      </div>
    </div>
  )
}

export function WentWell({ items, repTotal }) {
  if (!items.length) return null
  const anyDots = items.some((i) => Array.isArray(i.flagged))
  return (
    <div className="mx-4 mb-4">
      <SectionHead title="What went well" speak={spoken.good(items)} />
      {items.map((it) => (
        <Item key={it.key} tone="good" title={it.title} detail={it.detail}>
          <Dots flagged={it.flagged} total={repTotal} color="#22C55E" />
        </Item>
      ))}
      {anyDots && repTotal >= 2 && <p className="text-[10.5px] text-gray-400 mt-1 px-0.5">Each dot is one rep, in order. Filled means it happened on that rep.</p>}
    </div>
  )
}

export function WorkOn({ items, repTotal }) {
  if (!items.length) return null
  return (
    <div className="mx-4 mb-4">
      <SectionHead title="Work on" speak={spoken.work(items)} />
      {items.map((it, i) => (
        <Item key={it.key} tone={i === 0 ? "focus" : "fix"} title={it.title} detail={it.detail} tag={i === 0 ? "FOCUS NEXT SET" : null}>
          {it.why && <div className="mt-1.5 text-xs text-gray-500 leading-snug">{it.why}</div>}
          <Dots flagged={it.flagged} total={repTotal} color="#F97316" showAxis={i === 0} />
          {it.cue && (
            <div className="mt-2 text-xs rounded-xl px-3 py-2 leading-snug" style={{ background: "#eff6ff", borderLeft: "3px solid #60a5fa", color: "#1e3a8a" }}>
              {it.cue}
            </div>
          )}
        </Item>
      ))}
    </div>
  )
}

export function TryNext({ item }) {
  if (!item) return null
  return (
    <div className="mx-4 mb-4">
      <SectionHead title="Try next" speak={spoken.tryNext(item)} />
      <div className="rounded-2xl px-3 py-3 text-sm" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderLeft: "4px solid #60a5fa" }}>
        <div className="text-gray-900 font-medium leading-snug">{item.title}</div>
        {item.why && <div className="mt-1.5 text-xs text-gray-500 leading-snug">{item.why}</div>}
        {item.cue && <div className="mt-2 text-xs leading-snug" style={{ color: "#1e3a8a" }}>{item.cue}</div>}
      </div>
    </div>
  )
}

export function GreatBanner() {
  return (
    <div className="mx-4 mb-4 rounded-2xl p-4 text-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
      <div className="text-lg font-bold" style={{ color: "#166534" }}>🎉 You did great!</div>
      <p className="text-xs mt-1" style={{ color: "#15803d" }}>Nothing to fix this set.</p>
    </div>
  )
}

export function WeightNudge() {
  return (
    <div className="mx-4 mb-4 rounded-2xl px-4 py-3 text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #0284C7 0%, #9747FF 100%)" }}>
      That looked comfortable. Ready for the next weight?
    </div>
  )
}

export function CoachReminder({ lines }) {
  if (!lines?.length) return null
  return (
    <div className="mx-4 mb-4">
      <div className="rounded-2xl px-4 py-3" style={{ background: "#f0fdfa", border: "1px solid #ccfbf1" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-extrabold tracking-wide uppercase" style={{ color: "#115e59" }}>Coach’s reminder</span>
          <ListenButton text={spoken.reminder(lines)} variant="teal" coach />
        </div>
        {lines.map((l, i) => <p key={i} className="text-xs leading-snug mt-1" style={{ color: "#115e59" }}>{l}</p>)}
      </div>
    </div>
  )
}

// How long each rep took to lower, in seconds. Plain bars, no grades. The shaded band is a controlled pace (draft: 2 to 4 s).
export function RepTempoChart({ reps = [] }) {
  const times = reps.map((r) => r?.tempo?.eccentric)
  const have = times.filter((t) => typeof t === "number" && t > 0)
  if (have.length < 3) return null
  const top = Math.max(5, Math.ceil(Math.max(...have)))
  const pct = (t) => Math.min(100, (t / top) * 100)
  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl p-4" style={CARD}>
      <h2 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase">Rep by rep</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3 leading-snug">How long each rep took to lower. The shaded band is a controlled pace.</p>
      <div className="relative" style={{ height: 110 }}>
        <div className="absolute left-0 right-0 rounded" style={{ bottom: `${pct(2)}%`, height: `${pct(4) - pct(2)}%`, background: "#ccfbf1" }} />
        <div className="absolute inset-0 flex items-end gap-1">
          {times.map((t, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              {typeof t === "number" && t > 0 ? (
                <div className="w-full rounded-t" style={{ height: `${Math.max(3, pct(t))}%`, background: "#14b8a6", position: "relative" }} />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1 mt-1">
        {times.map((t, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-gray-400">{i + 1}</div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>Rep</span><span>Axis: 0 to {top} seconds</span></div>
    </div>
  )
}
