import { useState } from "react"
import { useNavigate, useParams, Navigate } from "react-router-dom"
import { ArrowLeftRight, ChevronLeft } from "lucide-react"
import { PRESET_WORKOUTS } from "../data/presetWorkouts"
import { equipmentLabel } from "../utils/exerciseCatalog"
import { confirmWorkout } from "../utils/startWorkout"
import PumpButton from "../components/PumpButton"
import { blocksFromPlanner } from "../utils/workoutModel"
import SwapSheet from "../components/SwapSheet"
import { BlockTag, ExerciseLine, PurpleDivider, RoundButton, SectionHeading, cardStyle, BRICOLAGE, DM_SANS, GRAY, INK, PURPLE } from "../components/planUi"

const SECTIONS = [
  { id: "warmup", title: "Warm-up", tint: true },
  { id: "workout", title: "Workout" },
  { id: "conditioning", title: "Conditioning" },
]

// The plan, shown the way the PDF lays it out. Nothing is logged here: it is only a preview.
export default function WorkoutPlannerPage() {
  const navigate = useNavigate()
  const { presetId } = useParams()
  const preset = PRESET_WORKOUTS.find((p) => p.id === presetId)
  const [blocks, setBlocks] = useState(() => preset?.blocks?.map((b) => ({ ...b, items: b.items.map((i) => ({ ...i })) })) ?? [])
  const [swapping, setSwapping] = useState(null) // { blockIndex, itemIndex }

  if (!preset || !preset.blocks) return <Navigate to="/plan" replace />

  const swapItem = swapping ? blocks[swapping.blockIndex].items[swapping.itemIndex] : null

  // Keep the PDF's order: a new section starts whenever the type of block changes
  // (e.g. endurance block, metcon, endurance block, metcon)
  const groups = []
  blocks.forEach((b, blockIndex) => {
    const last = groups[groups.length - 1]
    if (last && last.section === b.section) last.blocks.push({ b, blockIndex })
    else groups.push({ section: b.section, blocks: [{ b, blockIndex }] })
  })

  const applySwap = (exercise) => {
    const { blockIndex, itemIndex } = swapping
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIndex ? b : {
          ...b,
          items: b.items.map((it, ii) =>
            ii !== itemIndex ? it : {
              ...it,
              name: exercise.name,
              exerciseId: exercise.id,
              alternatives: [],
              // keep the plan's reps or time, show the new exercise's equipment
              sub: `${(it.sub || "").split(" · ")[0]} · ${equipmentLabel(exercise)}`.replace(/^ · /, ""),
            }
          ),
        }
      )
    )
    setSwapping(null)
  }

  // The whole plan goes to the logging screen: rep-based lifts get weight and reps rows,
  // warm-ups, drills and timed work become a tick-off list.
  const create = () => confirmWorkout(navigate, { blocks: blocksFromPlanner(blocks), muscles: preset.muscles, presetTitle: preset.title, minutes: preset.minutes })

  return (
    <div style={{ minHeight: "100vh", background: "#F0EFFE", padding: "20px 20px 140px" }}>
      <button type="button" onClick={() => navigate("/plan")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PURPLE, fontFamily: DM_SANS, fontWeight: 600, fontSize: 14, padding: 0, marginBottom: 10 }}>
        <ChevronLeft size={18} /> Back
      </button>
      <h1 style={{ fontFamily: BRICOLAGE, fontWeight: 600, fontSize: 24, color: INK, margin: "0 0 2px" }}>{preset.title}</h1>
      <p style={{ fontFamily: DM_SANS, fontSize: 14, color: GRAY, margin: 0 }}>{preset.subtitle}</p>

      {groups.map((group, groupIndex) => {
        const section = SECTIONS.find((x) => x.id === group.section)
        return (
          <div key={groupIndex}>
            <SectionHeading title={section.title} />
            <div style={section.tint ? { ...cardStyle, background: "#EDF5FF", border: "1px solid rgba(2,132,199,0.35)", boxShadow: "none" } : cardStyle}>
              {group.blocks.map(({ b, blockIndex }, n) => (
                <div key={blockIndex}>
                  {n > 0 && <PurpleDivider />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: n === 0 ? "8px 0 2px" : "10px 0 2px" }}>
                    <BlockTag>{b.tag}</BlockTag>
                    <span style={{ fontFamily: DM_SANS, fontSize: 11, color: GRAY }}>{b.note}</span>
                  </div>
                  {b.items.map((it, itemIndex) => (
                    <ExerciseLine
                      key={itemIndex}
                      name={it.name}
                      exerciseId={it.exerciseId}
                      sub={it.sub}
                      muted={it.rest}
                      right={it.exerciseId && (
                        <RoundButton label={`Swap ${it.name}`} onClick={() => setSwapping({ blockIndex, itemIndex })}>
                          <ArrowLeftRight size={15} color={PURPLE} strokeWidth={2.2} />
                        </RoundButton>
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ marginTop: 14 }}>
        <PumpButton onPumped={create}>Confirm today&apos;s workout</PumpButton>
      </div>

      {swapping && swapItem && (
        <SwapSheet
          currentId={swapItem.exerciseId}
          planAlternativeIds={swapItem.alternatives ?? []}
          onPick={applySwap}
          onClose={() => setSwapping(null)}
        />
      )}
    </div>
  )
}
