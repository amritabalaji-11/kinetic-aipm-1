import { BottomSheet } from "./planUi"
import { Refresher } from "./NextUpCard"
import { getExerciseGuide } from "../data/exerciseGuides"
import { DM_SANS, GRAY } from "./planUi"

// Opened from a section's "Cues" button: a quick refresher for the exercises in that section (cues, video, voice),
// so you can read it all before you start instead of ticking your way to it.
export default function CuesSheet({ title, items, onClose }) {
  const seen = new Set()
  const guided = items.filter((it) => getExerciseGuide(it.exerciseId) && !seen.has(it.exerciseId) && seen.add(it.exerciseId))
  return (
    <BottomSheet title={title} onClose={onClose}>
      <p style={{ fontFamily: DM_SANS, fontSize: 13, color: GRAY, margin: "0 0 4px" }}>
        {guided.length === 1 ? "A quick refresher before you start." : "A quick refresher for each exercise in this section."}
      </p>
      {guided.map((it) => <Refresher key={it.key} item={{ ...it, label: it.sub || "" }} showName />)}
    </BottomSheet>
  )
}
