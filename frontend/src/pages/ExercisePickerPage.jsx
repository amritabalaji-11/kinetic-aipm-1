import { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, ChevronLeft } from "lucide-react"
import { EXERCISES } from "../data/dummyData"

const FILTERS = ["All", "Compound", "Isolation", "Recommended"]

export default function ExercisePickerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedMuscles = location.state?.selectedMuscles ?? []
  const preSelected = location.state?.preSelected ?? []

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [selected, setSelected] = useState(preSelected)

  const visible = useMemo(() => {
    return EXERCISES.filter((ex) => {
      const matchesMuscle =
        selectedMuscles.length === 0 ||
        ex.groups.some((g) => selectedMuscles.includes(g))
      const matchesFilter =
        filter === "All" || filter === "Recommended" || ex.category === filter
      const matchesQuery =
        query === "" ||
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.muscles.some((m) => m.toLowerCase().includes(query.toLowerCase()))
      return matchesMuscle && matchesFilter && matchesQuery
    })
  }, [selectedMuscles, filter, query])

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handlePick = () => {
    const exercises = EXERCISES.filter((ex) => selected.includes(ex.id))
    navigate("/plan/order", { state: { selectedMuscles, selectedExercises: exercises } })
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-36" style={{ background: "#f5f4fb" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-4" style={{ color: "#6C5CE7", width: "fit-content" }}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Pick your exercises</h1>
      <p className="mt-1 text-sm text-gray-400">Pick a muscle group to start.</p>

      {/* Search */}
      <div
        className="flex items-center gap-2 mt-5 px-4 py-3 rounded-2xl"
        style={{ background: "white", border: "1.5px solid #e8e4f8" }}
      >
        <Search size={16} color="#9ca3af" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your exercise"
          className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: filter === f ? "#6C5CE7" : "white",
              color: filter === f ? "white" : "#374151",
              border: filter === f ? "none" : "1.5px solid #e8e4f8",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-3 mt-5">
        {visible.map((ex) => {
          const active = selected.includes(ex.id)
          return (
            <div
              key={ex.id}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
              style={{
                background: active
                  ? "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(196,181,253,0.55) 12%, rgba(167,139,250,0.48) 65%, rgba(147,197,253,0.52) 100%)"
                  : "white",
                border: active ? "2px solid #a78bfa" : "2px solid #e8e4f8",
                transition: "border-color 0.15s",
              }}
            >
              <div
                className="rounded-xl overflow-hidden flex-shrink-0"
                style={{ width: 56, height: 56, background: "transparent" }}
              >
                <img
                  src={ex.image}
                  alt={ex.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{ex.name}</p>
                <p className="text-xs text-gray-400 truncate">{ex.muscles.join(", ")}</p>
              </div>
              <button
                onClick={() => toggle(ex.id)}
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  border: active ? "none" : "1.5px solid #d1d5db",
                  background: active ? "#6C5CE7" : "white",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    color: active ? "white" : "#9ca3af",
                    fontWeight: 300,
                    transform: active ? "rotate(45deg)" : "none",
                    display: "inline-block",
                    transition: "transform 0.15s",
                  }}
                >
                  +
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="fixed bottom-24 left-0 right-0 mx-auto px-5" style={{ maxWidth: 430 }}>
        <button
          disabled={selected.length === 0}
          onClick={handlePick}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base"
          style={{
            background: selected.length > 0
              ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
              : "#d1cce8",
            transition: "background 0.2s",
            cursor: selected.length > 0 ? "pointer" : "default",
          }}
        >
          {selected.length > 0 ? `Pick exercise (${selected.length})` : "Pick exercise"}
        </button>
      </div>
    </div>
  )
}
