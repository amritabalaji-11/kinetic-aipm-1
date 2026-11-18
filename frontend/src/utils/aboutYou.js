// What each row on the About you page shows. The two most personal answers (gender, injuries) show only whether they are set;
// what the answer actually is opens when the row is tapped. The others show the answer itself.
import { QUESTIONS } from "../data/aboutYou"

const labelOf = (q, value) => q.options.find(([v]) => v === value)?.[1] ?? value

// `about` is what the server gave back for the person (see GET /auth/me/about)
export function rowSummary(key, about = {}) {
  if (key === "injuries") {
    if (about.has_injury === true) return "Yes"
    if (about.has_injury === false) return "No"
    return "Not set"
  }
  if (key === "gender") return about.gender ? "Set" : "Not set"
  const q = QUESTIONS.find((x) => x.key === key)
  if (!q) return "Not set"
  if (key === "training_types") {
    const picked = (about.training_types || []).map((v) => labelOf(q, v))
    return picked.length ? picked.join(", ") : "Not set"
  }
  return about[key] ? labelOf(q, about[key]) : "Not set"
}

// The rows, in order. `key` is the answer's name on the server ("injuries" covers has_injury and its details).
export const ROWS = [
  ...QUESTIONS.filter((q) => q.key !== "gender").map((q) => ({ key: q.key, title: q.label.replace(" Select all that apply.", "") })),
  { key: "gender", title: "Gender" },
  { key: "injuries", title: "Injuries or pain" },
]
