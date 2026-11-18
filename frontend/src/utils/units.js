// The unit a person logs weights in ("kg" or "lbs"). The server keeps their choice; until they have made one we use a default from the phone's region,
// so nothing is ever left without a unit. Sets already saved keep the unit they were logged in; only new sets and the way numbers are shown follow the choice.

const LBS_REGIONS = new Set(["US", "LR", "MM"]) // the places that mostly use pounds: the United States, Liberia and Myanmar

// "en-US" -> "lbs", "en-GB" / "de-DE" / "hi-IN" / "en" (no region) -> "kg"
export function regionDefaultUnit(locales) {
  const list = Array.isArray(locales) ? locales : [locales]
  for (const tag of list) {
    const region = String(tag || "").split(/[-_]/)[1]
    if (region) return LBS_REGIONS.has(region.toUpperCase()) ? "lbs" : "kg"
  }
  return "kg"
}

export function phoneDefaultUnit() {
  try { return regionDefaultUnit(navigator.languages?.length ? [...navigator.languages] : navigator.language) } catch { return "kg" }
}

export const isUnit = (u) => u === "kg" || u === "lbs"
export const unitOf = (saved) => (isUnit(saved) ? saved : phoneDefaultUnit())

const LB_PER_KG = 2.20462262185

// A weight in kg, shown in `unit` (to the nearest half pound, or 0.1 kg)
export function fromKg(kg, unit) {
  if (kg == null || Number.isNaN(Number(kg))) return null
  return unit === "lbs" ? Math.round(Number(kg) * LB_PER_KG * 2) / 2 : Math.round(Number(kg) * 10) / 10
}

// A weight logged in `from`, shown in `to`; the same unit comes back as it was
export function convertUnit(value, from, to) {
  if (value == null || value === "" || from === to) return value
  const kg = /^lb/i.test(from || "") ? Number(value) / LB_PER_KG : Number(value)
  return fromKg(kg, to)
}

// "kg" -> "kg", "lb" / "lbs" / "LBS" -> "lbs", nothing -> "kg" (older sets were all kg)
export const normaliseUnit = (u) => (/^lb/i.test(u || "") ? "lbs" : "kg")
