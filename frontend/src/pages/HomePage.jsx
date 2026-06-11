import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function HistoryCard({ session }) {
  const navigate = useNavigate()
  const exerciseName = (session.exercise_name || "Session")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const dateLabel = session.created_at
    ? new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const score = session.overall_score ?? 0

  return (
    <button
      type="button"
      onClick={() => navigate("/upload/results", { state: { analysisId: session.session_id } })}
      className="w-full rounded-lg overflow-hidden"
      style={{
        background: "#F4F2FA",
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.14)",
        minHeight: "73px"
      }}
    >
      <div className="p-3 flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex-1 max-w-none"
          style={{
            background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
            borderRadius: "8px"
          }}>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-gray-900 mb-1">{exerciseName}</p>
          <p className="text-[8px] text-gray-500 mb-2">{dateLabel} • 12kg • 12 Reps</p>
          <p className="text-[10px] text-gray-600 leading-tight">Depth held for 6 reps, ankle dorsiflexion limited reps 7-8.</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold" style={{ color: "#FFCC00" }}>{score}</span>
          <span className="text-[8px] text-gray-500">/100</span>
        </div>
      </div>
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { activeUser } = useUser()

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState({})

  useEffect(() => {
    const userId = localStorage.getItem("active_user_id") || "user_001"
    fetch(`${BASE_URL}/form_analysis_results/${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        console.log("Form history data:", data)
        if (Array.isArray(data)) {
          setHistory(data)
        }
        setHistoryLoading(false)
      })
      .catch(err => {
        console.error("Error fetching form history:", err)
        setHistoryLoading(false)
      })
  }, [])

  return (
    <div style={{ background: "#F4F2FA", colorScheme: "light", minHeight: "100vh", paddingBottom: "140px" }}>
      {/* Status Bar */}
      <div style={{ padding: "21px 0px 0px", height: "50px", display: "flex", justifyContent: "space-between", alignItems: "center", paddingX: "20px" }}>
        <span style={{ fontSize: "17px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'" }}>9:41</span>
        <div style={{ width: "139px", display: "flex", gap: "7px", justifyContent: "center", alignItems: "center" }}>
          <svg width="19" height="12" viewBox="0 0 19 12" fill="#000"><rect x="0" y="4" width="3" height="8" /><rect x="4" y="2" width="3" height="10" /><rect x="8" y="0" width="3" height="12" /></svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#000"><path d="M0 12h12c2.76 0 5-2.24 5-5V0z" /></svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none" stroke="#000" strokeWidth="1"><rect x="2" y="2" width="21" height="9" rx="2" /><rect x="24" y="4" width="2" height="5" /></svg>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "430px", margin: "0 auto", padding: "0px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 400, color: "#64748B", fontFamily: "'DM Sans'" }}>You're stronger than last week!</p>
            <h1 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#0F172A", marginTop: "8px" }}>Hey {activeUser?.name?.split(" ")[0] || "There"}</h1>
          </div>
          <button type="button" onClick={() => navigate("/profile")} style={{ width: "38px", height: "38px", background: "#FFFFFF", borderRadius: "8px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0F172A"><path d="M7 10a3 3 0 100-6 3 3 0 000 6zM17 16a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </button>
        </div>

        {/* This Week Card */}
        <div style={{
          background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
          border: "1px solid #D9CEFF",
          boxShadow: "0px 4px 20px rgba(221, 162, 255, 0.14)",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
            <div>
              <p style={{ fontSize: "14px", fontFamily: "'DM Sans'", color: "#000000", marginBottom: "6px" }}>Last 7 Days</p>
              <p style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>June 10 - 16</p>
            </div>
            <div style={{ textAlign: "right", background: "rgba(255, 255, 255, 0.8)", borderRadius: "999px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0284C7" style={{ opacity: 0.8 }}>
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0284C7" }}>3</div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#0284C7", margin: "0" }}>Day Streak</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {[
              { day: "W", date: 10, isWorkout: false },
              { day: "T", date: 11, isWorkout: true },
              { day: "F", date: 12, isWorkout: false },
              { day: "S", date: 13, isWorkout: true },
              { day: "S", date: 14, isWorkout: false },
              { day: "M", date: 15, isWorkout: true },
              { day: "T", date: 16, isWorkout: false }
            ].map((dayData, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 8px", gap: "6px", flex: 1, background: dayData.isWorkout ? "#FFFFFF" : "rgba(255, 255, 255, 0.2)", borderRadius: "8px", border: !dayData.isWorkout ? "1px dashed rgba(156, 156, 156, 0.4)" : "none", minHeight: "80px" }}>
                <p style={{ fontSize: "14px", fontWeight: 400, color: dayData.isWorkout ? "#000000" : "#9C9C9C", fontFamily: "'DM Sans'" }}>{dayData.day}</p>
                <p style={{ fontSize: "12px", fontWeight: 400, color: dayData.isWorkout ? "#000000" : "#9C9C9C", marginBottom: "4px" }}>{dayData.date}</p>
                {dayData.isWorkout ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="4" height="16" rx="0.5" />
                    <rect x="9" y="9" width="2" height="6" />
                    <rect x="13" y="9" width="2" height="6" />
                    <rect x="18" y="4" width="4" height="16" rx="0.5" />
                  </svg>
                ) : (
                  <div style={{ width: "20px", height: "20px", background: "rgba(156, 156, 156, 0.3)", borderRadius: "50%" }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ready to work out */}
        <div style={{
          background: "#F4F2FA",
          boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.14)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000", marginBottom: "20px" }}>Let's get you to work.</h2>

          {/* CTA Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Build Your Workout */}
            <button onClick={() => navigate("/plan")} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(157.27deg, rgba(249, 218, 210, 0.9) 0%, rgba(151, 71, 255, 0.9) 94.21%, rgba(86, 98, 231, 0.9) 116.73%, rgba(2, 132, 199, 0.9) 164.73%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", margin: "0 0 4px 0", fontFamily: "'Bricolage Grotesque'" }}>Build Your Workout</p>
                <p style={{ fontSize: "11px", color: "#FFFFFF", margin: "0", opacity: 0.9, fontFamily: "'Bricolage Grotesque'" }}>Quick exercise picker, then hit start</p>
              </div>
            </button>

            {/* Log Your Workout */}
            <button onClick={() => {
              const activeWorkout = localStorage.getItem("activeWorkout")
              if (activeWorkout) {
                navigate("/workout/active")
              } else {
                // No active workout - navigate to plan to create one
                alert("Start a new workout first! Click 'Build Your Workout' to get started.")
                navigate("/plan")
              }
            }} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
              borderRadius: "8px",
              border: "1px solid rgba(221, 162, 255, 0.3)",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(157.27deg, rgba(249, 218, 210, 0.9) 0%, rgba(151, 71, 255, 0.9) 94.21%, rgba(86, 98, 231, 0.9) 116.73%, rgba(2, 132, 199, 0.9) 164.73%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#000000", margin: "0 0 4px 0", fontFamily: "'Bricolage Grotesque'" }}>Log Your Workout</p>
                <p style={{ fontSize: "11px", color: "#000000", margin: "0", opacity: 0.7, fontFamily: "'Bricolage Grotesque'" }}>Track sets, reps, and weights</p>
              </div>
            </button>

            {/* Upload for Analysis */}
            <button onClick={() => navigate("/upload")} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
              borderRadius: "8px",
              border: "1px solid rgba(221, 162, 255, 0.3)",
              cursor: "pointer",
              textAlign: "left"
            }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(158.8deg, #F9DAD2 0%, #DBD4FC 24.98%, #0284C7 100.81%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#000000", margin: "0 0 4px 0", fontFamily: "'Bricolage Grotesque'" }}>Upload for Analysis</p>
                <p style={{ fontSize: "11px", color: "#000000", margin: "0", opacity: 0.7, fontFamily: "'Bricolage Grotesque'" }}>Get your form analyzed instantly</p>
              </div>
            </button>
          </div>
        </div>

        {/* Your Progress */}
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000", marginBottom: "10px" }}>Your Progress</h2>
          <p style={{ fontSize: "14px", fontFamily: "'Bricolage Grotesque'", color: "#64748B", marginBottom: "15px" }}>Tracked by exercise - tap to switch</p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {["Goblet Squat", "Deadlift", "RDL"].map((name, i) => (
              <button key={i} style={{
                padding: "10px 20px",
                borderRadius: "999px",
                border: "none",
                fontSize: "16px",
                fontWeight: 500,
                fontFamily: "'Bricolage Grotesque'",
                cursor: "pointer",
                background: i === 0 ? "linear-gradient(338.8deg, rgba(102, 76, 226, 0.7) 21.58%, rgba(2, 132, 199, 0.7) 100%)" : "#FFFFFF",
                color: i === 0 ? "#FFFFFF" : "#000000"
              }}>
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Ladder */}
        <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #F9DAD2 0%, #E8D4F8 100%)", borderRadius: "16px", padding: "16px 12px", gap: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontSize: "16px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#020D1B", margin: "0" }}>Progress ladder</p>
            <p style={{ fontSize: "12px", fontFamily: "'DM Sans'", color: "#394250", margin: "0", lineHeight: "16px", letterSpacing: "-0.04em" }}>Form scores typically dip when you load heavier. Watch your average per rung, not individual sessions.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* 14 Kg Card */}
            <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg>
                  <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>14 Kg</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 70</span>
              </div>
              <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}>
                <div style={{ flex: 1, height: "32px", background: "#FF8A4D", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>68</span></div>
                <div style={{ flex: 1, height: "32px", background: "#FD9D53", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>72</span></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
              </div>
              <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>2 sessions analyzed</p>
            </div>

            {/* 12 Kg Card */}
            <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg>
                  <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>12 Kg</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 72</span>
              </div>
              <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}>
                <div style={{ flex: 1, height: "32px", background: "#FD9D53", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>72</span></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
              </div>
              <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>1 session analyzed</p>
            </div>

            {/* 10 Kg Card */}
            <div style={{ background: "#F4F2FA", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="6" y1="12" x2="18" y2="12" /><circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg>
                  <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>10 Kg</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Avg 83</span>
              </div>
              <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", flex: 1 }}>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", background: "#2BC95B", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>83</span></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", border: "1px dashed #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <div style={{ flex: 1, height: "32px", background: "#34C759", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Bricolage Grotesque'" }}>85</span></div>
              </div>
              <p style={{ fontSize: "8px", fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>1 session analyzed</p>
            </div>
          </div>
        </div>

        {/* Your focus this week */}
        <div style={{
          background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
            <div style={{ width: "20px", height: "20px", background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)", borderRadius: "999px" }}></div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#000000" }}>Your focus this week</h3>
          </div>
          <p style={{ fontSize: "14px", fontFamily: "'Bricolage Grotesque'", color: "#000000", lineHeight: "17px" }}>Work on ankle mobility - it's limiting your squat depth at heavier weights.</p>
          <p style={{ fontSize: "12px", fontFamily: "'Bricolage Grotesque'", color: "#64748B", marginTop: "10px" }}>Try: heel elevated squats, banded ankle circles.</p>
        </div>

        {/* Form History */}
        <div style={{ background: "linear-gradient(135deg, #F9DAD2 0%, #E8D4F8 100%)", borderRadius: "16px", padding: "20px 12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: "#020D1B", margin: "0" }}>Form History</p>
              <p style={{ fontSize: "14px", fontFamily: "'Bricolage Grotesque'", color: "#39414D", margin: "0" }}>Your last 3 Analyses</p>
            </div>
            <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", fontSize: "14px", fontWeight: 600, fontFamily: "'Bricolage Grotesque'", color: "#39414D", cursor: "pointer" }}>View All</button>
          </div>

          {historyLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: "99px", background: "#F4F2FA", borderRadius: "16px", animation: "pulse 2s infinite" }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", background: "#F4F2FA", borderRadius: "16px" }}>
              <p style={{ fontSize: "14px", color: "#999", marginBottom: "15px" }}>No sessions yet</p>
              <button onClick={() => navigate("/upload")} style={{
                padding: "10px 20px",
                background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "'Bricolage Grotesque'"
              }}>Upload your first video</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {history.map((s, index) => {
                const exerciseName = (s.exercise || "Session").toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const dateLabel = s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown date";
                const score = Math.round(s.score ?? 0);
                const isExpanded = expandedCards[s.analysis_id] || false;
                const feedback = s.feedback || "No feedback available";

                // Construct image URL from formhistory folder if available
                const userId = localStorage.getItem("active_user_id") || "user_001";
                let imageUrl = s.image_url;
                if (!imageUrl) {
                  if (userId === "user_003") {
                    imageUrl = `/formhistory/${userId}/user_003_${index + 1}.jpg`;
                  }
                }

                // Check if feedback is long enough to warrant truncation
                const lines = feedback.split('\n');
                const needsTruncation = lines.length > 3 || feedback.length > 200;
                const displayFeedback = isExpanded ? feedback : (lines.slice(0, 3).join('\n'));

                return (
                  <div key={s.analysis_id} style={{
                    background: "#F4F2FA",
                    borderRadius: "16px",
                    padding: "10px",
                    display: "flex",
                    gap: "10px",
                    textAlign: "left"
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: "70px",
                      height: "56px",
                      flexShrink: 0,
                      background: "linear-gradient(158.8deg, rgba(255, 35, 38, 0.2) 0%, rgba(151, 71, 255, 0.2) 22.39%, rgba(2, 132, 199, 0.2) 100.81%)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      overflow: "hidden"
                    }} onClick={() => navigate("/upload/results", { state: { analysisId: s.analysis_id } })}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={exerciseName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling?.style.setProperty('display', 'flex');
                          }}
                        />
                      ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9747FF" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <button onClick={() => navigate("/upload/results", { state: { analysisId: s.analysis_id } })} style={{ background: "none", border: "none", cursor: "pointer", padding: "0" }}>
                          <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Bricolage Grotesque'", color: "#000000", margin: "0" }}>{exerciseName}</p>
                        </button>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FF8D28", fontFamily: "'Poppins'" }}>{score}</span>
                          <span style={{ fontSize: "7px", fontWeight: 400, color: "#000000", fontFamily: "'Poppins'" }}>/100</span>
                        </div>
                      </div>
                      <p style={{ fontSize: "7px", fontFamily: "'DM Sans'", color: "#39414D", margin: "0", lineHeight: "10px" }}>{dateLabel} • {s.load_kg}Kg • {s.rep_count} Reps</p>
                      <p style={{
                        fontSize: "11px",
                        fontFamily: "'DM Sans'",
                        color: "#000000",
                        margin: "0",
                        lineHeight: "14px",
                        overflow: isExpanded ? "visible" : "hidden",
                        display: isExpanded ? "block" : "-webkit-box",
                        WebkitLineClamp: isExpanded ? "unset" : 3,
                        WebkitBoxOrient: "vertical"
                      }}>
                        {displayFeedback}
                      </p>
                      {needsTruncation && (
                        <button
                          onClick={() => setExpandedCards({ ...expandedCards, [s.analysis_id]: !isExpanded })}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "8px",
                            fontWeight: 600,
                            fontFamily: "'DM Sans'",
                            color: "#0284C7",
                            cursor: "pointer",
                            padding: "0",
                            marginTop: "2px",
                            textAlign: "left"
                          }}
                        >
                          {isExpanded ? "See less" : "See more"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        padding: "10px 20px 20px",
        borderTop: "1px solid rgba(255, 255, 255, 0.3)"
      }}>
        {[
          { label: "Home", icon: "house", gradient: true },
          { label: "Plan", icon: "barbell", gradient: false },
          { label: "Analysis", icon: "analysis", gradient: false },
          { label: "Timeline", icon: "chart", gradient: false },
          { label: "Profile", icon: "user", gradient: false }
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.label === "Home" ? "/home" : item.label === "Profile" ? "/profile" : "#")} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: item.gradient ? "linear-gradient(159.34deg, #A9AAFF 0%, #DBD4FC 46.7%, #0B52CC 95.65%)" : "transparent",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {item.icon === "house" && <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: item.gradient ? "#FFFFFF" : "#494949" }}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>}
              {item.icon === "barbell" && <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: item.gradient ? "#FFFFFF" : "#494949" }}><rect x="2" y="10" width="20" height="4" /><rect x="4" y="12" width="3" height="2" /><rect x="17" y="12" width="3" height="2" /></svg>}
            </div>
            <p style={{ fontSize: "12px", fontFamily: "'DM Sans'", color: item.gradient ? "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)" : "#494949", WebkitBackgroundClip: item.gradient ? "text" : "unset", WebkitTextFillColor: item.gradient ? "transparent" : "unset" }}>{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function HomePage() {
  const { activeUser, activeUserId, clearUser } = useUser()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeUserId) return

    setLoading(true)
    setError(null)

    fetch(`${BASE_URL}/users/${activeUserId}/details`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setProfile(data.user_profile ?? null)
        setWorkouts(Array.isArray(data.workout_sessions) ? data.workout_sessions : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeUserId])

  if (!activeUser) return <Navigate to="/login" replace />
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eeff] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0eeff] flex items-center justify-center px-4">
        <p className="text-sm text-red-500 text-center">{error}</p>
      </div>
    )
  }

  const displayName = profile?.display_name || activeUser.name
  const profileLevel = profile?.level || activeUser.level
  const workoutCalendar = getWorkoutCalendar(workouts)

  return (
    <div className="min-h-screen" style={{ background: "#F4F2FA" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-6 pb-3" style={{ background: "#F4F2FA" }}>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a1a2e" }}>
            Hey {displayName}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#8b8ba7" }}>
            {activeUser.greeting}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#8b8ba7" }}>
            Level: {profileLevel}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => { clearUser(); navigate("/login") }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#f0eeff" }}
          >
            <CalendarDays size={16} color="#6C5CE7" />
          </button>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#f0eeff" }}
          >
            <Bell size={16} color="#6C5CE7" />
          </button>
        </div>
      </div>

      <WeekCalendar userId={activeUserId} calendar={workoutCalendar} />
      <ReadyCTA />
      <ProgressLadder userId={activeUserId} user={activeUser} />
      <FormHistory userId={activeUserId} />
    </div>
  )
}

export default HomePage

