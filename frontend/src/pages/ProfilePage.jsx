import { useNavigate } from "react-router-dom"

const NAV_ITEMS = [
  { label: "Home",     path: "/",        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Plan",     path: "/plan",    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Analysis", path: "/results", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
  { label: "Timeline", path: "/timeline",icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Profile",  path: "/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", active: true },
]

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <button
      type="button"
      onClick={onPress || undefined}
      className="w-full bg-white rounded-2xl flex items-center gap-4 px-4 py-4 text-left"
      style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <span className="flex-shrink-0" style={{ color: danger ? "#ef4444" : "#374151" }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: danger ? "#ef4444" : "#111827" }}>{label}</span>
      <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()

  const userName   = localStorage.getItem("user_name")   || "You"
  const userBio    = localStorage.getItem("user_bio")    || "Pushing for new PRs every week."
  const bodyWeight = localStorage.getItem("body_weight") || null
  const workouts   = localStorage.getItem("workout_count") || null
  const dayStreak  = localStorage.getItem("day_streak")  || null
  const initial    = userName.charAt(0).toUpperCase()

  function handleSignOut() {
    localStorage.clear()
    navigate("/select-profile")
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>
      <div className="max-w-sm mx-auto pb-28">

        <div className="pt-6 pb-4 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900">Profile</h1>
        </div>

        <div className="mx-4 mb-5 bg-white rounded-2xl p-5" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex flex-col items-center mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #818cf8 100%)" }}
            >
              <span className="text-3xl font-bold text-white">{initial}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{userName}</h2>
            <p className="text-sm text-gray-500 text-center">{userBio}</p>
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div>
              <div className="text-base font-bold text-gray-900">{bodyWeight ? `${bodyWeight} KG` : "—"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">Body Weight</div>
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">{workouts ?? "—"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">Workouts</div>
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">{dayStreak ?? "—"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">Day Streak</div>
            </div>
          </div>
        </div>

        <div className="px-5 mb-2">
          <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Account</span>
        </div>

        <div className="mx-4 flex flex-col gap-2 mb-2">
          <MenuItem
            label="Preferences"
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h2m0 0a2 2 0 104 0M5 5a2 2 0 114 0m0 0h12M3 12h10m0 0a2 2 0 104 0m-4 0a2 2 0 114 0m0 0h4M3 19h4m0 0a2 2 0 104 0m-4 0a2 2 0 114 0m0 0h10" />
              </svg>
            }
          />
          <MenuItem
            label="Subscription"
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.372 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
          <MenuItem
            label="Settings"
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <MenuItem
            label="Change Profile"
            onPress={() => navigate("/select-profile")}
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                <rect x="3" y="3" width="18" height="18" rx="9" stroke="currentColor" strokeWidth={1.8} />
              </svg>
            }
          />
          <MenuItem
            label="Sign Out"
            onPress={handleSignOut}
            danger
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
          />
        </div>

      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-2 px-4"
        style={{ colorScheme: "light" }}
      >
        {NAV_ITEMS.map(({ label, icon, path, active }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 min-w-[48px]"
            style={{ color: active ? "#6366f1" : "#9ca3af" }}
          >
            {label === "Analysis" ? (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center -mt-4 mb-0.5"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            )}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}