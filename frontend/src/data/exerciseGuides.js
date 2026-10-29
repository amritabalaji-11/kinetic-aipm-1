// Exercise guides shown on the exercise page (/exercise/:id), keyed by exercise id from dummyData.js (EXERCISES).
// Only the goblet squat has one so far. Full draft with sources: docs/exercise-guides-draft/goblet-squat.md
//
// status "draft" = not yet reviewed by a trainer; the page says so.
// easier/harder steps with an `exerciseId` link to that exercise's own page once it has a guide.

const GOBLET_SQUAT = {
  status: "draft",
  summary: "Hold one weight at your chest and sit straight down between your knees. The squat to learn first.",
  level: "Beginner – Intermediate",
  muscles: { main: ["Quads", "Glutes"], helping: ["Hamstrings", "Core", "Upper back"] },
  video: {
    youtubeId: "7-80HiXX1K8",
    credit: "Le Sweat",
    creditUrl: "https://www.youtube.com/@lesweat",
    watchUrl: "https://www.youtube.com/shorts/7-80HiXX1K8",
    vertical: true,
  },
  keyCues: [
    "Big breath in, brace your core, hold the weight tight to your chest.",
    "Sit down between your knees. Knees over your little toes, heels stay down.",
    "Push the floor away through your whole foot. Chest and hips rise together.",
  ],
  stance: "Feet about shoulder-width apart, toes turned out slightly, whole foot planted.",
  breathing: "In and brace at the top, out as you stand",
  tempo: "2 down · 1 pause · 1 up",
  setsReps: "2–3 sets of 8–12",
  startWeight: "Start light: a weight you could lift 12–15 times with good form. Add weight once 12 reps feel easy.",
  setup: [
    "Hold one dumbbell upright against your chest (or a kettlebell by the horns), elbows pointing down.",
    "Feet about shoulder-width apart, toes turned out slightly.",
    "Big breath in, brace your core, chest tall.",
    "Eyes forward, or slightly down at a spot on the floor a few steps ahead. Keep your neck long, in line with your spine.",
  ],
  movement: [
    "Sit down and slightly back, hips and knees bending together. Elbows stay close to your ribs.",
    "Go as low as you can with your heels down and your back flat. Hips at or just below knee height is the goal.",
    "Pause one second at the bottom, then push both feet into the floor and stand.",
  ],
  mistakes: [
    { mistake: "Heels lift off the floor", fix: "Warm up your ankles, or put a small plate under your heels." },
    { mistake: "Knees cave inward", fix: "Squeeze your glutes and push your knees out over your little toes." },
    { mistake: "Weight drifts down to your belly", fix: "Keep it at chest height and think “chest up”." },
    { mistake: "Dropping fast or barely going down", fix: "Count two seconds down and pause at the bottom." },
    { mistake: "Hips shoot up before your chest", fix: "Lead with your chest and drive through both heels." },
    { mistake: "Looking up (at the mirror, say) or tucking your chin", fix: "Look straight ahead, or at a spot on the floor a few steps in front. Keep your neck long, in line with your spine." },
  ],
  easier: [
    { name: "Chair Squat", exerciseId: "ex_186", what: "Sit back until you lightly touch a chair, then stand. The seat shows you how deep to go.", pickIf: "you lose balance or can't control the way down" },
    { name: "Air Squat", exerciseId: "ex_061", what: "No weight. Arms out in front for balance.", pickIf: "the chair squat feels easy and you want to practise without weight" },
    { name: "Heel-Raised Goblet Squat", exerciseId: "ex_187", what: "Same squat with a small plate under both heels.", pickIf: "your heels lift or you tip forward because your ankles are tight" },
  ],
  harder: [
    { name: "Pause Goblet Squat", exerciseId: "ex_188", what: "Hold the bottom for 3 seconds each rep.", pickIf: "you can do 12 clean reps" },
    { name: "Bulgarian Squat", exerciseId: "ex_003", what: "One foot behind you on a bench, squat on the front leg.", pickIf: "you can do 12 clean reps and want a one-leg challenge" },
  ],
  safety: [
    "Stop if you feel sharp pain, or pinching at the front of your hip.",
    "Take care with a knee, hip or lower back injury. Ask a doctor or physio before adding weight.",
    "With high blood pressure or a heart condition, ask your doctor before bracing hard and holding your breath.",
  ],
}

export const GUIDES = {
  ex_001: GOBLET_SQUAT, // DB Goblet Squat
  ex_049: GOBLET_SQUAT, // KB Goblet Squat: same movement, same guide
}

export const getExerciseGuide = (exerciseId) => GUIDES[exerciseId] ?? null
export const hasExerciseGuide = (exerciseId) => Boolean(GUIDES[exerciseId])

// What the Listen button reads out: the short version only
export function guideToSpeech(name, guide) {
  return `${name}. ${guide.summary} Stance: ${guide.stance}. Key cues. ${guide.keyCues.join(" ")} Breathing: ${guide.breathing}. Tempo: ${guide.tempo}.`
}
