import { createContext, useContext, useState } from "react"

export const DEMO_USERS = {
  user_001: {
    id: "user_001",
    name: "Alex",
    initials: "AC",
    level: "Beginner",
    levelColor: "#22c55e",
    levelBg: "#dcfce7",
    description: "Just getting started",
    currentWeight: 12,
    avgScore: 58,
    progressNote: "2 Sessions Completed",
    progressNoteColor: "#6b7280",
    progressIcon: null,
    avatarGradient: ["#4facfe", "#00f2fe"],
    greeting: "You're stronger than last week!",
    focus: {
      title: "Your focus this week",
      advice: "Keep your chest up throughout the squat. You're collapsing slightly at depth.",
      tips: "Try: goblet squat holds, box squats for positional feedback.",
    },
  },
  user_002: {
    id: "user_002",
    name: "Maya",
    initials: "MP",
    level: "Intermediate",
    levelColor: "#8b5cf6",
    levelBg: "#ede9fe",
    description: "Building Momentum",
    currentWeight: 20,
    avgScore: 74,
    progressNote: "Score up 12 pts in 4 weeks",
    progressNoteColor: "#22c55e",
    progressIcon: "up",
    avatarGradient: ["#f093fb", "#f5576c"],
    greeting: "Building momentum. Keep crushing it!",
    focus: {
      title: "Your focus this week",
      advice: "Increase time under tension. Your descents are too fast at 20 kg.",
      tips: "Try: 3-second descents, pause squats at the bottom.",
    },
  },
  user_003: {
    id: "user_003",
    name: "Jordan",
    initials: "JL",
    level: "Plateau · Breaker",
    levelColor: "#f59e0b",
    levelBg: "#fef3c7",
    description: "Ready to break through",
    currentWeight: 22,
    avgScore: 71,
    progressNote: "Stuck at 22 kg for 4 weeks",
    progressNoteColor: "#f59e0b",
    progressIcon: "right",
    avatarGradient: ["#a18cd1", "#fbc2eb"],
    greeting: "Time to break that plateau!",
    focus: {
      title: "Your focus this week",
      advice: "Work on ankle mobility. It's limiting your squat depth at heavier weights.",
      tips: "Try: heel elevated squats, banded ankle circles.",
    },
  },
}

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [activeUserId, setActiveUserId] = useState(
    () => localStorage.getItem("active_user_id") || null
  )

  const setUser = (userId) => {
    localStorage.setItem("active_user_id", userId)
    setActiveUserId(userId)
  }

  const clearUser = () => {
    localStorage.removeItem("active_user_id")
    setActiveUserId(null)
  }

  const activeUser = activeUserId ? DEMO_USERS[activeUserId] : null

  return (
    <UserContext.Provider value={{ activeUser, activeUserId, setUser, clearUser, DEMO_USERS }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
