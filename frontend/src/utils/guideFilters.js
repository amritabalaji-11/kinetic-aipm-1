import { equipmentLabel } from "./exerciseCatalog"

// Which guides to show for a search and the two filters. `group` and `equipment` are "" for "all".
// Each guide here is { exerciseId, guide, exercise } (the exercise is its catalogue entry).
export function filterGuides(guides, { q = "", group = "", equipment = "" } = {}) {
  const needle = q.trim().toLowerCase()
  return guides.filter(({ exercise }) =>
    (!group || exercise.groups.includes(group)) &&
    (!equipment || exercise.equipment === equipment) &&
    (!needle || [exercise.name, ...exercise.muscles, equipmentLabel(exercise)].some((t) => t.toLowerCase().includes(needle))))
}

// The options for a filter with how many guides each has, most guides first. Only options that have a guide are listed.
export function filterOptions(guides, key) {
  const counts = new Map()
  for (const { exercise } of guides) for (const v of key === "group" ? exercise.groups : [exercise.equipment]) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
}

export const formatLength = (seconds) => (seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "")
