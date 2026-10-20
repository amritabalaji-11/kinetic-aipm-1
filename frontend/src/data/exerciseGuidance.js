// Pre-exercise form guidance, shown before the first set.
// Keys match the exercise ids in dummyData.js (EXERCISES).
//
// Goblet Squat: cues, mistakes and warm-up come from
// backend/coaching_references/goblet_squat_coaching_reference.md (Parts 4 and 5),
// so the guide uses the same language as the AI coaching after a video scan.
// The setup steps are standard technique and have NOT been reviewed by a trainer yet.

export const GUIDANCE = {
  ex_001: {
    summary: "Hold the weight at your chest and sit straight down between your knees.",
    setup: [
      "Hold one dumbbell or kettlebell upright against your chest, elbows pointing down.",
      "Stand with feet about shoulder-width apart, toes turned out slightly.",
      "Take a big breath in and brace your core before you go down.",
      "Spread the floor apart with your feet and keep your whole foot planted.",
      "Chest tall, eyes forward. Keep the weight at chest height the whole time.",
    ],
    cues: [
      "Sit down, not back — keep your weight balanced across your whole foot.",
      "Push your knees out over your little toe as you sit and as you stand.",
      "Hip crease drops below your kneecap — that is the depth target.",
      "Slow 2-count down, pause one second at the bottom, then drive up through both heels.",
      "Chest and hips rise together on the way up.",
    ],
    mistakes: [
      { mistake: "Heels lift off the floor", fix: "Warm up your ankles first, or try a small plate under your heels." },
      { mistake: "Knees cave inward", fix: "Squeeze your glutes and push your knees out over your little toe." },
      { mistake: "Weight drifts down to your belly", fix: "Keep it at chest height and think chest up." },
      { mistake: "Dropping fast, shallow depth", fix: "Count two seconds down and pause at the bottom." },
      { mistake: "Hips shoot up before your chest", fix: "Lead with your chest and drive through both heels equally." },
    ],
    warmup: [
      { drill: "Banded ankle circles", dose: "1 × 20 each side" },
      { drill: "Wall ankle mobility", dose: "2 × 30 sec each side" },
      { drill: "90/90 hip rotations", dose: "2 × 60 sec each side" },
      { drill: "Kneeling hip flexor stretch", dose: "2 × 45 sec each side" },
    ],
  },
}

// Shown for every exercise that doesn't have its own guide yet.
const GENERIC = {
  summary: "A detailed guide for this exercise is coming soon. Use these basics for now.",
  setup: [
    "Pick a weight you can control for every rep.",
    "Set your feet or grip before you start, then take a big breath and brace your core.",
    "Move slowly down and up — no bouncing or jerking.",
  ],
  cues: [
    "Control the way down, don't drop.",
    "Keep your chest tall and your core braced.",
    "Stop the set if you feel sharp pain.",
  ],
  mistakes: [],
  warmup: [],
}

// True when there is a real, written guide (not the placeholder)
export const hasGuidance = (exerciseId) => Boolean(GUIDANCE[exerciseId])

export function getGuidance(exerciseId) {
  const specific = GUIDANCE[exerciseId]
  return specific ? { ...specific, isPlaceholder: false } : { ...GENERIC, isPlaceholder: true }
}

// Text for the Listen button. Kept short (the /tts route caps at 1,500 characters).
export function guidanceToSpeech(name, g) {
  return [
    `${name}.`,
    g.summary,
    "Setup.",
    ...g.setup,
    g.cues.length ? "Key cues." : "",
    ...g.cues.slice(0, 4),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1450)
}
