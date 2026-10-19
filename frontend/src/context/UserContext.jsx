import { createContext, useContext, useEffect, useState } from "react"
import { TOKEN_KEY, signInWithGoogle, fetchMe } from "../services/authService"

export const DEMO_USERS = {
  user_001: {
    id: "user_001",
    name: "Amrita",
    initials: "AB",
    level: "Beginner",
    levelColor: "#22c55e",
    levelBg: "#dcfce7",
    description: "Just getting started",
    currentWeight: 60,
    avgScore: 72,
    progressNote: "6 Sessions Completed",
    progressNoteColor: "#6b7280",
    progressIcon: null,
    avatarGradient: ["#4facfe", "#00f2fe"],
    greeting: "You're stronger than last week!",
    workouts: 6,
    dayStreak: 3,
    focus: {
      title: "Your focus this week",
      advice: "Keep your chest up throughout the squat. You're collapsing slightly at depth.",
      tips: "Try: goblet squat holds, box squats for positional feedback.",
    },
  },
  user_002: {
    id: "user_002",
    name: "Nicole",
    initials: "NA",
    level: "Intermediate",
    levelColor: "#8b5cf6",
    levelBg: "#ede9fe",
    description: "Building Momentum",
    currentWeight: 50,
    avgScore: 74,
    progressNote: "Score up 12 pts in 4 weeks",
    progressNoteColor: "#22c55e",
    progressIcon: "up",
    avatarGradient: ["#f093fb", "#f5576c"],
    greeting: "Building momentum. Keep crushing it!",
    workouts: 6,
    dayStreak: 3,
    focus: {
      title: "Your focus this week",
      advice: "Increase time under tension. Your descents are too fast at 20 kg.",
      tips: "Try: 3-second descents, pause squats at the bottom.",
    },
  },
  user_003: {
    id: "user_003",
    name: "Advait",
    initials: "AD",
    level: "Plateau · Breaker",
    levelColor: "#f59e0b",
    levelBg: "#fef3c7",
    description: "Ready to break through",
    currentWeight: 65,
    avgScore: 71,
    progressNote: "Stuck at 22 kg for 4 weeks",
    progressNoteColor: "#f59e0b",
    progressIcon: "right",
    avatarGradient: ["#a18cd1", "#fbc2eb"],
    greeting: "Time to break that plateau!",
    workouts: 4,
    dayStreak: 3,
    focus: {
      title: "Your focus this week",
      advice: "Work on ankle mobility. It's limiting your squat depth at heavier weights.",
      tips: "Try: heel elevated squats, banded ankle circles.",
    },
  },
}

const UserContext = createContext(null)

// Shape a real (Google) account like a demo user so pages can read the same fields
function toActiveUser(me) {
  const name = me.display_name || (me.email ? me.email.split("@")[0] : "You")
  return { id: me.user_id, name, initials: name.slice(0, 2).toUpperCase(), email: me.email }
}

export function UserProvider({ children }) {
  const [activeUserId, setActiveUserId] = useState(
    () => localStorage.getItem("active_user_id") || null
  )
  const [authUser, setAuthUser] = useState(null)

  const activate = (userId) => {
    localStorage.setItem("active_user_id", userId)
    setActiveUserId(userId)
  }

  // Demo profile pick: drop any Google session so the two flows never mix
  const setUser = (userId) => {
    localStorage.removeItem(TOKEN_KEY)
    setAuthUser(null)
    activate(userId)
  }

  const clearUser = () => {
    localStorage.removeItem("active_user_id")
    localStorage.removeItem(TOKEN_KEY)
    setActiveUserId(null)
    setAuthUser(null)
  }

  // Real account signed in with Google: remember the user id and load their profile
  const loginWithGoogle = async (idToken) => {
    const userId = await signInWithGoogle(idToken)
    activate(userId)
    const me = await fetchMe()
    if (me) setAuthUser(toActiveUser(me))
    return userId
  }

  // After a page reload, restore the real user's profile from the saved token
  useEffect(() => {
    if (!activeUserId || DEMO_USERS[activeUserId] || authUser) return
    fetchMe().then((me) => me && setAuthUser(toActiveUser(me)))
  }, [activeUserId, authUser])

  const activeUser = activeUserId
    ? DEMO_USERS[activeUserId] || (authUser?.id === activeUserId ? authUser : null)
    : null

  return (
    <UserContext.Provider value={{ activeUser, activeUserId, setUser, clearUser, loginWithGoogle, DEMO_USERS }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
