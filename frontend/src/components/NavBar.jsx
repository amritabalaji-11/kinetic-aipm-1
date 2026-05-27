import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, TrendingUp, User, ScanLine } from "lucide-react"

function NavBar() {
  const location = useLocation()
  const path = location.pathname

  const isActive = (to) => path === to

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-2 pt-1"
        style={{ background: "white", borderTop: "1px solid #f0eeff", boxShadow: "0 -2px 16px rgba(108,92,231,0.07)" }}
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

        {/* Analysis — centre prominent button */}
        <Link to="/upload" className="flex flex-col items-center gap-0.5 -mt-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #6C5CE7, #a29bfe)" }}
          >
            <ScanLine size={24} color="white" className="relative z-10" />
            <div className="scan-line" />
          </div>
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

      {/* Desktop side nav */}
      <nav
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-52 px-4 py-6 z-50"
        style={{ background: "white", borderRight: "1px solid #f0eeff" }}
      >
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6C5CE7, #a29bfe)" }}
          >
            <span className="text-white font-black text-sm">K</span>
          </div>
          <div>
            <p className="font-black text-sm" style={{ color: "#1a1a2e" }}>KINETIC</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>AI Form Coach</p>
          </div>
        </div>

        {[
          { to: "/", Icon: Home, label: "Home" },
          { to: "/plan", Icon: BookOpen, label: "Plan" },
          { to: "/timeline", Icon: TrendingUp, label: "Timeline" },
          { to: "/profile", Icon: User, label: "Profile" },
        ].map(({ to, Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm"
            style={
              isActive(to)
                ? { background: "#f0eeff", color: "#6C5CE7", fontWeight: 700 }
                : { color: "#6b7280" }
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}

        <Link
          to="/upload"
          className="mt-4 flex items-center gap-3 px-3 py-3 rounded-xl text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #6C5CE7, #a29bfe)" }}
        >
          <ScanLine size={18} className="relative z-10" />
          <span className="text-sm font-bold relative z-10">Analyse Form</span>
          <div className="scan-line" />
        </Link>
      </nav>
    </>
  )
}

export default NavBar
