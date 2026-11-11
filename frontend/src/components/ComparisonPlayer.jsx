import { useEffect, useMemo, useRef, useState } from "react"

// "How it was" next to "how it is now": the user's own video, played twice side by side, each copy on its own rep.
// Nothing is rendered on the server. The backend only says which reps and when they start and end (see services/comparison.py).
//
// A small clock drives both copies so they stay in step:
//   pair   both copies play at normal speed from their own rep's start.
//   slow   the right copy is the same rep with its lowering slowed to a 2-second count ("how to correct", using your own movement).
//   single one picture, the rep that shows the point.
// At the bottom of a rep (the moment the issue shows) an arrow and a short label appear on the body part, when there is one to point at.

const PAUSE_S = 0.9          // a beat at the end of each loop
const HOLD_S = 1.6           // both copies freeze at the bottom of the rep so the two positions can be compared
const ARROW_WIN_MAX = 0.2    // the arrow shows during the freeze; this is only a short lead-in either side

function bottomOf(panel) {
  return Math.min(Math.max(panel.bottom_s, panel.start_s), panel.end_s)
}

// lead = how long this copy waits (frozen on its first frame) so that, in a pair, both reach the bottom together
function buildPanel(panel, slow, lead = 0) {
  if (!panel) return null
  const start = panel.start_s
  const end = panel.end_s
  const bottom = bottomOf(panel)
  const wait = lead > 0.05 ? [{ real: lead, from: start, rate: 0 }] : []
  const hold = { real: HOLD_S, from: bottom, rate: 0 }
  const rest = { real: Math.max(0.05, end - bottom), from: bottom, rate: 1 }
  if (!slow) return { ...panel, bottom, segs: [...wait, { real: Math.max(0.05, bottom - start), from: start, rate: 1 }, hold, rest] }
  // lowering stretched to the target time, then the freeze, then the rest at normal speed
  const lowering = Math.max(0.05, bottom - start)
  const target = Math.max(lowering, slow.target_s)
  return { ...panel, bottom, segs: [{ real: target, from: start, rate: lowering / target }, hold, rest] }
}

function mediaAt(panel, t) {
  let left = t
  for (const s of panel.segs) {
    if (left <= s.real) return { time: s.from + left * s.rate, rate: s.rate, done: false }
    left -= s.real
  }
  const last = panel.segs[panel.segs.length - 1]
  return { time: last.from + last.real * last.rate, rate: 1, done: true }
}

function realLength(panel) {
  return panel.segs.reduce((a, s) => a + s.real, 0)
}

function Arrow({ arrow, label, show }) {
  if (!arrow || !label) return null
  const tip = { x: arrow.x, y: arrow.y }
  const tail = { x: Math.min(0.92, Math.max(0.08, tip.x + arrow.back * 0.22)), y: Math.min(0.92, Math.max(0.08, tip.y - 0.1)) }
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: show ? 1 : 0, transition: "opacity 160ms" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <marker id="ah" markerWidth="5" markerHeight="5" refX="3.2" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="#FF9600" stroke="#fff" strokeWidth="0.6" />
          </marker>
        </defs>
        <line x1={tail.x * 100} y1={tail.y * 100} x2={tip.x * 100} y2={tip.y * 100} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <line x1={tail.x * 100} y1={tail.y * 100} x2={tip.x * 100} y2={tip.y * 100} stroke="#FF9600" strokeWidth="1.4" strokeLinecap="round" markerEnd="url(#ah)" />
      </svg>
      <span
        className="absolute text-[10px] font-bold text-white px-2 py-0.5 rounded-md whitespace-nowrap"
        style={{ background: "#FF9600", left: `${Math.min(0.74, Math.max(0.26, tail.x)) * 100}%`, top: `${tail.y * 100}%`, transform: "translate(-50%, -125%)" }}
      >
        {label}
      </span>
    </div>
  )
}

// Defined at the top level (not inside the player) so React keeps the same <video> elements between frames.
function Panel({ vref, videoSrc, aspect, panel, caption, time, label, win, countText }) {
  const show = panel && Math.abs(time - panel.bottom) <= win
  return (
    <div className="relative flex-1 min-w-0 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: String(aspect) }}>
      <video ref={vref} src={videoSrc} muted playsInline preload="auto" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
      <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "rgba(15,15,26,0.72)" }}>{caption}</span>
      <Arrow arrow={panel?.arrow} label={label} show={show} />
      {countText && (
        <span className="absolute left-1/2 -translate-x-1/2 text-white font-extrabold text-3xl" style={{ bottom: "18%", textShadow: "0 2px 8px rgba(0,0,0,.6)" }} data-count="1">{countText}</span>
      )}
    </div>
  )
}

