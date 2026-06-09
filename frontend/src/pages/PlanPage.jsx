import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MUSCLE_GROUPS } from "../data/dummyData"

export default function PlanPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-32" style={{ background: "#f5f4fb" }}>
      <h1 className="text-2xl font-bold text-gray-900 leading-tight">
        What are we<br />training today?
      </h1>
      <p className="mt-1 text-sm text-gray-400">Pick 1 or more muscle group to start.</p>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {MUSCLE_GROUPS.map((mg) => {
          const active = selected.includes(mg.id)
          return (
            <button
              key={mg.id}
              onClick={() => toggle(mg.id)}
              className="rounded-2xl overflow-hidden text-left"
              style={{
                background: active
                  ? "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(196,181,253,0.55) 12%, rgba(167,139,250,0.48) 65%, rgba(147,197,253,0.52) 100%)"
                  : "#F4F2FA",
                border: active ? "2px solid #a78bfa" : "2px solid #e8e4f8",
                boxShadow: active ? "0 0 0 3px rgba(167,139,250,0.15)" : "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                minHeight: 160,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="flex-1 flex items-end justify-center pt-4"
                style={{ background: "transparent", transition: "background 0.15s" }}
              >
                <img
                  src={mg.image}
                  alt={mg.name}
                  style={{
                    height: 100,
                    width: "100%",
                    objectFit: "contain",
                    objectPosition: "center bottom",
                    filter: active ? "none" : "grayscale(20%)",
                    opacity: active ? 1 : 0.85,
                  }}
                />
              </div>
              <div className="px-3 py-2.5">
                <p className="font-semibold text-gray-900 text-sm">{mg.name}</p>
                <p className="text-xs text-gray-400">{mg.count} exercises</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div className="fixed bottom-24 left-0 right-0 mx-auto px-5" style={{ maxWidth: 430 }}>
        <button
          disabled={selected.length === 0}
          onClick={() => navigate("/plan/exercises", { state: { selectedMuscles: selected } })}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base"
          style={{
            background: selected.length > 0
              ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
              : "#d1cce8",
            transition: "background 0.2s",
            cursor: selected.length > 0 ? "pointer" : "default",
          }}
        >
          Pick a Muscle
        </button>
      </div>
    </div>
  )
}
