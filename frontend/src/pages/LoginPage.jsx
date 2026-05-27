import { Navigate, useNavigate } from "react-router-dom"
import { useUser, DEMO_USERS } from "../context/UserContext"

function Avatar({ user }) {
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-md"
      style={{
        background: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
      }}
    >
      {user.initials}
    </div>
  )
}

function ProfileCard({ user, onSelect }) {
  return (
    <button
      onClick={() => onSelect(user.id)}
      className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 text-left transition-all hover:shadow-md active:scale-98"
      style={{ border: "1.5px solid #e8e4ff", boxShadow: "0 1px 4px rgba(108,92,231,0.06)" }}
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
        <p
          className="text-xs mt-1 font-medium"
          style={{ color: user.progressNoteColor }}
        >
          {user.progressNote}
        </p>
      </div>

      <div
        className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #6C5CE7, #a29bfe)" }}
      >
        Enter
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
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "#eef0ff" }}
    >
      {/* Outer dashed border frame */}
      <div
        className="w-full max-w-sm rounded-3xl p-1"
        style={{
          background: "linear-gradient(135deg, #4facfe 0%, #a29bfe 50%, #00f2fe 100%)",
          padding: "2px",
        }}
      >
        <div
          className="rounded-3xl p-5"
          style={{
            background: "white",
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(108,92,231,0.04) 23px, rgba(108,92,231,0.04) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(108,92,231,0.04) 23px, rgba(108,92,231,0.04) 24px)",
          }}
        >
          {/* Logo & branding */}
          <div className="text-center mb-5">
            <p className="text-sm font-medium mb-1" style={{ color: "#8b8ba7" }}>
              Welcome to
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1
                className="text-3xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #4facfe 0%, #6C5CE7 50%, #00f2fe 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                KINETIC
              </h1>
            </div>
            <p className="text-xs font-medium" style={{ color: "#6C5CE7" }}>
              Your AI Progressive Form Coach
            </p>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-5"
            style={{ background: "linear-gradient(90deg, transparent, #d0c9ff, transparent)" }}
          />

          {/* Who's training */}
          <div className="mb-4">
            <h2 className="text-lg font-black mb-0.5" style={{ color: "#1a1a2e" }}>
              Who's training today?
            </h2>
            <p className="text-xs" style={{ color: "#8b8ba7" }}>
              Pick a profile to load their training story
            </p>
          </div>

          {/* Profile cards */}
          <div className="space-y-3">
            {Object.values(DEMO_USERS).map((user) => (
              <ProfileCard key={user.id} user={user} onSelect={handleSelect} />
            ))}
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "#b0b0c8" }}>
            Demo Mode • No Login
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
