import { Navigate, useNavigate } from "react-router-dom"
import { useUser, DEMO_USERS } from "../context/UserContext"
import { Leaf, BarChart2, Rocket } from "lucide-react"

const USER_ICONS = {
  user_001: Leaf,
  user_002: BarChart2,
  user_003: Rocket,
}

const BUTTON_COLORS = {
  user_001: "#4facfe",
  user_002: "#c026d3",
  user_003: "#7c3aed",
}

function Barbell({ color, flip }) {
  const heights = flip ? [30, 22, 14] : [14, 22, 30]
  return (
    <div className="flex items-center gap-0.5">
      {heights.map((h, i) => (
        <div key={i} style={{ width: 3.5, height: h, background: color, borderRadius: 2, opacity: 1 }} />
      ))}
    </div>
  )
}

function Avatar({ user }) {
  const Icon = USER_ICONS[user.id] || Leaf
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
      style={{
        background: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
      }}
    >
      <Icon size={26} color="white" />
    </div>
  )
}

function ProfileCard({ user, onSelect }) {
  return (
    <button
      onClick={() => onSelect(user.id)}
      className="w-full flex items-center gap-3 bg-white rounded-xl p-3.5 text-left"
      style={{ boxShadow: "0 2px 16px rgba(108,92,231,0.10)", border: "1.5px solid rgba(147,197,253,0.6)" }}
    >
      <Avatar user={user} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm" style={{ color: "#1a1a2e" }}>
            {user.name}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: user.levelBg, color: user.levelColor }}
          >
            {user.level}
          </span>
        </div>
        <p className="text-xs mb-1" style={{ color: "#8b8ba7" }}>
          {user.description}
        </p>
        <p className="text-xs" style={{ color: "#8b8ba7" }}>
          {user.currentWeight} kg &nbsp;·&nbsp;{" "}
          <span className="font-semibold" style={{ color: "#1a1a2e" }}>
            {user.avgScore}/100
          </span>
        </p>
        <p className="text-xs mt-1 font-medium" style={{ color: user.progressNoteColor }}>
          {user.progressNote}
        </p>
      </div>

      <div
        className="flex items-center text-xs font-bold px-3 py-2 rounded-sm flex-shrink-0 text-white gap-1"
        style={{
          background: BUTTON_COLORS[user.id],
        }}
      >
        Enter <span style={{ fontSize: 13 }}>›</span>
      </div>
    </button>
  )
}

function LoginPage() {
  const { activeUser, setUser } = useUser()
  const navigate = useNavigate()

  if (activeUser) return <Navigate to="/" replace />

  const handleSelect = (userId) => {
    setUser(userId)
    navigate("/")
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{
        background: "radial-gradient(ellipse at 0% 0%, #F5DAD3 0%, transparent 55%), radial-gradient(ellipse at 100% 15%, #BCABFF 0%, transparent 65%), radial-gradient(ellipse at 55% 50%, #D2CAFE 0%, transparent 60%), radial-gradient(ellipse at 30% 100%, #BBEEE8 0%, transparent 40%), radial-gradient(ellipse at 100% 100%, #BBEEE8 0%, transparent 40%), #F0EEFF",
      }}
    >
      <div className="w-full" style={{ maxWidth: 380 }}>
        {/* Branding */}
        <div className="text-center mb-4 mt-2">
          <div className="flex items-center justify-center gap-1 mb-1 flex-wrap">
            <span className="text-3xl font-black tracking-tight" style={{ color: "#1a1a2e" }}>
              Welcome to
            </span>
            <Barbell color="#4a90d9" />
            <h1
              className="font-black"
              style={{
                fontSize: 34,
                lineHeight: 1,
                background: "linear-gradient(90deg, #4a90d9 0%, #7c5ce7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.04em",
              }}
            >
              KINETIC
            </h1>
            <Barbell color="#4a90d9" flip />
          </div>
          <p className="text-sm" style={{ color: "#8b8ba7" }}>
            Your AI Progressive Form Coach
          </p>
        </div>

        {/* Who's training */}
        <div className="mb-5 text-center">
          <h2 className="text-2xl font-black mb-1" style={{ color: "#1a1a2e" }}>
            Who's training today?
          </h2>
          <p className="text-sm" style={{ color: "#8b8ba7" }}>
            Pick a profile to load their training story
          </p>
        </div>

        {/* Profile cards */}
        <div className="space-y-3">
          {Object.values(DEMO_USERS).map((user) => (
            <ProfileCard key={user.id} user={user} onSelect={handleSelect} />
          ))}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#9ca3af" }}>
          Demo Mode • No Login
        </p>
      </div>
    </div>
  )
}

export default LoginPage
