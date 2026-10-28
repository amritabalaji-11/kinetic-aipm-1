// Helpers for entering the weight on the Upload screen.

// Weights that actually exist on a gym floor, by equipment, so one tap is usually enough
export const QUICK_WEIGHTS = {
  dumbbell:   { kg: [4, 6, 8, 10, 12, 14, 16, 20], lbs: [10, 15, 20, 25, 30, 35, 40, 50] },
  kettlebell: { kg: [4, 6, 8, 12, 16, 20, 24, 32], lbs: [10, 15, 25, 35, 45, 55, 70] },
  barbell:    { kg: [20, 30, 40, 50, 60, 80, 100], lbs: [45, 65, 85, 115, 135, 155, 185] },
}
export const quickWeights = (equipment, unit) => (QUICK_WEIGHTS[equipment] ?? QUICK_WEIGHTS.dumbbell)[unit]

export const STEP = { kg: 2.5, lbs: 5 }   // what the − and + buttons move by
export const MAX_WEIGHT = { kg: 200, lbs: 440 }

export const clampWeight = (value, unit) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), MAX_WEIGHT[unit])

// 12 -> "12", 12.5 -> "12.5"
export const formatWeight = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

// Switching kg/lbs keeps the same load: 12 kg -> 26.5 lbs (to the nearest half)
export function convertWeight(value, from, to) {
  if (from === to) return value
  const converted = from === "kg" ? value * 2.20462 : value * 0.453592
  return Math.round(converted * 2) / 2
}

// The weight last used for an exercise, remembered on this device
const lastKey = (movement) => `lastLoad:${movement}`
export function readLastLoad(movement) {
  try {
    const saved = JSON.parse(localStorage.getItem(lastKey(movement)) || "null")
    return saved && saved.value > 0 && (saved.unit === "kg" || saved.unit === "lbs") ? saved : null
  } catch { return null }
}
export function saveLastLoad(movement, value, unit) {
  try { localStorage.setItem(lastKey(movement), JSON.stringify({ value, unit })) } catch { /* private mode: skip */ }
}
