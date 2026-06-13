import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

export default function SplashScreen() {
  const navigate  = useNavigate()
  const navRef    = useRef(navigate)
  const { clearUser } = useUser()
  const glowRef   = useRef(null)
<<<<<<< HEAD
  const scannerRef = useRef(null)
  const kFillRef = useRef(null)
=======
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e

  useEffect(() => {
    clearUser()
    const fadeIn = (id, delay) => {
      const el = document.getElementById(id)
      if (!el) return
      el.style.opacity   = "0"
      el.style.transform = "translateY(16px)"
      setTimeout(() => {
        el.getBoundingClientRect()
        el.style.transition = "opacity 0.65s ease, transform 0.65s ease"
        el.style.opacity    = "1"
        el.style.transform  = "translateY(0)"
      }, delay)
    }

    fadeIn("sp-frame",   100)
    fadeIn("sp-logo",    260)
    fadeIn("sp-tagline", 460)

<<<<<<< HEAD
    // Start animations after frame fades in
    setTimeout(() => {
      // Animate corners (zoom in/out)
      const corners = document.querySelectorAll("[data-corner]")
      const animationDuration = 2500 // 2.5 seconds
      const startTime = Date.now()

      const animateCorners = () => {
        const elapsed = Date.now() - startTime
        const progress = (elapsed % animationDuration) / animationDuration
        // Ease in-out for smooth zoom
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress
        // Scale from 1 to 0.85 (zoom in) then back to 1
        const scale = 1 - (easeProgress * 0.15)
        const offsetX = (1 - scale) * 105 // Half of frame width
        const offsetY = (1 - scale) * 125 // Half of frame height

        corners.forEach(corner => {
          corner.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`
        })

        if (elapsed < animationDuration + 200) {
          requestAnimationFrame(animateCorners)
        }
      }
      animateCorners()

      // Animate K letter fill from bottom to top
      const kFill = kFillRef.current
      if (kFill) {
        const kAnimationDuration = 2500
        const kStartTime = Date.now()

        const animateKFill = () => {
          const elapsed = Date.now() - kStartTime
          const progress = Math.min(elapsed / kAnimationDuration, 1)
          // Clip path from bottom to top (0% to 100%)
          kFill.style.clipPath = `inset(${(1 - progress) * 100}% 0 0 0)`
          if (elapsed < kAnimationDuration) {
            requestAnimationFrame(animateKFill)
          }
        }
        animateKFill()
      }

      // Animate scanner line (top to bottom to top)
      const scanner = scannerRef.current
      if (scanner) {
        const scannerDuration = 2500
        const scannerStartTime = Date.now()

        const animateScanner = () => {
          const elapsed = Date.now() - scannerStartTime
          const progress = (elapsed % scannerDuration) / scannerDuration

          // 0 to 1 to 0 (top to bottom to top)
          let scanProgress = progress < 0.5
            ? progress * 2
            : 2 * (1 - progress)

          const frameHeight = 250
          const position = scanProgress * frameHeight
          scanner.style.top = position + "px"
          scanner.style.opacity = scanProgress < 0.1 || scanProgress > 0.9 ? "0" : "0.8"

          if (elapsed < scannerDuration + 200) {
            requestAnimationFrame(animateScanner)
          }
        }
        animateScanner()
      }

      // Animate glow effect
      const glowEl = glowRef.current
      if (glowEl) {
=======
    const glowEl = glowRef.current
    if (glowEl) {
      glowEl.style.opacity = "0"
      setTimeout(() => {
        glowEl.getBoundingClientRect()
        glowEl.style.transition = "opacity 0.5s ease"
        glowEl.style.opacity    = "1"

>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
        let scale = 1
        let dir   = 1
        setInterval(() => {
          scale += dir * 0.007
          if (scale >= 1.16) dir = -1
          if (scale <= 1.0)  dir =  1
          glowEl.style.transform = `scaleX(${scale}) scaleY(${scale})`
        }, 20)
<<<<<<< HEAD
      }
    }, 600)
=======
      }, 900)
    }
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e

    const t = setTimeout(() => navRef.current("/profile-screen"), 3400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(170deg, #eaf3ff 0%, #ede9fe 45%, #f5f0ff 75%, #fafafe 100%)",
        colorScheme: "light",
        overflow: "hidden",
      }}
    >
      <div
        id="sp-logo"
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
      >
        <WaveIcon />
        <span
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            letterSpacing: "0.18em",
            background: "linear-gradient(90deg, #3b82f6 0%, #7c3aed 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          KINETIC
        </span>
        <WaveIcon flip />
      </div>

      <p
        id="sp-tagline"
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          letterSpacing: "0.03em",
          color: "#3b82f6",
          marginBottom: 40,
        }}
      >
        See Every Rep. Coach Every Lift.
      </p>

      <div
        id="sp-frame"
<<<<<<< HEAD
        style={{ position: "relative", width: 210, height: 250, overflow: "hidden" }}
=======
        style={{ position: "relative", width: 210, height: 250 }}
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
      >
        <Corner pos="tl" color="#3b82f6" />
        <Corner pos="tr" color="#8b5cf6" />
        <Corner pos="bl" color="#3b82f6" />
        <Corner pos="br" color="#8b5cf6" />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 110 130" width="110" height="130" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="kGrad" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <text
              x="8"
              y="118"
              fontSize="118"
              fontWeight="900"
              fontFamily="Arial Black, Impact, sans-serif"
              fill="none"
              stroke="url(#kGrad)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            >
              K
            </text>
          </svg>
<<<<<<< HEAD
          <div
            ref={kFillRef}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <svg viewBox="0 0 110 130" width="110" height="130" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="kFillGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <text
                x="8"
                y="118"
                fontSize="118"
                fontWeight="900"
                fontFamily="Arial Black, Impact, sans-serif"
                fill="url(#kFillGrad)"
                strokeWidth="0"
              >
                K
              </text>
            </svg>
          </div>
        </div>

        {/* Green scanner line */}
        <div
          ref={scannerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, transparent 0%, #4ade80 50%, transparent 100%)",
            boxShadow: "0 0 10px 2px rgba(74,222,128,0.6)",
            opacity: 0,
            pointerEvents: "none",
          }}
        />

=======
        </div>

>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
        <div
          style={{
            position: "absolute",
            bottom: "22%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div
            ref={glowRef}
            style={{
              width: 110,
              height: 16,
              borderRadius: "50%",
              background: "radial-gradient(ellipse at center, #4ade80 0%, rgba(74,222,128,0.45) 55%, transparent 100%)",
              boxShadow: "0 0 20px 8px rgba(74,222,128,0.45)",
            }}
          />
        </div>
      </div>
    </div>
  )
}

function WaveIcon({ flip = false }) {
  const bars = [4, 9, 14, 9, 6, 12, 8]
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        transform: flip ? "scaleX(-1)" : "none",
        height: 18,
      }}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 2.5,
            height: h,
            borderRadius: 9999,
            background: "linear-gradient(180deg, #3b82f6 0%, #7c3aed 100%)",
            opacity: 0.85,
          }}
        />
      ))}
    </span>
  )
}

function Corner({ pos, color }) {
  const size   = 36
<<<<<<< HEAD
  const thick  = 7
  const radius = 5
  const base   = { position: "absolute", width: size, height: size, transformOrigin: "center" }
=======
  const thick  = 3.5
  const radius = 5
  const base   = { position: "absolute", width: size, height: size }
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
  const posMap = {
    tl: { top: 0,    left: 0,   borderTop: thick + "px solid " + color, borderLeft: thick + "px solid " + color,      borderTopLeftRadius: radius },
    tr: { top: 0,    right: 0,  borderTop: thick + "px solid " + color, borderRight: thick + "px solid " + color,     borderTopRightRadius: radius },
    bl: { bottom: 0, left: 0,   borderBottom: thick + "px solid " + color, borderLeft: thick + "px solid " + color,   borderBottomLeftRadius: radius },
    br: { bottom: 0, right: 0,  borderBottom: thick + "px solid " + color, borderRight: thick + "px solid " + color,  borderBottomRightRadius: radius },
  }
<<<<<<< HEAD
  return <div data-corner={pos} style={{ ...base, ...posMap[pos] }} />
=======
  return <div style={{ ...base, ...posMap[pos] }} />
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
}