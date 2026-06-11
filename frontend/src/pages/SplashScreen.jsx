import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

export default function SplashScreen() {
  const navigate  = useNavigate()
  const navRef    = useRef(navigate)
  const { clearUser } = useUser()
  const glowRef   = useRef(null)

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

    const glowEl = glowRef.current
    if (glowEl) {
      glowEl.style.opacity = "0"
      setTimeout(() => {
        glowEl.getBoundingClientRect()
        glowEl.style.transition = "opacity 0.5s ease"
        glowEl.style.opacity    = "1"

        let scale = 1
        let dir   = 1
        setInterval(() => {
          scale += dir * 0.007
          if (scale >= 1.16) dir = -1
          if (scale <= 1.0)  dir =  1
          glowEl.style.transform = `scaleX(${scale}) scaleY(${scale})`
        }, 20)
      }, 900)
    }

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
        style={{ position: "relative", width: 210, height: 250 }}
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
        </div>

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
  const thick  = 3.5
  const radius = 5
  const base   = { position: "absolute", width: size, height: size }
  const posMap = {
    tl: { top: 0,    left: 0,   borderTop: thick + "px solid " + color, borderLeft: thick + "px solid " + color,      borderTopLeftRadius: radius },
    tr: { top: 0,    right: 0,  borderTop: thick + "px solid " + color, borderRight: thick + "px solid " + color,     borderTopRightRadius: radius },
    bl: { bottom: 0, left: 0,   borderBottom: thick + "px solid " + color, borderLeft: thick + "px solid " + color,   borderBottomLeftRadius: radius },
    br: { bottom: 0, right: 0,  borderBottom: thick + "px solid " + color, borderRight: thick + "px solid " + color,  borderBottomRightRadius: radius },
  }
  return <div style={{ ...base, ...posMap[pos] }} />
}