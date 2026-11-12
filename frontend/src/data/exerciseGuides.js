// Exercise guides shown on the exercise page (/exercise/:id), keyed by exercise id from dummyData.js (EXERCISES).
// The goblet squat and the dumbbell deadlift have one so far. Full draft with sources: docs/exercise-guides-draft/goblet-squat.md
//
// status "draft" = not yet reviewed by a trainer; the page says so.
// easier/harder steps with an `exerciseId` link to that exercise's own page once it has a guide.

const GOBLET_SQUAT = {
  status: "draft",
  summary: "Hold one weight at your chest and sit straight down between your knees. The squat to learn first.",
  level: "Beginner – Intermediate",
  muscles: { main: ["Quads", "Glutes"], helping: ["Hamstrings", "Core", "Upper back"] },
  videos: {
    women: {
      youtubeId: "7-80HiXX1K8",
      credit: "Le Sweat",
      creditUrl: "https://www.youtube.com/@lesweat",
      watchUrl: "https://www.youtube.com/shorts/7-80HiXX1K8",
      vertical: true,
    },
    men: null, // not chosen yet
  },
  keyCues: [
    "Big breath in, brace your core, hold the weight tight to your chest.",
    "Sit down between your knees. Knees over your little toes, heels stay down.",
    "Push the floor away through your whole foot. Chest and hips rise together.",
  ],
  stance: "Feet about shoulder-width apart, toes turned out slightly, whole foot planted.",
  depth: {
    goal: "Hips at or just below knee height. It is a goal, not a must: ankle and hip mobility and body shape decide how deep you can go.",
    stopWhen: ["Your heels start to lift.", "Your lower back starts to round or tuck under.", "Your knees cave in."],
    afterStop: "That is your depth for today. Pause one second, then stand. Don't push lower to chase the target. Your depth improves as your mobility does.",
    posture: "Your hips and knees bend together. Keep your chest tall and don't fold forward at the waist.",
  },
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

// Full draft with sources and open questions: docs/exercise-guides-draft/dumbbell-deadlift.md
const DB_DEADLIFT = {
  status: "draft",
  summary: "Push your hips back, lower the weights down your legs with a flat back, then stand tall by driving through your heels.",
  level: "Beginner – Intermediate",
  muscles: { main: ["Glutes", "Hamstrings"], helping: ["Lower back", "Upper back", "Core", "Forearms"] },
  videos: {
    women: {
      youtubeId: "YQgs03p3UxE",
      credit: "Live Lean TV",
      creditUrl: "https://www.youtube.com/@LiveLeanTV",
      watchUrl: "https://www.youtube.com/shorts/YQgs03p3UxE",
      vertical: true,
    },
    men: null, // not chosen yet
  },
  keyCues: [
    "Push your hips back, like closing a car door behind you with your bottom. This is a hinge, not a squat.",
    "Keep the weights close to your legs and your back long and flat, from head to tailbone. Neck in line with your spine.",
    "Drive through your heels to stand tall. Squeeze your glutes and pull your shoulder blades back at the top. Don't lean back.",
  ],
  stance: "Feet hip-width apart, toes turned out slightly, knees soft. Brace your core, as if you were about to take a punch.",
  depth: {
    title: "How low",
    goal: "About knee height, or just past it, as far as you can keep your back flat. It is a goal, not a must: hamstring and hip mobility decide how low you can go.",
    stopWhen: ["Your back starts to round.", "Your knees start to bend a lot, so it is turning into a squat.", "The weights drift away from your legs."],
    afterStop: "That is your depth for today. Reset for one second, then stand. Don't chase more depth.",
    posture: "Your chest stays up and your core stays tight the whole way.",
  },
  breathing: "In and brace as you start to hinge, out as you stand",
  tempo: "2 down · 1 reset · 1 up",
  setsReps: "2–3 sets of 8–12",
  startWeight: "Start light: a weight you can control for 8–12 reps. Add weight slowly once the hinge feels automatic.",
  setup: [
    "Stand tall with feet about hip-width apart, toes slightly out, a soft bend in your knees.",
    "Hold a dumbbell in each hand. At your sides is easier to balance if you are just starting. In front of your thighs, palms facing you, works your glutes and hamstrings more.",
    "Shoulders back and down, chest up, neck in line with your spine. Picture a broomstick running from your head to your tailbone.",
    "Breathe in and brace your core.",
  ],
  movement: [
    "Push your hips straight back. Let the dumbbells slide down your legs, close to your body.",
    "Knees stay soft, not locked, and bend only a little. Back long and flat.",
    "Lower to about knee height or just past it, or as far as you can keep your back flat. Stop there.",
    "Drive through your heels and push your hips forward to stand. Shoulders and hips rise together.",
    "At the top, squeeze your glutes and pull your shoulder blades back. Stand tall, don't lean back.",
  ],
  mistakes: [
    { mistake: "Rounding the back", fix: "Keep your shoulder blades, back and hips in one straight line. If you can't, stop a little higher and practise the hinge with no weight first." },
    { mistake: "Turning it into a squat", fix: "Push your hips back first. Your shins stay almost vertical." },
    { mistake: "Locking the knees", fix: "Keep a soft bend. Don't lock them straight." },
    { mistake: "Dumbbells drift away from your legs", fix: "Keep them brushing your legs the whole way." },
    { mistake: "Pulling with the arms or shoulders", fix: "Arms stay long and loose. The strength comes from your legs and hips." },
    { mistake: "Leaning back at the top", fix: "Stand tall and squeeze your glutes. Stop when your hips are fully forward." },
    { mistake: "Looking up or craning the neck", fix: "Keep your neck in line with your spine. Look at the floor a few steps ahead." },
  ],
  easier: [
    { name: "Wall Hip Hinge", what: "No weight. Stand a foot from a wall with your back to it, push your hips back until your bottom taps the wall, then stand.", pickIf: "you can't keep your back flat, or feel it in your lower back" },
    { name: "Raised Deadlift", what: "Rest the dumbbells on blocks or sturdy books so you start higher.", pickIf: "you can hinge with no weight but can't reach knee height with a flat back" },
    { name: "KB Deadlift", exerciseId: "ex_095", what: "One kettlebell or vertical dumbbell, held between your feet.", pickIf: "two dumbbells feel awkward or you want a lighter start" },
  ],
  harder: [
    { name: "Barbell Deadlift", exerciseId: "ex_015", what: "The same hinge with a barbell. With dumbbells, your arms and grip tend to give way before your legs and hips do. A barbell carries more weight, so your legs and hips can lift heavier.", pickIf: "you can do 12 clean reps and the dumbbells you have feel too light, or your arms tire first" },
    { name: "One-Arm DB Deadlift", what: "One dumbbell at your side, same hinge. The uneven load works your hips and core harder.", pickIf: "you can do 12 clean reps with two dumbbells. Do the same reps each side" },
  ],
  safety: [
    "Stop if you feel sharp pain in your back, or pain running down a leg.",
    "If you've had back pain or an injury, ask a doctor or physio before loading this.",
    "Control the weights and don't drop them from height. If the weight doesn't feel right, leave it on the floor.",
    "With high blood pressure or a heart condition, ask your doctor before bracing hard and holding your breath.",
  ],
}

// Full draft with sources: docs/exercise-guides-draft/db-shoulder-press.md (cues approved by Amrit; cues 2 and 3 still to be checked by a trainer)
const DB_SHOULDER_PRESS = {
  status: "draft",
  summary: "Press two dumbbells straight up from your shoulders, using your shoulders and arms, not your legs. The overhead press to learn first.",
  level: "Beginner – Intermediate",
  muscles: { main: ["Shoulders", "Triceps"], helping: ["Chest", "Upper back", "Core"] },
  videos: {
    women: {
      youtubeId: "cw4pTDmf4J0",
      credit: "SquatCouple",
      creditUrl: "https://www.youtube.com/@SQUATCOUPLE",
      watchUrl: "https://www.youtube.com/shorts/cw4pTDmf4J0",
      vertical: true,
    },
    men: {
      youtubeId: "wO0l5jW2NtQ",
      credit: "Elite Performance",
      creditUrl: "https://www.youtube.com/@eliteperformance2721",
      watchUrl: "https://www.youtube.com/shorts/wO0l5jW2NtQ",
      vertical: true,
    },
  },
  keyCues: [
    "Sit or stand. Standing: press the floor away, hips and knees stay still. The power comes from your shoulders. Sitting takes your legs out of it.",
    "Dumbbells side by side, palms forward, forearms straight up. Elbows a little in front of you, not out wide. If palms forward pinches your shoulder, turn them in a little.",
    "Press straight up until the dumbbells are over your shoulders. Don't arch your back.",
  ],
  breathing: "In and brace before each press, out as you press up",
  tempo: "1 up · 1 at the top · 2 down",
  setsReps: "3 sets of 8–12",
  startWeight: "Start light: a weight you could press 12 times with good form. Add weight only when every rep stays controlled and you don't arch your back.",
  setup: [
    "Pick up the dumbbells and bring them to shoulder height, side by side, palms facing forward (or turned in a little if that pinches), elbows a little in front of your body.",
    "Stand with feet about hip-width apart, whole foot planted, knees soft but still. (Or sit on a bench with a back, feet flat.)",
    "Squeeze your glutes, brace your core and pull your ribs down so your lower back stays flat.",
    "Keep your wrists straight over your elbows, forearms upright.",
  ],
  movement: [
    "Breathe in, then press both dumbbells straight up until they are over your shoulders and your arms are almost straight. Don't lock out hard.",
    "Keep your head still and your ribs down. If your lower back starts to arch, stop a little lower.",
    "Lower slowly, about 2 seconds, back to shoulder height. Elbows stay under your wrists.",
    "Legs stay still the whole time. Don't dip your knees or bounce to get the weight up.",
  ],
  mistakes: [
    { mistake: "Lower back arches, ribs flare", fix: "Squeeze your glutes and pull your ribs down. Use a lighter weight, or sit with back support." },
    { mistake: "Legs help push the weight up (knees dip and straighten)", fix: "Keep your knees soft and still. If the weight only moves with leg help, it is too heavy." },
    { mistake: "Elbows flare wide", fix: "Keep your elbows under your wrists, a little in front of your body." },
    { mistake: "Wrists bend back", fix: "Stack your wrist over your elbow, with the weight resting on the base of your palm." },
    { mistake: "Pushing your head forward as the weight passes", fix: "Tuck your chin slightly and keep your neck long." },
    { mistake: "Dumbbells crash together at the top", fix: "Press straight up and keep them apart. Stop short of a hard lockout." },
    { mistake: "Dropping the weight quickly", fix: "Take 2 seconds to lower it." },
  ],
  easier: [
    { name: "Seated Shoulder Press", what: "Sit on a bench with back support, feet flat.", pickIf: "you arch your back, or lose balance standing" },
    { name: "Lighter weight, same press", what: "Drop the weight until every rep is smooth.", pickIf: "the last reps need leg help or a back arch" },
  ],
  harder: [
    { name: "Tempo Press", what: "3 seconds down, 1 second pause at your shoulders.", pickIf: "you can do 12 clean reps" },
    { name: "Seated Arnold Press", exerciseId: "ex_039", what: "Rotate your palms as you press.", pickIf: "you can do 12 clean reps and want more shoulder work" },
    { name: "DB Push Press", exerciseId: "ex_043", what: "A different exercise: a small dip and drive from your legs helps lift the weight.", pickIf: "you want to lift heavier with leg help, on purpose" },
  ],
  safety: [
    "Stop if you feel sharp pain or pinching at the top of your shoulder.",
    "Take care with a shoulder, neck or lower back injury. Ask a doctor or physio before adding weight.",
    "With high blood pressure or a heart condition, ask your doctor before bracing hard and holding your breath.",
    "Control the weights and don't drop them from height. A spotter helps with heavy sets.",
  ],
}

// Full draft with sources: docs/exercise-guides-draft/db-romanian-deadlift.md (cues and depth worded by Amrit; depth still to be checked by a trainer)
const DB_ROMANIAN_DEADLIFT = {
  status: "draft",
  summary: "Push your hips back, slide the dumbbells down your legs with a flat back until you feel your hamstrings stretch, then stand tall.",
  level: "Beginner – Intermediate",
  muscles: { main: ["Hamstrings", "Glutes"], helping: ["Lower back", "Upper back", "Core", "Forearms"] },
  videos: {
    women: {
      youtubeId: "CBOhr6H7BEY",
      credit: "ArielYu_Fit",
      creditUrl: "https://www.youtube.com/@ArielYu_Fit",
      watchUrl: "https://www.youtube.com/shorts/CBOhr6H7BEY",
      vertical: true,
    },
    men: {
      youtubeId: "hu3jRvTc_po",
      credit: "Andrew Kwong (DeltaBolic)",
      creditUrl: "https://www.youtube.com/shorts/hu3jRvTc_po",
      watchUrl: "https://www.youtube.com/shorts/hu3jRvTc_po",
      vertical: true,
    },
  },
  keyCues: [
    "Soft knees, then push your hips back, as if closing a car door behind you with your bottom. It is a hinge, not a squat.",
    "Weights close, back straight. Keep the dumbbells close to your legs and your back long and flat, from head to tailbone.",
    "Hamstring stretch, then stand. Lower until you feel your hamstrings stretch, a few inches below your knee, then drive your hips forward and stand tall. Don't lean back at the top.",
  ],
  stance: "Feet hip-width apart, toes pointing forward or turned out slightly, knees softly bent. Brace your core.",
  depth: {
    title: "How low",
    goal: "A few inches below your knee, until you feel a stretch in the back of your thighs, as long as your back stays flat. It is a goal, not a must: hamstring mobility decides how low you can go.",
    stopWhen: ["Your back starts to round.", "Your knees start to bend a lot, so it is turning into a squat.", "The dumbbells drift away from your legs."],
    afterStop: "That is your depth for today. Pause one second, then stand. Don't chase more depth.",
    posture: "Your chest stays up and your core stays tight the whole way.",
  },
  breathing: "In and brace as you start to hinge, out as you stand",
  tempo: "2 down · 1 pause · 1 up",
  setsReps: "3 sets of 8–12",
  startWeight: "Start light: a weight you can control for 8–12 reps. Add weight slowly once the hinge feels automatic.",
  setup: [
    "Stand tall holding a dumbbell in each hand in front of your thighs, palms facing your legs.",
    "Feet hip-width apart, a soft bend in your knees. Keep that same bend the whole set.",
    "Shoulders back and down, chest up, neck in line with your spine.",
    "Breathe in and brace your core.",
  ],
  movement: [
    "Push your hips straight back. Your knees bend only a little, and your shins stay almost upright.",
    "Slide the dumbbells down your thighs and shins, keeping them close to your legs.",
    "Stop a few inches below your knee, when you feel your hamstrings stretch or your back is about to round.",
    "Drive your hips forward and stand tall. Squeeze your glutes at the top. Don't lean back.",
  ],
  mistakes: [
    { mistake: "Knees bend a lot and it turns into a squat", fix: "Push your hips back first, and keep the same soft knee bend all the way down." },
    { mistake: "Back rounds", fix: "Stop higher. Keep your chest up and your back long from head to tailbone." },
    { mistake: "Dumbbells drift away from your legs", fix: "Keep them brushing against your thighs and shins." },
    { mistake: "Knees locked straight", fix: "Keep a soft bend, never locked." },
    { mistake: "Leaning back at the top", fix: "Stand tall and squeeze your glutes. Don't push your hips past straight." },
    { mistake: "Dropping the weights quickly", fix: "Take 2 seconds to lower them." },
    { mistake: "Looking up or tucking your chin", fix: "Look at the floor a few steps ahead. Keep your neck in line with your spine." },
  ],
  easier: [
    { name: "Wall Hip Hinge", what: "No weight. Stand a foot from a wall with your back to it, push your hips back until your bottom taps the wall, then stand.", pickIf: "you can't keep your back flat or feel it in your lower back" },
    { name: "Lighter weight, same lift", what: "Drop the weight until every rep is smooth.", pickIf: "your back rounds or the weights drift away" },
    { name: "KB Deadlift", exerciseId: "ex_095", what: "One weight held between your feet, starting from the floor.", pickIf: "holding two dumbbells in front of you feels awkward" },
  ],
  harder: [
    { name: "Pause RDL", what: "Hold the bottom for 3 seconds each rep.", pickIf: "you can do 12 clean reps" },
    { name: "Barbell Romanian Deadlift", exerciseId: "ex_002", what: "The same hinge with a barbell. It carries more weight.", pickIf: "you can do 12 clean reps and the dumbbells feel too light" },
    { name: "Single-leg RDL", what: "One dumbbell, one leg.", pickIf: "you can do 12 clean reps and want a balance challenge" },
  ],
  safety: [
    "Stop if you feel sharp pain in your back, or pain running down a leg.",
    "If you've had back pain or an injury, ask a doctor or physio before loading this.",
    "Control the weights and don't drop them from height.",
    "With high blood pressure or a heart condition, ask your doctor before bracing hard and holding your breath.",
  ],
}

export const GUIDES = {
  ex_001: GOBLET_SQUAT, // DB Goblet Squat
  ex_049: GOBLET_SQUAT, // KB Goblet Squat: same movement, same guide
  ex_025: DB_DEADLIFT, // DB Deadlift
  ex_029: DB_SHOULDER_PRESS, // DB Shoulder Press
  ex_048: DB_ROMANIAN_DEADLIFT, // DB Romanian Deadlift
}

export const getExerciseGuide = (exerciseId) => GUIDES[exerciseId] ?? null
// Which demo video to show: the one the person last picked (women / men), else the women's. A guide with one video shows that one.
const PREF_KEY = "videoAudience"
export const getVideoPref = () => { try { return localStorage.getItem(PREF_KEY) === "men" ? "men" : "women" } catch { return "women" } }
export const setVideoPref = (who) => { try { localStorage.setItem(PREF_KEY, who) } catch { /* private mode: the pick lasts until the page closes */ } }
export const hasBothVideos = (guide) => Boolean(guide?.videos?.women && guide?.videos?.men)
export const guideVideo = (guide, pref = getVideoPref()) => guide?.videos?.[pref] ?? guide?.videos?.women ?? guide?.videos?.men ?? null

export const hasExerciseGuide = (exerciseId) => Boolean(GUIDES[exerciseId])

// What the Listen button reads out: the short version only
export function guideToSpeech(name, guide) {
  const stop = guide.depth && `${guide.depth.stopWhen.map((w) => w.replace(/\.$/, "").replace(/^Your/, "your")).join(", or ").replace(/, or (?=[^,]*$)/, " or ").replace(/, or /g, ", ")}`
  return [
    `${name}. ${guide.summary}`,
    guide.stance && `Stance: ${guide.stance}`,
    guide.depth && `Depth: ${guide.depth.goal} Stop going down if ${stop}.`,
    `Key cues. ${guide.keyCues.join(" ")}`,
    `Breathing: ${guide.breathing}. Tempo: ${guide.tempo}.`,
  ].filter(Boolean).join(" ")
}
