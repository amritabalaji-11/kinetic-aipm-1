import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { X, Clock, ChevronLeft, CheckCircle } from "lucide-react"

const FOCUS_LABEL = {
  chest: "Chest", back: "Back", legs: "Legs",
  shoulders: "Shoulders", arms: "Arms", full_body: "Full Body",
}

function estimateDuration(count) {
  return count * 10 + 5
}

export default function WorkoutOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedMuscles = location.state?.selectedMuscles ?? []
  const [exercises, setExercises] = useState(location.state?.selectedExercises ?? [])

  const [dragIndex, setDragIndex] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const removeExercise = (id) =>
    setExercises((prev) => prev.filter((ex) => ex.id !== id))

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setExercises((prev) => {
      const next = [...prev]
      const [item] = next.splice(dragIndex, 1)
      next.splice(index, 0, item)
      return next
    })
    setDragIndex(index)
  }

  const handleDragEnd = () => setDragIndex(null)

  const handleCreateWorkout = () => {
    // Create active workout session with 3 default sets per exercise
    const activeWorkout = {
      id: Date.now(),
      startDate: new Date().toLocaleDateString(),
      startTime: new Date().toLocaleTimeString(),
      muscles: selectedMuscles,
      exercises: exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscles: ex.muscles,
        sets: [
          { id: Date.now() + 1, setNumber: 1, weight: "", reps: "", videoUrl: null, completed: false },
          { id: Date.now() + 2, setNumber: 2, weight: "", reps: "", videoUrl: null, completed: false },
          { id: Date.now() + 3, setNumber: 3, weight: "", reps: "", videoUrl: null, completed: false }
        ]
      })),
      focusLabel: selectedMuscles.length === 1
        ? FOCUS_LABEL[selectedMuscles[0]] ?? "Mixed"
        : selectedMuscles.length > 1 ? "Mixed" : "General",
      status: "active"
    }

    // Save active workout
    localStorage.setItem("activeWorkout", JSON.stringify(activeWorkout))

    // Show success and navigate
    setShowSuccess(true)
    setTimeout(() => {
      navigate("/workout/active", { state: { workoutId: activeWorkout.id } })
    }, 1500)
  }

  const focusLabel =
    selectedMuscles.length === 1
      ? FOCUS_LABEL[selectedMuscles[0]] ?? "Mixed"
      : selectedMuscles.length > 1
      ? "Mixed"
      : "General"

  const duration = estimateDuration(exercises.length)

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-36" style={{ background: "#f5f4fb" }}>
      <button
        onClick={() => navigate("/plan/exercises", { state: { selectedMuscles, preSelected: exercises.map(e => e.id) } })}
        className="flex items-center gap-1 mb-4"
        style={{ color: "#6C5CE7", width: "fit-content" }}
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Set your order</h1>
      <p className="mt-1 text-sm text-gray-400">Drag to reorder exercises</p>

      {/* Ordered list */}
      <div className="flex flex-col gap-3 mt-6">
        {exercises.map((ex, i) => (
          <div
            key={ex.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-3 rounded-2xl px-3 py-3"
            style={{
              background: "white",
              border: "2px solid #e8e4f8",
              opacity: dragIndex === i ? 0.5 : 1,
              cursor: "grab",
              transition: "opacity 0.15s",
            }}
          >
            {/* Drag handle */}
            <div
              style={{ color: "#c4b5fd", fontSize: 18, lineHeight: 1, letterSpacing: "0.05em", userSelect: "none" }}
            >
              ⠿
            </div>

            {/* Number badge */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-semibold"
              style={{
                width: 32,
                height: 32,
                background: "#f0eeff",
                color: "#6C5CE7",
                border: "1.5px solid #e0d9fb",
              }}
            >
              {i + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{ex.name}</p>
              <p className="text-xs text-gray-400 truncate">{ex.muscles.join(", ")}</p>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeExercise(ex.id)}
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, border: "1.5px solid #d1d5db", background: "white" }}
            >
              <X size={14} color="#9ca3af" />
            </button>
          </div>
        ))}
      </div>

      {/* Workout Summary card */}
      <div
        className="mt-5 rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(196,181,253,0.55) 12%, rgba(167,139,250,0.48) 65%, rgba(147,197,253,0.52) 100%)",
          minHeight: 140,
        }}
      >
        <div className="p-4 pr-28">
          <p className="font-bold text-base text-gray-900">Workout Summary</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs font-medium text-gray-800">
              <Clock size={13} />
              {duration} min
            </span>
            <span className="text-xs font-medium text-gray-800">Focus: {focusLabel}</span>
            <span className="text-xs font-medium text-gray-800">{exercises.length} exercises</span>
          </div>

          <button
            onClick={() => navigate("/plan/exercises", { state: { selectedMuscles, preSelected: exercises.map(e => e.id) } })}
            className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "white", color: "#7C3AED" }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}>+</span>
            Add new exercise
          </button>
        </div>

        {/* Muscle figure */}
        <img
          src="/summary_figure.png"
          alt=""
          style={{
            position: "absolute",
            right: -10,
            top: 0,
            height: "130%",
            objectFit: "contain",
            objectPosition: "top right",
            opacity: 0.9,
          }}
        />
      </div>

      {/* CTA */}
      <div className="fixed left-0 right-0 mx-auto px-5" style={{ bottom: "140px", maxWidth: 430 }}>
        <button
          disabled={exercises.length === 0 || showSuccess}
          onClick={handleCreateWorkout}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base"
          style={{
            background: exercises.length > 0 && !showSuccess
              ? "linear-gradient(135deg, #4158D0, #6C5CE7, #C850C0)"
              : "#d1cce8",
            transition: "background 0.2s",
            cursor: exercises.length > 0 && !showSuccess ? "pointer" : "default",
          }}
        >
          {showSuccess ? "Workout Created! ✓" : "Create Workout"}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
        >
          <div
            className="bg-white rounded-3xl p-8 text-center mx-4"
            style={{ maxWidth: 320 }}
          >
            <div className="flex justify-center mb-4">
              <CheckCircle size={60} color="#6C5CE7" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout Created!</h2>
            <p className="text-gray-600 mb-6">
              {exercises.length} exercises ready to go
            </p>
            <p className="text-sm text-gray-400">Redirecting to Workout Logger...</p>
          </div>
        </div>
      )}
    </div>
  )
}
