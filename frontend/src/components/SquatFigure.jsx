import { useEffect, useRef, useState } from "react"

// A person doing a goblet squat, seen from the side, drawn from joint positions so the movement is smooth and natural.
// `skeleton` draws it the way Kinetic sees it (joint dots and the knee angle); otherwise it is a soft filled figure.
// It stands still when the phone is set to reduce motion.

const SHIN = 64, THIGH = 66, TORSO = 78, ARM_UP = 34, ARM_LOW = 32, HEAD = 13
const rad = (d) => (d * Math.PI) / 180

// s = 0 standing, 1 = at the bottom of the squat
function joints(s) {
  const ankle = { x: 0, y: 0 }
  const shinLean = rad(2 + 24 * s)      // the shin tips forward
  const thighAngle = rad(2 + 76 * s)    // the thigh swings back until it is nearly level
  const torsoLean = rad(2 + 32 * s)     // the chest leans a little
  const knee = { x: ankle.x + SHIN * Math.sin(shinLean), y: ankle.y - SHIN * Math.cos(shinLean) }
  const hip = { x: knee.x - THIGH * Math.sin(thighAngle), y: knee.y - THIGH * Math.cos(thighAngle) }
  const shoulder = { x: hip.x + TORSO * Math.sin(torsoLean), y: hip.y - TORSO * Math.cos(torsoLean) }
  const head = { x: shoulder.x + (HEAD + 8) * Math.sin(torsoLean), y: shoulder.y - (HEAD + 8) * Math.cos(torsoLean) }
  // goblet hold: elbows down, hands together at the chest
  const elbow = { x: shoulder.x + 8 + 6 * s, y: shoulder.y + ARM_UP - 2 }
  const hand = { x: shoulder.x + ARM_LOW * 0.75, y: shoulder.y + ARM_UP * 0.35 }
  const toe = { x: ankle.x + 26, y: 0 }
  return { ankle, knee, hip, shoulder, head, elbow, hand, toe }
}

export default function SquatFigure({ skeleton = false, size = 260, seconds = 3.6 }) {
  const [s, setS] = useState(0)
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)

  useEffect(() => {
    if (reduced.current) { setS(0.55); return undefined }
    let raf, start
    const tick = (now) => {
      start ??= now
      const t = ((now - start) / 1000 / seconds) % 1
      setS((1 - Math.cos(t * 2 * Math.PI)) / 2) // slow down at the top and the bottom, like a real rep
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seconds])

  const j = joints(s)
  const p = (pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  const limb = (...pts) => `M ${pts.map(p).join(" L ")}`
  const stroke = skeleton ? 2.2 : 12

  return (
    <svg width={size} height={Math.round((size * 270) / 220)} viewBox="-90 -250 220 270" role="img" aria-label="A person doing a goblet squat" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="fig-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0284C7" /><stop offset="100%" stopColor="#9747FF" /></linearGradient>
      </defs>
      <ellipse cx="14" cy="4" rx="70" ry="6" fill={skeleton ? "rgba(255,255,255,0.12)" : "rgba(129,51,255,0.12)"} />
      {skeleton ? (
        <>
          <path d={limb(j.toe, j.ankle, j.knee, j.hip, j.shoulder)} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d={limb(j.shoulder, j.elbow, j.hand)} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <circle cx={j.head.x} cy={j.head.y} r={HEAD} fill="none" stroke="#fff" strokeWidth={stroke} opacity="0.9" />
          {[j.ankle, j.knee, j.hip, j.shoulder, j.elbow, j.hand].map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="4.5" fill="#34D399" stroke="#064E3B" strokeWidth="1" />)}
          <text x={j.knee.x + 12} y={j.knee.y + 4} fill="#34D399" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="700">knee</text>
        </>
      ) : (
        <>
          <path d={limb(j.toe, j.ankle)} fill="none" stroke="url(#fig-grad)" strokeWidth={9} strokeLinecap="round" />
          <path d={limb(j.ankle, j.knee, j.hip)} fill="none" stroke="url(#fig-grad)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
          <path d={limb(j.hip, j.shoulder)} fill="none" stroke="url(#fig-grad)" strokeWidth={stroke + 6} strokeLinecap="round" />
          <circle cx={j.head.x} cy={j.head.y} r={HEAD} fill="url(#fig-grad)" />
          <path d={limb(j.shoulder, j.elbow, j.hand)} fill="none" stroke="url(#fig-grad)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          <circle cx={j.hand.x + 1} cy={j.hand.y} r="9" fill="#312E81" />
        </>
      )}
    </svg>
  )
}
