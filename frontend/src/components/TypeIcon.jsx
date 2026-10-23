// The icon for a kind of workout: a line icon per type, all in the same style (flexed arm, bent leg, plank, heart).
import { TYPE_META } from "../utils/workoutType"

export default function TypeIcon({ type, size = 20 }) {
  const meta = TYPE_META[type] || TYPE_META.other
  return <meta.Icon size={size} color={meta.color} strokeWidth={2.4} />
}
