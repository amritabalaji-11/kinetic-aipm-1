import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

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
  const navigate    = useNavigate()
  const { activeUser, clearUser } = useUser()

  const userName   = activeUser?.name        || "You"
  const initials   = activeUser?.initials    || userName.charAt(0).toUpperCase()
  const userBio    = activeUser?.description || "Pushing for new PRs every week."
  const bodyWeight = activeUser?.currentWeight ?? null
  const workouts   = activeUser?.workouts    ?? null
  const dayStreak  = activeUser?.dayStreak   ?? null
  const avatarGrad = activeUser?.avatarGradient
    ? `linear-gradient(135deg, ${activeUser.avatarGradient[0]} 0%, ${activeUser.avatarGradient[1]} 100%)`
    : "linear-gradient(135deg, #c4b5fd 0%, #818cf8 100%)"

  function handleSignOut() {
    clearUser()
    navigate("/profile-screen")
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0EFFE", colorScheme: "light" }}>
      <div className="pb-8">

        <div className="pt-6 pb-4 px-4 text-center">
          <h1 className="text-base font-bold text-gray-900">Profile</h1>
        </div>

        <div className="mx-4 mb-5 bg-white rounded-2xl p-5" style={{ border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex flex-col items-center mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
              style={{ background: avatarGrad }}
            >
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{userName}</h2>
            <p className="text-sm text-gray-500 text-center">{userBio}</p>
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div>
              <div className="text-base font-bold text-gray-900">{bodyWeight != null ? `${bodyWeight} KG` : "—"}</div>
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
            onPress={() => navigate("/profile/subscription")}
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
            onPress={() => {
              clearUser()
              navigate("/profile-screen")
            }}
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
    </div>
  )
}