import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronDown, Plus, VideoIcon, Check } from "lucide-react"

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [workout, setWorkout] = useState(null)
  const [expandedExercise, setExpandedExercise] = useState(0)

  useEffect(() => {
    const activeWorkout = JSON.parse(localStorage.getItem("activeWorkout") || "{}")
    setWorkout(activeWorkout)
  }, [])

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    if (!workout) return
    const updated = { ...workout }
    updated.exercises[exerciseIndex].sets[setIndex][field] = value
    setWorkout(updated)
    localStorage.setItem("activeWorkout", JSON.stringify(updated))
  }

  const [savedNotification, setSavedNotification] = useState(null)
  const [notificationPos, setNotificationPos] = useState({ top: 0, left: 0 })
  const [showConfetti, setShowConfetti] = useState(false)

  const isSetComplete = (set) => {
    return set.weight && set.reps && set.weight !== "" && set.reps !== ""
  }

  const handleRecordClick = () => {
    navigate("/upload")
  }

  const handleSaveSet = (exerciseIndex, setIndex, event) => {
    if (!workout) return

    // Get button position
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()

    const updated = { ...workout }
    updated.exercises[exerciseIndex].sets[setIndex].completed = true
    setWorkout(updated)
    localStorage.setItem("activeWorkout", JSON.stringify(updated))

    // Show notification near button
    setNotificationPos({
      top: rect.top - 50,
      left: rect.left - 40
    })
    setSavedNotification(`Set ${workout.exercises[exerciseIndex].sets[setIndex].setNumber} saved!`)
    setTimeout(() => setSavedNotification(null), 2000)
  }

  const toggleExercise = (index) => {
    setExpandedExercise(expandedExercise === index ? -1 : index)
  }

  const addSet = (exerciseIndex) => {
    if (!workout) return
    const updated = { ...workout }
    const newSet = {
      id: Date.now(),
      setNumber: updated.exercises[exerciseIndex].sets.length + 1,
      weight: "",
      reps: "",
      videoUrl: null,
      completed: false
    }
    updated.exercises[exerciseIndex].sets.push(newSet)
    setWorkout(updated)
    localStorage.setItem("activeWorkout", JSON.stringify(updated))
  }

  const finishExercise = (exerciseIndex, event) => {
    if (!workout) return
    const updated = { ...workout }
    updated.exercises[exerciseIndex].finished = true
    setWorkout(updated)
    localStorage.setItem("activeWorkout", JSON.stringify(updated))

    // Get button position
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()

    // Show celebratory notification
    setNotificationPos({
      top: rect.top - 50,
      left: rect.left - 60
    })
    setSavedNotification(`👍 Good job! Move to next exercise`)
    setTimeout(() => setSavedNotification(null), 2500)

    // Auto-expand next exercise after a short delay
    setTimeout(() => {
      if (exerciseIndex + 1 < updated.exercises.length) {
        setExpandedExercise(exerciseIndex + 1)
      }
    }, 500)
  }

  const addExercise = () => {
    navigate("/plan/exercises", { state: { selectedMuscles: workout.muscles, inWorkout: true } })
  }

  const finishWorkout = () => {
    if (!workout) return

    // Show confetti and celebration
    setShowConfetti(true)

    // Show celebration toast
    setSavedNotification(`🎉 Great job, you had a strong ${workout.focusLabel.toLowerCase()} day!`)

    // Save completed workout to history after celebration
    setTimeout(() => {
      const completedWorkout = {
        ...workout,
        status: "completed",
        endDate: new Date().toLocaleDateString(),
        endTime: new Date().toLocaleTimeString()
      }

      const existingWorkouts = JSON.parse(localStorage.getItem("workouts") || "[]")
      existingWorkouts.push(completedWorkout)
      localStorage.setItem("workouts", JSON.stringify(existingWorkouts))

      // Clear active workout
      localStorage.removeItem("activeWorkout")

      navigate("/workout-logger")
    }, 3000)
  }

  if (!workout) return <div style={{ padding: "24px", textAlign: "center" }}>Loading workout...</div>

  const focusLabel = workout.muscles.length === 1 ? workout.muscles[0].toUpperCase() : "Mixed"

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "24px 24px 140px 24px" }}>
      {/* Notification Toast */}
      {savedNotification && (
        <div
          style={{
            position: "fixed",
            top: showConfetti ? "50%" : `${notificationPos.top}px`,
            left: "50%",
            transform: showConfetti ? "translate(-50%, -50%)" : `translate(calc(-50% + ${notificationPos.left - window.innerWidth / 2}px), 0)`,
            padding: showConfetti ? "24px 32px" : "8px 12px",
            background: "#2ECD70",
            color: "#FFFFFF",
            borderRadius: showConfetti ? "16px" : "6px",
            fontSize: showConfetti ? "18px" : "12px",
            fontWeight: 600,
            fontFamily: "'Bricolage Grotesque'",
            zIndex: 1000,
            animation: showConfetti ? "popUpBig 0.5s ease-in-out" : "popUp 0.3s ease-in-out",
            whiteSpace: "nowrap",
            boxShadow: showConfetti ? "0 8px 32px rgba(46, 205, 112, 0.5)" : "0 4px 12px rgba(46, 205, 112, 0.4)",
          }}
        >
          {showConfetti ? savedNotification : `✓ ${savedNotification}`}
        </div>
      )}

      {/* Confetti */}
      {showConfetti && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: "-10px",
                width: "10px",
                height: "10px",
                background: ["#2ECD70", "#0284C7", "#9747FF", "#F586FF", "#FFD700"][Math.floor(Math.random() * 5)],
                borderRadius: "50%",
                animation: `fall ${2 + Math.random() * 1}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes popUp {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes popUpBig {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          fontFamily: "'Bricolage Grotesque'",
          color: "#0F172A",
          margin: "0 0 8px 0",
        }}>
          You got this!!
        </h1>
        <p style={{
          fontSize: "14px",
          fontWeight: 400,
          fontFamily: "'DM Sans'",
          color: "#454850",
          margin: 0,
        }}>
          Strong {focusLabel.toLowerCase()} on your way!
        </p>
      </div>

      {/* Exercises */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        {workout.exercises.map((exercise, exIdx) => (
          <div
            key={exercise.id}
            style={{
              background: "#FFFFFF",
              border: "1px solid #C4A7FF",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {/* Exercise Header */}
            <button
              onClick={() => toggleExercise(exIdx)}
              style={{
                width: "100%",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: exercise.finished
                  ? "#DBF0E5"
                  : expandedExercise === exIdx
                  ? "linear-gradient(92.52deg, rgba(2, 132, 199, 0.15) 0%, rgba(147, 71, 255, 0.15) 100%)"
                  : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
            >
              <span style={{
                fontSize: "16px",
                fontWeight: 600,
                fontFamily: "'Bricolage Grotesque'",
                color: "#0F172A",
              }}>
                {exercise.name}
                {exercise.finished && " ✓"}
              </span>
              <ChevronDown
                size={24}
                style={{
                  transform: expandedExercise === exIdx ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                  color: "#1E293B",
                }}
              />
            </button>

            {/* Expanded Content */}
            {expandedExercise === exIdx && (
              <div style={{ borderTop: "1px solid #C4A7FF", padding: "16px" }}>
                {/* Set Headers */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "40px 70px 70px 70px 50px",
                  gap: "12px",
                  marginBottom: "12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#0F172A",
                  fontFamily: "'DM Sans'",
                }}>
                  <div>Set</div>
                  <div>Record</div>
                  <div>kg</div>
                  <div>Reps</div>
                  <div>Check</div>
                </div>

                {/* Sets */}
                {exercise.sets.map((set, setIdx) => {
                  const isComplete = isSetComplete(set)
                  return (
                    <div
                      key={set.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px 70px 70px 70px 50px",
                        gap: "12px",
                        marginBottom: "12px",
                        alignItems: "center",
                        padding: "8px",
                        background: isComplete ? "#DBF0E5" : "transparent",
                        borderRadius: "4px",
                      }}
                    >
                      {/* Set Number */}
                      <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>
                        {set.setNumber}
                      </div>

                      {/* Record Button */}
                      <button
                        onClick={handleRecordClick}
                        style={{
                          padding: "8px",
                          background: "linear-gradient(105.93deg, #F586FF 0%, #7063FF 95.82%)",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <VideoIcon size={16} color="white" />
                      </button>

                      {/* Weight Input */}
                      <input
                        type="number"
                        value={set.weight || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                        placeholder="15"
                        style={{
                          padding: "8px 12px",
                          background: "#EAEAEA",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "14px",
                          color: set.weight ? "#252525" : "#949494",
                        }}
                      />

                      {/* Reps Input */}
                      <input
                        type="number"
                        value={set.reps || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                        placeholder="10"
                        style={{
                          padding: "8px 12px",
                          background: "#EAEAEA",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "14px",
                          color: set.reps ? "#2E2E2E" : "#949494",
                        }}
                      />

                      {/* Check Button */}
                      <button
                        onClick={(e) => handleSaveSet(exIdx, setIdx, e)}
                        disabled={!isComplete}
                        style={{
                          padding: "8px",
                          background: isComplete ? "#2ECD70" : "#E6E6E6",
                          border: "none",
                          borderRadius: "4px",
                          cursor: isComplete ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.3s",
                        }}
                      >
                        <Check size={16} color={isComplete ? "#FFFFFF" : "#494343"} />
                      </button>
                    </div>
                  )
                })}

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "12px",
                }}>
                  {/* Add Set Button */}
                  <button
                    onClick={() => addSet(exIdx)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#FCF9FF",
                      border: "1px solid #A36CFB",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily: "'Bricolage Grotesque'",
                      color: "#8133FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Plus size={18} />
                    Add Set
                  </button>

                  {/* Finish Exercise Button */}
                  <button
                    onClick={(e) => finishExercise(exIdx, e)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#FCF9FF",
                      border: "1px solid #A36CFB",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily: "'Bricolage Grotesque'",
                      color: "#8133FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Check size={18} />
                    Finish Exercise
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Exercise Button */}
      <button
        onClick={addExercise}
        style={{
          width: "100%",
          padding: "16px",
          marginBottom: "12px",
          background: "#FCF9FF",
          border: "1px solid #A36CFB",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: 600,
          fontFamily: "'Bricolage Grotesque'",
          color: "#8133FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Plus size={18} />
        Add new exercise
      </button>

      {/* Finish Workout Button */}
      <div style={{
        position: "fixed",
        bottom: "140px",
        left: "0",
        right: "0",
        display: "flex",
        justifyContent: "center",
        padding: "0 24px",
      }}>
        <button
          onClick={finishWorkout}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "16px",
            background: "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: 600,
            fontFamily: "'Bricolage Grotesque'",
            color: "#FFFFFF",
          }}
        >
          Finish Workout
        </button>
      </div>
    </div>
  )
}
