// "Why 10-12 reps here?": a short plain explanation under an exercise, with weight, rest and how to progress.
// These are common coaching guidelines, so the words say "usually". They come from the exercise's tag and the plan's own reps or seconds.
import { muscleTag } from "./muscleTags"

// "10-12 reps · DB" -> "10–12 reps";  "30 secs" -> "30 secs";  anything else -> null
export function amountFrom(sub = "") {
  const reps = /(\d+)\s*[-–]\s*(\d+)\s*reps?\b/i.exec(sub) || /(\d+)()\s*reps?\b/i.exec(sub)
  if (reps) return reps[2] ? `${reps[1]}–${reps[2]} reps` : `${reps[1]} reps`
  const secs = /(\d+)\s*(?:secs?|seconds|s)\b/i.exec(sub)
  return secs ? `${secs[1]} secs` : null
}

const FACTS = {
  big: { weight: "Heavier", rest: "90 s–2 min", progress: "Add weight when the top of the range feels easy" },
  small: { weight: "Moderate", rest: "60–90 s", progress: "Add reps first, then weight" },
  power: { weight: "Light or none", rest: "Until you feel ready to go again", progress: "Move faster or jump higher, then add load" },
}

export function whyReps(exerciseId, _name, sub) {
  const tag = muscleTag(exerciseId)
  if (!tag) return null
  const amount = amountFrom(sub)
  const title = amount ? `Why ${amount} here?` : "Why this range?"
  const text = {
    big: `This move uses several big muscles together. Big muscles can take heavier weights, so the reps are usually fewer and the rest longer.`,
    small: `This move works one small muscle, mostly on its own. Smaller muscles usually do better with a moderate weight and more reps. Going too heavy tends to strain the joint instead.`,
    power: `This move is about moving fast, not moving heavy. Keep each rep sharp and stop when your speed drops.`,
  }[tag.kind]
  return { title, text, ...FACTS[tag.kind] }
}