export default function ComparisonPlayer({ comparison, videoSrc, note, onFail }) {
  const slow = comparison.mode === "slow" ? comparison.slow : null
  const pairLead = (a, b) => (comparison.mode === "pair" && a && b ? Math.max(0, (bottomOf(b) - b.start_s) - (bottomOf(a) - a.start_s)) : 0)
  const left = useMemo(() => buildPanel(comparison.left, null, pairLead(comparison.left, comparison.right)), [comparison])
  const right = useMemo(() => (comparison.mode === "pair" || comparison.mode === "slow" ? buildPanel(comparison.right, slow, pairLead(comparison.right, comparison.left)) : null), [comparison, slow])
  const total = useMemo(() => Math.max(realLength(left), right ? realLength(right) : 0) + PAUSE_S, [left, right])

  const vL = useRef(null)
  const vR = useRef(null)
  const clock = useRef({ t0: 0, running: false })
  const [playing, setPlaying] = useState(true)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState({ l: 0, r: 0, t: 0 })
  const [aspect, setAspect] = useState(9 / 16)

  // wait until both copies know their size
  useEffect(() => {
    const vids = [vL.current, vR.current].filter(Boolean)
    const check = () => {
      if (vids.every((v) => v.readyState >= 2)) {
        if (vids[0].videoWidth && vids[0].videoHeight) setAspect(vids[0].videoWidth / vids[0].videoHeight)
        setReady(true)
      }
    }
    vids.forEach((v) => { v.muted = true; v.addEventListener("loadeddata", check); v.addEventListener("error", () => { console.warn("COMPARE_VIDEO_ERROR", v.error && v.error.code, v.error && v.error.message); onFail?.() }) })
    check()
    return () => vids.forEach((v) => v.removeEventListener("loadeddata", check))
  }, [videoSrc, comparison])

  // the clock
  useEffect(() => {
    if (!ready || !playing) { [vL.current, vR.current].forEach((v) => v && v.pause()); return }
    let raf
    clock.current = { t0: performance.now(), running: true }
    const restart = () => {
      clock.current.t0 = performance.now()
      if (vL.current) vL.current.currentTime = left.segs[0].from
      if (vR.current && right) vR.current.currentTime = right.segs[0].from
    }
    restart()
    const tick = () => {
      let t = (performance.now() - clock.current.t0) / 1000
      if (t > total) { restart(); t = 0 }
      const drive = (v, panel) => {
        if (!v || !panel) return 0
        const m = mediaAt(panel, t)
        if (m.done || m.rate === 0) { v.pause(); if (Math.abs(v.currentTime - m.time) > 0.04) v.currentTime = m.time; return m.time }
        const rate = Math.min(16, Math.max(0.0625, m.rate))
        if (v.playbackRate !== rate) v.playbackRate = rate
        if (Math.abs(v.currentTime - m.time) > 0.25) v.currentTime = m.time
        if (v.paused) v.play().catch(() => {})
        return m.time
      }
      const l = drive(vL.current, left)
      const r = drive(vR.current, right)
      // redraw about 15 times a second: the arrow and the count only need that
      setNow((prev) => (Math.abs(prev.l - l) < 0.06 && Math.abs(prev.r - r) < 0.06 && Math.floor(prev.t) === Math.floor(t) ? prev : { l, r, t }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); [vL.current, vR.current].forEach((v) => v && v.pause()) }
  }, [ready, playing, total, left, right])

  const win = Math.min(comparison.arrow_window_s || 0.4, ARROW_WIN_MAX)
  const label = comparison.arrow_label
  const countText = slow && right && now.t < right.segs[0].real ? String(Math.min(slow.target_s, Math.floor(now.t) + 1)) : null

  return (
    <div className="relative p-2" style={{ background: "#0f0f1a" }} onClick={() => setPlaying((p) => !p)}>
      <div className="flex gap-2">
        <Panel vref={vL} videoSrc={videoSrc} aspect={aspect} panel={left} caption={comparison.label_left} time={now.l} label={label} win={win} />
        {right && <Panel vref={vR} videoSrc={videoSrc} aspect={aspect} panel={right} caption={comparison.label_right} time={now.r} label={label} win={win} countText={countText} />}
      </div>
      {note && note.title && (
        <div className="px-2 pt-2 pb-1">
          <div className="text-white text-sm font-bold leading-snug">{note.title}</div>
          {note.why && <div className="text-xs leading-snug" style={{ color: "#d1d5db" }}>{note.why}</div>}
        </div>
      )}
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">Loading your video…</div>}
      {ready && !playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#14b8a6", boxShadow: "0 0 0 6px rgba(20,184,166,0.25)" }}>
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
    </div>
  )
}
