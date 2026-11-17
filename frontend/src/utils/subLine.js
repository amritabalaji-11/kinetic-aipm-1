// The line under an exercise's name looks like "10-12 reps · KB, you can use DB or Barbell as well" or "10-12 reps · each leg".
// The amount (and a short word such as "each leg") stays on the main line; a longer note goes on a quieter line of its own.
const SHORT = 16

export function splitSub(sub = "") {
  const parts = String(sub || "").split(" · ").map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return { main: "", note: "" }
  const rest = parts.slice(1).join(" · ")
  if (!rest) return { main: parts[0], note: "" }
  return rest.length <= SHORT ? { main: `${parts[0]} · ${rest}`, note: "" } : { main: parts[0], note: rest }
}
