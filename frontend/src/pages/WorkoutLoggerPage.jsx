import { useState, useEffect } from "react"
import { Clock, Dumbbell, Calendar } from "lucide-react"

const FOCUS_LABEL = {
  chest: "Chest", back: "Back", legs: "Legs",
  shoulders: "Shoulders", arms: "Arms", full_body: "Full Body",
}

const WorkoutLoggerPage = () => {
  const [workouts, setWorkouts] = useState([])

  useEffect(() => {
    const savedWorkouts = JSON.parse(localStorage.getItem("workouts") || "[]")
    setWorkouts(savedWorkouts.reverse())
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 24px 140px 24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          fontFamily: "'Bricolage Grotesque'",
          color: "#0F172A",
          margin: "0 0 8px 0",
        }}>
          Workout Logger
        </h1>
        <p style={{
          fontSize: "14px",
          fontWeight: 400,
          fontFamily: "'DM Sans'",
          color: "#454850",
          margin: 0,
        }}>
          Track your created workouts
        </p>
      </div>

      {workouts.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 24px",
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid rgba(2, 132, 199, 0.4)",
        }}>
          <p style={{ fontSize: "16px", color: "#454850", margin: 0 }}>
            No workouts created yet. Start by creating a new workout!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {workouts.map((workout) => (
            <div
              key={workout.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(2, 132, 199, 0.4)",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}>
                  <Calendar size={16} color="#8133FF" />
                  <span style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "'Bricolage Grotesque'",
                    color: "#0F172A",
                  }}>
                    {workout.date}
                  </span>
                </div>

                <div style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#6C5CE7",
                    fontWeight: 500,
                  }}>
                    <Clock size={14} />
                    {workout.duration} min
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#6C5CE7",
                    fontWeight: 500,
                  }}>
                    <Dumbbell size={14} />
                    {workout.exercises.length} exercises
                  </div>
                  <span style={{
                    fontSize: "12px",
                    color: "#6C5CE7",
                    fontWeight: 500,
                  }}>
                    Focus: {workout.focusLabel}
                  </span>
                </div>
              </div>

              <div style={{
                borderTop: "1px solid #f0eeff",
                paddingTop: "12px",
              }}>
                <p style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#454850",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Exercises
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {workout.exercises.map((ex, idx) => (
                    <div key={idx} style={{
                      fontSize: "13px",
                      color: "#0F172A",
                      fontWeight: 500,
                    }}>
                      {idx + 1}. {ex.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkoutLoggerPage
