// The Kinetic logo animation from the splash screen: the four corners breathe in and out, the K fills from the bottom, a green scanner line
// sweeps down and back, and the glow pulses. It loops. Scaled down with `scale`. It stands still (K filled) when the phone is set to reduce motion.
const CSS = `
@keyframes kmCorner{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--cx),var(--cy)) scale(.85)}}
@keyframes kmFill{0%{clip-path:inset(100% 0 0 0)}70%,100%{clip-path:inset(0 0 0 0)}}
@keyframes kmScan{0%{top:0;opacity:0}10%{opacity:.8}50%{top:250px;opacity:.8}90%{opacity:.8}100%{top:0;opacity:0}}
@keyframes kmGlow{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
@media (prefers-reduced-motion: reduce){.km-a{animation:none!important}.km-fill{clip-path:inset(0 0 0 0)!important}}`

function Corner({ pos, color }) {
  const thick = 7, size = 36, radius = 5
  const edge = `${thick}px solid ${color}`
  // each corner moves toward the middle by the same amount, so all four sides stay equal
  const toward = { tl: ["12px", "12px"], tr: ["-12px", "12px"], bl: ["12px", "-12px"], br: ["-12px", "-12px"] }[pos]
  const place = {
    tl: { top: 0, left: 0, borderTop: edge, borderLeft: edge, borderTopLeftRadius: radius },
    tr: { top: 0, right: 0, borderTop: edge, borderRight: edge, borderTopRightRadius: radius },
    bl: { bottom: 0, left: 0, borderBottom: edge, borderLeft: edge, borderBottomLeftRadius: radius },
    br: { bottom: 0, right: 0, borderBottom: edge, borderRight: edge, borderBottomRightRadius: radius },
  }
  return <div className="km-a" style={{ position: "absolute", width: size, height: size, transformOrigin: "center", animation: "kmCorner 2.5s ease-in-out infinite", "--cx": toward[0], "--cy": toward[1], ...place[pos] }} />
}

const K_TEXT = { x: 8, y: 118, fontSize: 118, fontWeight: 900, fontFamily: "Arial Black, Impact, sans-serif" }

export default function KineticMark({ scale = 0.6 }) {
  return (
    <div role="img" aria-label="Kinetic" style={{ width: 210 * scale, height: 250 * scale, margin: "0 auto", position: "relative" }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", left: 0, top: 0, width: 210, height: 250, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden" }}>
        <Corner pos="tl" color="#3b82f6" /><Corner pos="tr" color="#8b5cf6" /><Corner pos="bl" color="#3b82f6" /><Corner pos="br" color="#8b5cf6" />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 110 130" width="110" height="130" style={{ overflow: "visible" }} aria-hidden="true">
            <defs><linearGradient id="kmGrad" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
            <text {...K_TEXT} fill="none" stroke="url(#kmGrad)" strokeWidth="2.5" strokeLinejoin="round">K</text>
          </svg>
        </div>
        <div className="km-a km-fill" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", animation: "kmFill 3.4s ease-in-out infinite" }}>
          <svg viewBox="0 0 110 130" width="110" height="130" style={{ overflow: "visible" }} aria-hidden="true">
            <defs><linearGradient id="kmFillGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#2563eb" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
            <text {...K_TEXT} fill="url(#kmFillGrad)" strokeWidth="0">K</text>
          </svg>
        </div>
        <div className="km-a" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent 0%, #4ade80 50%, transparent 100%)", boxShadow: "0 0 10px 2px rgba(74,222,128,0.6)", opacity: 0, pointerEvents: "none", animation: "kmScan 3.4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "22%", left: "50%", transform: "translateX(-50%)" }}>
          <div className="km-a" style={{ width: 110, height: 16, borderRadius: "50%", background: "radial-gradient(ellipse at center, #4ade80 0%, rgba(74,222,128,0.45) 55%, transparent 100%)", boxShadow: "0 0 20px 8px rgba(74,222,128,0.45)", animation: "kmGlow 2.4s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  )
}
