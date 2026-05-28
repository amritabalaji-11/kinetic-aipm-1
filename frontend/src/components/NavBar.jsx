import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, TrendingUp, User } from "lucide-react"

function NavBar() {
  const location = useLocation()
  const path = location.pathname

  const isActive = (to) => path === to

  return (
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
          }}
        />
        <span className="text-xs" style={{ color: "#6C5CE7", fontWeight: 600 }}>
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
  )
}

export default NavBar
