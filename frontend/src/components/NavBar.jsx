import { Link, useLocation } from "react-router-dom"
<<<<<<< HEAD
import { Home, Dumbbell, TrendingUp, User } from "lucide-react"
=======
import { Home, BookOpen, TrendingUp, User } from "lucide-react"
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e

const scanStyle = `
  @keyframes scanLine {
    0%   { top: 22%; }
    50%  { top: 78%; }
    100% { top: 22%; }
  }
`

function NavBar() {
  const location = useLocation()
  const path = location.pathname

  const isActive = (to) => path === to

  return (
    <>
    <style>{scanStyle}</style>
    <nav
      className="fixed bottom-0 z-50 flex items-center justify-around px-2"
      style={{
        background: "white",
        borderTop: "1px solid #f0eeff",
        boxShadow: "0 -2px 16px rgba(108,92,231,0.07)",
        width: "100%",
        maxWidth: 430,
        left: "50%",
        transform: "translateX(-50%)",
        height: 96,
      }}
    >
      <Link
        to="/"
        className="flex flex-col items-center gap-0.5 py-1 px-3"
        style={{ color: isActive("/") ? "#6C5CE7" : "#9ca3af" }}
      >
        <Home size={20} />
        <span className="text-xs">Home</span>
      </Link>

      <Link
        to="/plan"
        className="flex flex-col items-center gap-0.5 py-1 px-3"
<<<<<<< HEAD
      >
        <div style={{
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isActive("/plan") ? "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)" : "transparent",
          WebkitBackgroundClip: isActive("/plan") ? "text" : "unset",
          WebkitTextFillColor: isActive("/plan") ? "transparent" : "unset"
        }}>
          <Dumbbell size={20} strokeWidth={2.5} color={isActive("/plan") ? "#0284C7" : "#9ca3af"} />
        </div>
        <span className="text-xs" style={{ color: isActive("/plan") ? "#6C5CE7" : "#9ca3af" }}>Plan</span>
      </Link>

      {/* Analysis — Lifter icon with scan animation */}
      <Link to="/upload" className="flex flex-col items-center" style={{ marginTop: "-20px" }}>
        <div style={{
          position: "relative",
          width: "70px",
          height: "70px",
          borderRadius: "50%",
          background: "linear-gradient(158.8deg, #F9DAD2 0%, #DBD4FC 24.98%, #0284C7 100.81%)",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15), 0px 1px 4px rgba(0, 0, 0, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            width: "76px",
            height: "76px",
            border: "3px solid rgba(255, 255, 255, 0.6)",
            borderRadius: "50%",
            top: "-3px",
            left: "-3px"
          }} />
          <img
            src="/lifter_icon_nobg.png"
            alt="lifter"
            style={{
              width: "67px",
              height: "67px",
              objectFit: "contain",
              position: "relative",
              zIndex: 2,
              filter: "brightness(0) invert(1)"
            }}
          />
          <div className="scan-animation" style={{
            position: "absolute",
            top: "10%",
            left: "0",
            right: "0",
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            width: "100%",
            zIndex: 3
          }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "#0284C7", marginTop: "8px" }}>
=======
        style={{ color: isActive("/plan") ? "#6C5CE7" : "#9ca3af" }}
      >
        <BookOpen size={20} />
        <span className="text-xs">Plan</span>
      </Link>

      {/* Analysis — circle clipped tightly to just the gradient circle */}
      <Link to="/upload" className="flex flex-col items-center gap-0.5">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundImage: "url('/lifter_icon.png')",
            backgroundSize: "132%",
            backgroundPosition: "55% center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Scan line */}
          <div style={{
            position: "absolute",
            left: "28%",
            right: "28%",
            height: 2,
            borderRadius: 1,
            background: "linear-gradient(90deg, transparent, rgba(96,200,248,0.9), transparent)",
            animation: "scanLine 1.8s ease-in-out infinite",
            top: "8%",
          }} />
        </div>
        <span className="text-xs" style={{ color: "#6C5CE7", fontWeight: 600 }}>
>>>>>>> d409995e71d96a5a25eef9fae9b042cfd367da5e
          Analysis
        </span>
      </Link>

      <Link
        to="/timeline"
        className="flex flex-col items-center gap-0.5 py-1 px-3"
        style={{ color: isActive("/timeline") ? "#6C5CE7" : "#9ca3af" }}
      >
        <TrendingUp size={20} />
        <span className="text-xs">Timeline</span>
      </Link>

      <Link
        to="/profile"
        className="flex flex-col items-center gap-0.5 py-1 px-3"
        style={{ color: isActive("/profile") ? "#6C5CE7" : "#9ca3af" }}
      >
        <User size={20} />
        <span className="text-xs">Profile</span>
      </Link>
    </nav>
    </>
  )
}

export default NavBar
