import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MUSCLE_GROUPS } from "../data/dummyData"

const MUSCLE_BORDER_COLORS = {
  chest: "1px solid rgba(2, 132, 199, 0.4)",
  back: "1px solid rgba(147, 71, 255, 0.4)",
  legs: "1px solid rgba(2, 132, 199, 0.4)",
  shoulders: "1px solid rgba(2, 132, 199, 0.4)",
  arms: "1px solid rgba(147, 71, 255, 0.4)",
  full_body: "1px solid rgba(2, 132, 199, 0.4)",
}

const PlanPage = () => {
  const navigate = useNavigate()
  const [selectedMuscles, setSelectedMuscles] = useState([])

  const handleMuscleClick = (muscleId) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscleId)
        ? prev.filter((id) => id !== muscleId)
        : [...prev, muscleId]
    )
  }

  const handleContinue = () => {
    navigate("/plan/exercises", { state: { selectedMuscles } })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 24px 120px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            fontFamily: "'Bricolage Grotesque'",
            color: "#0F172A",
            margin: "0 0 8px 0",
          }}
        >
          What are we training today?
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 400,
            fontFamily: "'DM Sans'",
            color: "#454850",
            margin: 0,
          }}
        >
          Pick 1 or more muscle group to start.
        </p>
      </div>

      {/* 2-column grid of muscle groups */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "48px",
        }}
      >
        {MUSCLE_GROUPS.map((muscle) => {
          const isSelected = selectedMuscles.includes(muscle.id)
          const isLegs = muscle.id === "legs"

          return (
            <button
              key={muscle.id}
              onClick={() => handleMuscleClick(muscle.id)}
              style={{
                position: "relative",
                width: "100%",
                height: "140px",
                background: "#FFFFFF",
                borderRadius: "16px",
                border: MUSCLE_BORDER_COLORS[muscle.id],
                cursor: "pointer",
                filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.14))",
                padding: "16px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              {/* Figure image */}
              <img
                src={muscle.image}
                alt={muscle.name}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  height: (muscle.id === "chest" || muscle.id === "full_body" || muscle.id === "back") ? "70px" : "88px",
                  objectFit: "contain",
                  objectPosition: "top right",
                }}
              />

              {/* Checkmark icon - shows when selected */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    width: "24px",
                    height: "24px",
                    background: "#8133FF",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      color: "#FFFFFF",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    ✓
                  </span>
                </div>
              )}

              {/* Muscle name */}
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  fontFamily: "'Bricolage Grotesque'",
                  color: "#8133FF",
                  margin: "0 0 4px 0",
                  position: "relative",
                  zIndex: 1,
                  maxWidth: "65%",
                }}
              >
                {muscle.name}
              </p>

              {/* Exercise count */}
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  fontFamily: "'DM Sans'",
                  color: "#0F172A",
                  margin: 0,
                  position: "relative",
                  zIndex: 1,
                  maxWidth: "65%",
                }}
              >
                {muscle.count} exercises
              </p>
            </button>
          )
        })}
      </div>

      {/* CTA button at bottom */}
      <div
        style={{
          position: "fixed",
          bottom: "140px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: "400px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleContinue}
          disabled={selectedMuscles.length === 0}
          style={{
            width: "100%",
            padding: "16px",
            background: selectedMuscles.length > 0
              ? "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
              : "#DBDBDB",
            color: "#FFFFFF",
            fontSize: "16px",
            fontWeight: 600,
            fontFamily: "'Bricolage Grotesque'",
            border: "none",
            borderRadius: "8px",
            cursor: selectedMuscles.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          {selectedMuscles.length > 0
            ? `Select ${selectedMuscles.length} Muscle${selectedMuscles.length > 1 ? 's' : ''}`
            : "Select a Muscle"}
        </button>
      </div>
    </div>
  )
}

export default PlanPage