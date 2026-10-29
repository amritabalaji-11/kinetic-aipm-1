// Ready-made workouts shown under "Build your workout".
// Written from the "Day N" programme PDFs in the workout-plans Drive folder ("source" = the PDF's day).
// Each plan keeps its PDF structure as `blocks`: warm-up, workout and conditioning, in the PDF's order.
// The SOHFIT BUILD PDFs in that folder are copyright-restricted and are NOT used here.
//
// For each item: `exerciseId` links it to the catalogue (so it can be swapped);
// `sets` + `reps` mark the rep-based lifts in the main blocks, which are logged during the workout.
// Everything else (warm-ups, drills, timed work, AMRAP/EMOM finishers) is shown but not logged.
// GENERATED from the plan data; edit with care.

export const PRESET_CATEGORIES = [
  { id: "all", label: "All", icon: null },
  { id: "legs", label: "Leg Day", icon: "/Legs_figure.png" },
  { id: "upper", label: "Upper Body", icon: "/chest_figure.png" },
  { id: "full", label: "Full Body", icon: "/Fullbody_figure.png" },
]

export const PRESET_WORKOUTS = [
  {
    id: "leg_quads_glutes",
    title: "Leg Day: Quads & Glutes",
    image: "/Gobletsquat_figure.png",
    category: "legs",
    tag: "Hypertrophy",
    minutes: 55,
    muscles: ["legs"],
    source: "Day 15",
    blurb: "Heavy squat and hinge work, then glute and calf finishers.",
    subtitle: "Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "ATG Split Squats", "sub": "4 reps · each side, do it bodyweight", "exerciseId": "ex_051"},
        {"name": "Frog Glute Bridges", "sub": "8 reps", "exerciseId": "ex_052"},
        {"name": "Good Mornings", "sub": "4 reps", "exerciseId": "ex_053"},
        {"name": "Sumo Squat Pulses", "sub": "8 reps", "exerciseId": "ex_054"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Step Ups", "sub": "10-12 reps · weighted, each side, hold DBs in a suitcase style", "exerciseId": "ex_016", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "SUPERSET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Back Squats", "sub": "10-12 reps · barbell · or DB Front Rack Squats", "exerciseId": "ex_017", "sets": 3, "reps": "10-12", "alternatives": ["ex_026"]},
        {"name": "Hip Thrusters", "sub": "10-12 reps · DB · or Hip Thruster", "exerciseId": "ex_018", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Sumo Deadlifts", "sub": "10-12 reps · you can use DB or KBs or Barbell", "exerciseId": "ex_019", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "SUPERSET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Reverse Lunges", "sub": "10-12 reps · DB, total, keep alternating leg", "exerciseId": "ex_020", "sets": 3, "reps": "10-12"},
        {"name": "Hostage Squats", "sub": "30 secs · weighted", "exerciseId": "ex_082"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Calf Raises", "sub": "15-20 reps", "exerciseId": "ex_021", "sets": 3, "reps": "15-20"},
      ]},
      { section: "conditioning", tag: "4 MIN EMOM", note: "Every Minute on the Minute", items: [
        {"name": "Up and Back Dot Drill", "sub": "20 secs", "exerciseId": "ex_083"},
        {"name": "Single Leg Pogo Jump", "sub": "20 secs · alternate legs every round", "exerciseId": "ex_084"},
        {"name": "Rest", "sub": "20 secs", "rest": true},
      ]},
    ],
  },
  {
    id: "leg_single_leg",
    title: "Leg Day: Single-Leg Strength",
    image: "/Bulgariansquat_figure.png",
    category: "legs",
    tag: "Hypertrophy",
    minutes: 45,
    muscles: ["legs"],
    source: "Day 22",
    blurb: "One leg at a time to fix imbalances and build stability.",
    subtitle: "Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Single Leg Glute Bridges", "sub": "6 reps · each side", "exerciseId": "ex_055"},
        {"name": "World's Greatest Stretch", "sub": "20 secs · pick a side", "exerciseId": "ex_056"},
        {"name": "Bird Dog", "sub": "6 reps · each side", "exerciseId": "ex_057"},
        {"name": "World's Greatest Stretch", "sub": "20 secs · pick the opposite side", "exerciseId": "ex_056"},
        {"name": "Goblet Squat", "sub": "6 reps", "exerciseId": "ex_001"},
      ]},
      { section: "workout", tag: "TRISET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Bulgarian Split Squats", "sub": "8-10 reps · or Bulgarian Split Squat with a Pass Through (8-10 pass throughs on each leg)", "exerciseId": "ex_003", "sets": 3, "reps": "8-10"},
        {"name": "Rocking Chairs", "sub": "10-12 reps", "exerciseId": "ex_090", "sets": 3, "reps": "10-12"},
        {"name": "Plank Toe Touches", "sub": "40 secs · each side", "exerciseId": "ex_073"},
      ]},
      { section: "workout", tag: "TRISET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Deficit Sumo Squats", "sub": "8-10 reps · or Sumo Squats", "exerciseId": "ex_023", "sets": 3, "reps": "8-10"},
        {"name": "Single Leg Hip Thrusters", "sub": "10-12 reps · each leg", "exerciseId": "ex_022", "sets": 3, "reps": "10-12"},
        {"name": "Leg Lifts", "sub": "40 secs", "exerciseId": "ex_091"},
      ]},
      { section: "workout", tag: "TRISET 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Goblet Forward Lunges", "sub": "8-10 reps · each leg", "exerciseId": "ex_024", "sets": 3, "reps": "8-10"},
        {"name": "Drop Squats", "sub": "10-12 reps", "exerciseId": "ex_092", "sets": 3, "reps": "10-12"},
        {"name": "Single KB High Plank", "sub": "40 secs", "exerciseId": "ex_093"},
      ]},
      { section: "conditioning", tag: "5 MIN EMOM", note: "Every Minute on the Minute", items: [
        {"name": "DB Bear Crawl", "sub": "20 secs · 5 steps forward + back", "exerciseId": "ex_094"},
        {"name": "Weighted Hostage Squats", "sub": "20 secs", "exerciseId": "ex_082"},
        {"name": "Rest", "sub": "20 secs", "rest": true},
      ]},
    ],
  },
  {
    id: "leg_posterior",
    title: "Leg Day: Posterior Chain",
    image: "/Romaniandeadlift_figure.png",
    category: "legs",
    tag: "Hypertrophy",
    minutes: 45,
    muscles: ["legs"],
    source: "Day 25",
    blurb: "Hamstrings and glutes first, with squats and lunges to finish.",
    subtitle: "Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Single Leg Glute Bridges", "sub": "6 reps · each side", "exerciseId": "ex_055"},
        {"name": "World's Greatest Stretch", "sub": "20 secs · pick a side", "exerciseId": "ex_056"},
        {"name": "Bird Dog", "sub": "6 reps · each side", "exerciseId": "ex_057"},
        {"name": "World's Greatest Stretch", "sub": "20 secs · pick the opposite side", "exerciseId": "ex_056"},
        {"name": "Goblet Squat", "sub": "6 reps", "exerciseId": "ex_001"},
      ]},
      { section: "workout", tag: "TRISET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "KB Deadlift", "sub": "8-10 reps · or DB Deadlifts", "exerciseId": "ex_095", "sets": 3, "reps": "8-10", "alternatives": ["ex_025"]},
        {"name": "Hamstring Plank March", "sub": "10-12 reps · each leg", "exerciseId": "ex_096", "sets": 3, "reps": "10-12"},
        {"name": "Stationary Gorillas", "sub": "40 secs · hands off the ground", "exerciseId": "ex_097"},
      ]},
      { section: "workout", tag: "TRISET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Front Rack Squats", "sub": "8-10 reps", "exerciseId": "ex_026", "sets": 3, "reps": "8-10"},
        {"name": "Goblet Reverse Lunges", "sub": "10-12 reps · each leg", "exerciseId": "ex_098", "sets": 3, "reps": "10-12"},
        {"name": "Bear Crawl DB Slides", "sub": "40 secs · or DB Slides", "exerciseId": "ex_099"},
      ]},
      { section: "workout", tag: "TRISET 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Curtsy Squats", "sub": "8-10 reps · each leg", "exerciseId": "ex_027", "sets": 3, "reps": "8-10"},
        {"name": "Knees to Standing", "sub": "10-12 reps · total", "exerciseId": "ex_101", "sets": 3, "reps": "10-12"},
        {"name": "Sit Throughs", "sub": "40 secs", "exerciseId": "ex_100"},
      ]},
      { section: "conditioning", tag: "5 MIN AMRAP", note: "As Many Rounds As Possible", items: [
        {"name": "High Knees", "sub": "30 reps · total", "exerciseId": "ex_102"},
        {"name": "Jump Squats", "sub": "5 reps", "exerciseId": "ex_086"},
        {"name": "Mountain Climbers", "sub": "30 reps · total", "exerciseId": "ex_103"},
        {"name": "Box Jumps", "sub": "5 reps · or Step Ups (total)", "exerciseId": "ex_104", "alternatives": ["ex_105"]},
      ]},
    ],
  },
  {
    id: "leg_hypertrophy_mix",
    title: "Leg Day: Lunges & Pistols",
    image: "/Legs_figure.png",
    category: "legs",
    tag: "Hypertrophy",
    minutes: 45,
    muscles: ["legs"],
    source: "Day 18",
    blurb: "Pistol squats, sumo squats and lunges, plus swings and shin work.",
    subtitle: "Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "ATG Split Squats", "sub": "4 reps · each side, do it bodyweight", "exerciseId": "ex_051"},
        {"name": "Frog Glute Bridges", "sub": "8 reps", "exerciseId": "ex_052"},
        {"name": "Good Mornings", "sub": "4 reps", "exerciseId": "ex_053"},
        {"name": "Sumo Squat Pulses", "sub": "8 reps", "exerciseId": "ex_054"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Kickstand Pistol Squats", "sub": "10-12 reps · each side", "exerciseId": "ex_045", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "SUPERSET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Sumo Squats", "sub": "10-12 reps · KB, you can use DB or Barbell as well", "exerciseId": "ex_023", "sets": 3, "reps": "10-12"},
        {"name": "Alternating Forward Lunges", "sub": "10-12 reps · each leg", "exerciseId": "ex_046", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Hamstring March", "sub": "30-40 secs", "exerciseId": "ex_085"},
      ]},
      { section: "workout", tag: "SUPERSET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "KB Swings", "sub": "10-12 reps", "exerciseId": "ex_042", "sets": 3, "reps": "10-12"},
        {"name": "Jump Squats", "sub": "30 secs", "exerciseId": "ex_086"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Anterior Tib Raises", "sub": "15-20 reps", "exerciseId": "ex_047", "sets": 3, "reps": "15-20"},
      ]},
      { section: "conditioning", tag: "4 MIN EMOM", note: "Every Minute on the Minute", items: [
        {"name": "Lateral Shuffle", "sub": "15 secs", "exerciseId": "ex_087"},
        {"name": "Ice Skaters", "sub": "15 secs", "exerciseId": "ex_088"},
        {"name": "Squat Hold", "sub": "15 secs", "exerciseId": "ex_089"},
        {"name": "Rest", "sub": "15 secs", "rest": true},
      ]},
    ],
  },
  {
    id: "upper_press_row",
    title: "Upper Body: Press & Row",
    image: "/Shoulders_figure.png",
    category: "upper",
    tag: "Strength",
    minutes: 50,
    muscles: ["shoulders", "back", "chest"],
    source: "Day 26",
    blurb: "Pairs pressing with rowing so shoulders, chest and back stay balanced.",
    subtitle: "Push/Pull – Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Scapula Push Ups", "sub": "5 reps", "exerciseId": "ex_068"},
        {"name": "Thoracic Rotations", "sub": "10 reps · total", "exerciseId": "ex_060"},
        {"name": "DB Shoulder Press", "sub": "5 reps", "exerciseId": "ex_029"},
        {"name": "DB Bent Over Row", "sub": "10 reps", "exerciseId": "ex_038"},
      ]},
      { section: "workout", tag: "TRISET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Shoulder Press", "sub": "8-10 reps", "exerciseId": "ex_029", "sets": 3, "reps": "8-10"},
        {"name": "Single Arm Rows", "sub": "10-12 reps · each arm", "exerciseId": "ex_030", "sets": 3, "reps": "10-12"},
        {"name": "OH Carry", "sub": "40 secs", "exerciseId": "ex_106"},
      ]},
      { section: "workout", tag: "TRISET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Alternating DB Floor Press", "sub": "8-10 reps · each arm", "exerciseId": "ex_031", "sets": 3, "reps": "8-10"},
        {"name": "Dual KB Pendlay Rows", "sub": "10-12 reps", "exerciseId": "ex_032", "sets": 3, "reps": "10-12"},
        {"name": "Pogo Jumps", "sub": "40 secs", "exerciseId": "ex_063"},
      ]},
      { section: "workout", tag: "TRISET 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Rear Delt Raises", "sub": "8-10 reps", "exerciseId": "ex_033", "sets": 3, "reps": "8-10"},
        {"name": "DB Bicep Curls", "sub": "10-12 reps", "exerciseId": "ex_013", "sets": 3, "reps": "10-12"},
        {"name": "Suitcase Carry", "sub": "40 secs · switch hands at 0:20 secs", "exerciseId": "ex_110"},
      ]},
      { section: "conditioning", tag: "5 MIN EMOM", note: "Every Minute on the Minute", items: [
        {"name": "Plank Jack with Shoulder Taps", "sub": "20 secs · or Plank Jacks", "exerciseId": "ex_107", "alternatives": ["ex_108"]},
        {"name": "Push Up Plank Hold", "sub": "20 secs", "exerciseId": "ex_109"},
        {"name": "Rest", "sub": "20 secs", "rest": true},
      ]},
    ],
  },
  {
    id: "upper_chest_back",
    title: "Upper Body: Chest & Back",
    image: "/chest_figure.png",
    category: "upper",
    tag: "Hypertrophy",
    minutes: 55,
    muscles: ["chest", "back"],
    source: "Day 16",
    blurb: "Rows, presses and flys, with pullovers and shrugs for upper-back detail.",
    subtitle: "Push/Pull – Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Cat Cow", "sub": "5 reps", "exerciseId": "ex_077"},
        {"name": "Bird Dog", "sub": "10 reps · total", "exerciseId": "ex_057"},
        {"name": "Inchworm into Plank Toe Touches", "sub": "5 reps", "exerciseId": "ex_078"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Single Arm Rows", "sub": "10-12 reps · each arm · or Single Arm Lat Pull Down (each arm) · or Single Arm Seated Cable Row (each arm)", "exerciseId": "ex_030", "sets": 3, "reps": "10-12", "alternatives": ["ex_111", "ex_112"]},
      ]},
      { section: "workout", tag: "SUPERSET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Chest Flys", "sub": "10-12 reps", "exerciseId": "ex_034", "sets": 3, "reps": "10-12"},
        {"name": "Rear Delt Raises", "sub": "10-12 reps · or Rear Delt Machine", "exerciseId": "ex_033", "sets": 3, "reps": "10-12", "alternatives": ["ex_113"]},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Bench Press", "sub": "10-12 reps · or Decline Push Ups · or DB Floor Press", "exerciseId": "ex_006", "sets": 3, "reps": "10-12", "alternatives": ["ex_114", "ex_031"]},
      ]},
      { section: "workout", tag: "SUPERSET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Pull Overs", "sub": "10-12 reps · or Straight Arm Pulldowns", "exerciseId": "ex_035", "sets": 3, "reps": "10-12", "alternatives": ["ex_115"]},
        {"name": "DB Shrugs", "sub": "10-12 reps · or Barbell Shrugs", "exerciseId": "ex_036", "sets": 3, "reps": "10-12", "alternatives": ["ex_116"]},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Single Arm Deficit Push Ups", "sub": "6-8 reps · each side · you can do them on your knees as well · or Hand Release Push Ups 10-12 reps (you can do them on your knees as well)", "exerciseId": "ex_117", "sets": 3, "reps": "6-8", "alternatives": ["ex_044"]},
      ]},
      { section: "conditioning", tag: "4 MIN ALTERNATING TABATA", note: "00:20 secs work, 00:10 secs off · 8 rounds · 4 rounds each exercise", items: [
        {"name": "Single Unders", "sub": "Movement 1 · or Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "Push Ups", "sub": "Movement 2 · 3 reps", "exerciseId": "ex_120"},
        {"name": "Burpees", "sub": "Movement 2 · 3 reps, keep going till 00:20 secs are done · or Up Downs", "exerciseId": "ex_121", "alternatives": ["ex_122"]},
      ]},
    ],
  },
  {
    id: "upper_shoulders_back",
    title: "Upper Body: Shoulders & Back",
    image: "/Back_figure.png",
    category: "upper",
    tag: "Hypertrophy",
    minutes: 50,
    muscles: ["shoulders", "back", "chest"],
    source: "Day 19",
    blurb: "A pressing and pulling mix that finishes with side delts and biceps.",
    subtitle: "Push/Pull – Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Cat Cow", "sub": "5 reps", "exerciseId": "ex_077"},
        {"name": "Bird Dog", "sub": "10 reps · total", "exerciseId": "ex_057"},
        {"name": "Inchworm into Plank Toe Touches", "sub": "5 reps", "exerciseId": "ex_078"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Floor Press in a Glute Bridge", "sub": "10-12 reps · or Incline Bench Press", "exerciseId": "ex_031", "sets": 3, "reps": "10-12", "alternatives": ["ex_007"]},
      ]},
      { section: "workout", tag: "SUPERSET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Gorilla Rows", "sub": "10-12 reps · each side · or Alternating DB Bent Over Row (each side)", "exerciseId": "ex_123", "sets": 3, "reps": "10-12", "alternatives": ["ex_038"]},
        {"name": "Barbell Shoulder Press", "sub": "10-12 reps · or DB Shoulder Press", "exerciseId": "ex_011", "sets": 3, "reps": "10-12", "alternatives": ["ex_029"]},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Barbell Bent Over Row", "sub": "10-12 reps · or DB Bent Over Row · or Lat Pull Down", "exerciseId": "ex_010", "sets": 3, "reps": "10-12", "alternatives": ["ex_038", "ex_124"]},
      ]},
      { section: "workout", tag: "SUPERSET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Lateral Raise", "sub": "10-12 reps", "exerciseId": "ex_012", "sets": 3, "reps": "10-12"},
        {"name": "KB Horn Curls", "sub": "10-12 reps", "exerciseId": "ex_125", "sets": 3, "reps": "10-12"},
      ]},
      { section: "workout", tag: "STRAIGHT SETS 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Back Extension Machine", "sub": "10-12 reps · try not rushing with them · or Superman Raises", "exerciseId": "ex_126", "sets": 3, "reps": "10-12", "alternatives": ["ex_127"]},
      ]},
      { section: "conditioning", tag: "4 MIN AMRAP", note: "As Many Rounds As Possible", items: [
        {"name": "Bear Crawl", "sub": "5 reps · 5 steps forward + 5 steps back", "exerciseId": "ex_128"},
        {"name": "Up Downs", "sub": "5 reps", "exerciseId": "ex_122"},
        {"name": "DB Push Press", "sub": "5 reps", "exerciseId": "ex_043"},
      ]},
    ],
  },
  {
    id: "upper_strength",
    title: "Upper Body: Strength Circuit",
    image: "/Arms_figure.png",
    category: "upper",
    tag: "Strength",
    minutes: 40,
    muscles: ["chest", "back", "shoulders", "arms"],
    source: "Day 31",
    blurb: "Compact upper-body session: rows, presses and arm work.",
    subtitle: "Upper Body Strength and Metcon",
    blocks: [
      { section: "warmup", tag: "MOBILITY & GENERAL WARM UP", note: "2 Rounds", items: [
        {"name": "Thoracic Rotations", "sub": "10 reps · each side", "exerciseId": "ex_060"},
        {"name": "Shoulder Taps", "sub": "5 reps · each hand", "exerciseId": "ex_165"},
        {"name": "Prone Lat Pull Down", "sub": "10 reps", "exerciseId": "ex_071"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "2 Rounds", items: [
        {"name": "Single Unders", "sub": "20 secs · or Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "DB Shoulder Press", "sub": "5 reps", "exerciseId": "ex_029"},
        {"name": "DB Floor Press", "sub": "5 reps", "exerciseId": "ex_031"},
      ]},
      { section: "workout", tag: "STRENGTH · TRISET 1", note: "3 Rounds · do A, B and C back-to-back, then 60-90 secs off", items: [
        {"name": "Single Arm Rows", "sub": "8-10 reps · each side", "exerciseId": "ex_030", "sets": 3, "reps": "8-10"},
        {"name": "DB Floor Press", "sub": "10-12 reps · or DB Bench Press", "exerciseId": "ex_031", "sets": 3, "reps": "10-12", "alternatives": ["ex_050"]},
        {"name": "KB OH March", "sub": "30 secs", "exerciseId": "ex_158"},
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART A", note: "6 Minute AMRAP · use the same weight for all three exercises", items: [
        {"name": "Hand Release Push Ups", "sub": "6 reps", "exerciseId": "ex_044"},
        {"name": "Tall Kneeling Tricep Extension", "sub": "8 reps", "exerciseId": "ex_154"},
        {"name": "Bear Crawl DB Slides", "sub": "10 reps · total", "exerciseId": "ex_099"},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes rest", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART B", note: "4 Min EMOM · Every Minute on the Minute", items: [
        {"name": "DB Push Press", "sub": "Odd min · 10-12 reps", "exerciseId": "ex_043"},
        {"name": "Plank Jacks", "sub": "Even min · 45 secs", "exerciseId": "ex_108"},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes rest", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART C", note: "6 Minute AMRAP", items: [
        {"name": "DB Bent Over Row", "sub": "6 reps", "exerciseId": "ex_038"},
        {"name": "Hammer Curls", "sub": "8 reps", "exerciseId": "ex_040"},
        {"name": "Push Up Pulses", "sub": "10 reps", "exerciseId": "ex_138"},
      ]},
    ],
  },
  {
    id: "upper_push_pull",
    title: "Upper Body: Push / Pull",
    image: "/Shoulders_figure.png",
    category: "upper",
    tag: "Hypertrophy",
    minutes: 50,
    muscles: ["chest", "back", "shoulders"],
    source: "Day 23",
    blurb: "Push-ups, rows and presses in a steady push-pull rhythm.",
    subtitle: "Push/Pull – Hypertrophy and Conditioning",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Scapula Push Ups", "sub": "5 reps", "exerciseId": "ex_068"},
        {"name": "Thoracic Rotations", "sub": "10 reps · total", "exerciseId": "ex_060"},
        {"name": "DB Shoulder Press", "sub": "5 reps", "exerciseId": "ex_029"},
        {"name": "DB Bent Over Row", "sub": "10 reps", "exerciseId": "ex_038"},
      ]},
      { section: "workout", tag: "TRISET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Deficit Push Ups", "sub": "8-10 reps · or Hand Release Push Ups", "exerciseId": "ex_037", "sets": 3, "reps": "8-10", "alternatives": ["ex_044"]},
        {"name": "DB Bent Over Row", "sub": "10-12 reps", "exerciseId": "ex_038", "sets": 3, "reps": "10-12"},
        {"name": "Jump Overs", "sub": "40 secs · or Lateral Jump Over", "exerciseId": "ex_129", "alternatives": ["ex_130"]},
      ]},
      { section: "workout", tag: "TRISET 2", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Seated Arnold Press", "sub": "8-10 reps", "exerciseId": "ex_039", "sets": 3, "reps": "8-10"},
        {"name": "DB Pull Overs", "sub": "10-12 reps", "exerciseId": "ex_035", "sets": 3, "reps": "10-12"},
        {"name": "Waiter's Carry", "sub": "40 secs", "exerciseId": "ex_131"},
      ]},
      { section: "workout", tag: "TRISET 3", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "DB Lateral Raise into Front Raise", "sub": "8-10 reps · each", "exerciseId": "ex_132", "sets": 3, "reps": "8-10"},
        {"name": "DB Flye", "sub": "10-12 reps", "exerciseId": "ex_034", "sets": 3, "reps": "10-12"},
        {"name": "A-Skip", "sub": "40 secs", "exerciseId": "ex_133"},
      ]},
      { section: "conditioning", tag: "4 ROUNDS", note: "Each one for TIME", items: [
        {"name": "Hammer Curls", "sub": "4 reps", "exerciseId": "ex_040"},
        {"name": "Bear Crawl", "sub": "5 reps · 5 steps forward + 5 steps back", "exerciseId": "ex_128"},
        {"name": "Diamond Push Ups", "sub": "4 reps", "exerciseId": "ex_134"},
        {"name": "Bear Crawl", "sub": "5 reps · 5 steps forward + 5 steps back", "exerciseId": "ex_128"},
        {"name": "Up Downs", "sub": "4 reps", "exerciseId": "ex_122"},
        {"name": "Rest", "sub": "30 secs", "rest": true},
      ]},
    ],
  },
  {
    id: "full_giant_set",
    title: "Full Body: Giant Set",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Strength",
    minutes: 40,
    muscles: ["full_body"],
    source: "Day 40",
    blurb: "Lower and upper lifts back-to-back with short rests.",
    subtitle: "Giant Set and Metcon",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Jumping Jacks", "sub": "20 secs", "exerciseId": "ex_119"},
        {"name": "Prone Lat Pull Down", "sub": "6 reps", "exerciseId": "ex_071"},
        {"name": "Hand Release Push Ups", "sub": "4 reps · on knees", "exerciseId": "ex_044"},
        {"name": "Air Squats", "sub": "6 reps", "exerciseId": "ex_061"},
        {"name": "Push Up Plank Hold", "sub": "20 secs", "exerciseId": "ex_109"},
      ]},
      { section: "workout", tag: "GIANT SET", note: "2 Rounds · 60 secs off after every round", items: [
        {"name": "DB Romanian Deadlift", "sub": "8 reps", "exerciseId": "ex_048", "sets": 2, "reps": "8"},
        {"name": "DB Glute Bridge Hold Floor Press", "sub": "10 reps", "exerciseId": "ex_031", "sets": 2, "reps": "10"},
        {"name": "Rest", "sub": "15-30 secs", "rest": true},
        {"name": "KB Swings", "sub": "8 reps", "exerciseId": "ex_042", "sets": 2, "reps": "8"},
        {"name": "DB Shoulder Press", "sub": "10 reps", "exerciseId": "ex_029", "sets": 2, "reps": "10"},
        {"name": "Rest", "sub": "60 secs", "rest": true},
      ]},
      { section: "conditioning", tag: "METCON 1", note: "3 Rounds · 30 secs rest after every round", items: [
        {"name": "Goblet Squat", "sub": "60 secs", "exerciseId": "ex_001"},
        {"name": "Single Unders", "sub": "60 secs · or Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
      ]},
      { section: "conditioning", tag: "REST", note: "1 minute break", items: [
      ]},
      { section: "conditioning", tag: "METCON 2", note: "3 Rounds · 20 secs rest after every round", items: [
        {"name": "Burpees", "sub": "40 secs · or Up Downs", "exerciseId": "ex_121", "alternatives": ["ex_122"]},
        {"name": "Duck Walk", "sub": "40 secs", "exerciseId": "ex_162"},
      ]},
      { section: "conditioning", tag: "REST", note: "1 minute break", items: [
      ]},
      { section: "conditioning", tag: "METCON 3", note: "3 Rounds · 20 secs rest after every round", items: [
        {"name": "DB Push Press", "sub": "40 secs", "exerciseId": "ex_043"},
        {"name": "Lateral Shuffle", "sub": "40 secs", "exerciseId": "ex_087"},
      ]},
      { section: "conditioning", tag: "REST", note: "1 minute break", items: [
      ]},
      { section: "conditioning", tag: "METCON 4", note: "3 Rounds · 30 secs rest after every round", items: [
        {"name": "Goblet Reverse Lunges", "sub": "60 secs", "exerciseId": "ex_098"},
        {"name": "Bear Crawl", "sub": "60 secs · 5 steps forward + 5 steps back", "exerciseId": "ex_128"},
      ]},
    ],
  },
  {
    id: "full_endurance",
    title: "Full Body: Muscular Endurance",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 45,
    muscles: ["full_body"],
    source: "Day 1",
    blurb: "Higher reps (18-15-12) with a minute's rest between rounds.",
    subtitle: "Muscular Endurance and Metcon (Explosive/Plyometric Work)",
    blocks: [
      { section: "warmup", tag: "WARM UP & MOBILITY", note: "2 Rounds · then the 4 min EMOM structured warm up", items: [
        {"name": "Hip Extensions", "sub": "10 reps · total", "exerciseId": "ex_058"},
        {"name": "Inchworm into Shoulder Tap", "sub": "5 reps", "exerciseId": "ex_059"},
        {"name": "Thoracic Rotations", "sub": "10 reps · total", "exerciseId": "ex_060"},
        {"name": "Air Squats", "sub": "5 reps", "exerciseId": "ex_061"},
      ]},
      { section: "warmup", tag: "4 MIN EMOM", note: "Every Minute on the Minute · 0:40 on, 0:20 off", items: [
        {"name": "Squat to Stand", "sub": "Minute 1", "exerciseId": "ex_062"},
        {"name": "Pogo Jumps", "sub": "Minute 2", "exerciseId": "ex_063"},
        {"name": "Bicep Curl into Shoulder Press", "sub": "Minute 3", "exerciseId": "ex_064"},
        {"name": "Knee Push Up", "sub": "Minute 4", "exerciseId": "ex_065"},
      ]},
      { section: "workout", tag: "MUSCULAR ENDURANCE 1", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "DB Romanian Deadlift", "sub": "18-15-12 reps", "exerciseId": "ex_048", "sets": 3, "reps": "18-15-12"},
        {"name": "Prisoner Box Step Ups", "sub": "18-15-12 reps · total", "exerciseId": "ex_163", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "conditioning", tag: "METCON 1", note: "5 Mins AMRAP", items: [
        {"name": "Split Squats", "sub": "6 reps · right side", "exerciseId": "ex_028"},
        {"name": "Box Jumps", "sub": "4 reps · each side", "exerciseId": "ex_104"},
        {"name": "Split Squats", "sub": "6 reps · left side", "exerciseId": "ex_028"},
      ]},
      { section: "workout", tag: "MUSCULAR ENDURANCE 2", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "Floor Press", "sub": "18-15-12 reps · or Bench Press", "exerciseId": "ex_031", "sets": 3, "reps": "18-15-12", "alternatives": ["ex_006"]},
        {"name": "DB Flye", "sub": "18-15-12 reps", "exerciseId": "ex_034", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "conditioning", tag: "METCON 2", note: "5 Mins AMRAP", items: [
        {"name": "Single Arm Push Press", "sub": "6 reps · right hand", "exerciseId": "ex_164"},
        {"name": "Plank Jacks", "sub": "4 reps", "exerciseId": "ex_108"},
        {"name": "Single Arm Push Press", "sub": "6 reps · left hand", "exerciseId": "ex_164"},
      ]},
    ],
  },
  {
    id: "full_balance",
    title: "Full Body: Balance & Stability",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 45,
    muscles: ["full_body"],
    source: "Day 3",
    blurb: "Squats, lunges and presses that work your balance as well as strength.",
    subtitle: "Full Body Strength and Metcon (Balance and Stability)",
    blocks: [
      { section: "warmup", tag: "WARM UP & MOBILITY", note: "2 Rounds · then the structured warm up", items: [
        {"name": "Alternating Hamstring Kickouts", "sub": "8 reps · total", "exerciseId": "ex_066"},
        {"name": "Shoulder Rotations", "sub": "8 reps", "exerciseId": "ex_067"},
        {"name": "Scapula Push Ups", "sub": "8 reps · or Wall Scapula Push Ups", "exerciseId": "ex_068", "alternatives": ["ex_069"]},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "2 Rounds", items: [
        {"name": "Lunge Curl and Press", "sub": "6 reps · total", "exerciseId": "ex_070"},
        {"name": "Prone Lat Pull Down", "sub": "6 reps", "exerciseId": "ex_071"},
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 1", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "Goblet Squat", "sub": "18-15-12 reps", "exerciseId": "ex_001", "sets": 3, "reps": "18-15-12"},
        {"name": "DB Shoulder Press", "sub": "18-15-12 reps", "exerciseId": "ex_029", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 1", note: "6 Mins AMRAP", items: [
        {"name": "High Knees", "sub": "30 reps · total", "exerciseId": "ex_102"},
        {"name": "KB Swings", "sub": "6 reps", "exerciseId": "ex_042"},
        {"name": "DB Reverse Lunges", "sub": "6 reps · total", "exerciseId": "ex_020"},
        {"name": "Leg Lifts", "sub": "6 reps · total · or Leg Raises", "exerciseId": "ex_091", "alternatives": ["ex_161"]},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 2", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "Elevated Glute Bridge", "sub": "18-15-12 reps · or Hip Thruster", "exerciseId": "ex_159", "sets": 3, "reps": "18-15-12", "alternatives": ["ex_018"]},
        {"name": "DB Lateral Raise into Front Raise", "sub": "18-15-12 reps · total", "exerciseId": "ex_132", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 2", note: "6 Mins AMRAP", items: [
        {"name": "Single Unders", "sub": "60 reps · or Jumping Jacks 30 reps", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "Up Downs", "sub": "6 reps", "exerciseId": "ex_122"},
        {"name": "Hand Release Push Ups", "sub": "6 reps", "exerciseId": "ex_044"},
        {"name": "Weighted Sit Ups", "sub": "6 reps", "exerciseId": "ex_160"},
      ]},
    ],
  },
  {
    id: "full_endurance_saq",
    title: "Full Body: Endurance + SAQ",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 45,
    muscles: ["full_body"],
    source: "Day 5",
    blurb: "Rows, curls, presses and triceps at high reps, with speed and agility work.",
    subtitle: "Full Body – Muscular Endurance + SAQ",
    blocks: [
      { section: "warmup", tag: "WARM UP & MOBILITY", note: "2 Rounds · then a 3 min AMRAP structured warm up", items: [
        {"name": "Glute Bridges", "sub": "10 reps", "exerciseId": "ex_072"},
        {"name": "Thoracic Rotations", "sub": "10 reps · total", "exerciseId": "ex_060"},
        {"name": "Scapula Push Ups", "sub": "10 reps", "exerciseId": "ex_068"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "3 Minutes AMRAP", items: [
        {"name": "Air Squats", "sub": "6 reps", "exerciseId": "ex_061"},
        {"name": "Plank Toe Touches", "sub": "6 reps · total", "exerciseId": "ex_073"},
        {"name": "Cross Body Mountain Climbers", "sub": "6 reps", "exerciseId": "ex_074"},
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 1", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "DB Bent Over Rows", "sub": "18-15-12 reps", "exerciseId": "ex_038", "sets": 3, "reps": "18-15-12"},
        {"name": "DB Bicep Curls", "sub": "18-15-12 reps", "exerciseId": "ex_013", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 1", note: "4 Minute EMOM, into a 2 min AMRAP", items: [
        {"name": "Fast Feet", "sub": "20 secs", "exerciseId": "ex_135"},
        {"name": "Lateral Shuffle", "sub": "20 secs", "exerciseId": "ex_087"},
        {"name": "Rest", "sub": "20 secs", "rest": true},
      ]},
      { section: "conditioning", tag: "INTO", note: "2 min AMRAP", items: [
        {"name": "Jump Squats", "sub": "3 reps", "exerciseId": "ex_086"},
        {"name": "Hostage Squats", "sub": "6 reps", "exerciseId": "ex_082"},
        {"name": "Toe Touches", "sub": "9 reps", "exerciseId": "ex_136"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 2", note: "3 Rounds · 60 secs rest · 18 reps, then 15, then 12", items: [
        {"name": "DB Glute Bridge Hold Floor Press", "sub": "18-15-12 reps", "exerciseId": "ex_031", "sets": 3, "reps": "18-15-12"},
        {"name": "DB Tricep Extension", "sub": "18-15-12 reps", "exerciseId": "ex_041", "sets": 3, "reps": "18-15-12"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 2", note: "4 Minute EMOM, into a 2 min AMRAP", items: [
        {"name": "Up and Back Dot Drill", "sub": "20 secs", "exerciseId": "ex_083"},
        {"name": "Split Pogo Jumps", "sub": "20 secs", "exerciseId": "ex_137"},
        {"name": "Rest", "sub": "20 secs", "rest": true},
      ]},
      { section: "conditioning", tag: "INTO", note: "2 min AMRAP", items: [
        {"name": "Stationary Gorillas", "sub": "3 reps · hands don't come off", "exerciseId": "ex_097"},
        {"name": "Push Up Pulses", "sub": "6 reps", "exerciseId": "ex_138"},
        {"name": "Plank Twists", "sub": "9 reps · total", "exerciseId": "ex_139"},
      ]},
    ],
  },
  {
    id: "full_strength_metcon",
    title: "Full Body: Strength & Metcon",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Strength",
    minutes: 35,
    muscles: ["full_body"],
    source: "Day 33",
    blurb: "A press, a squat and raises: short, sharp and full body.",
    subtitle: "Full Body – Strength and Metcon",
    blocks: [
      { section: "warmup", tag: "MOBILITY & GENERAL WARM UP", note: "2 Rounds · then the structured warm up", items: [
        {"name": "Shoulder Rotations", "sub": "20 secs", "exerciseId": "ex_067"},
        {"name": "90 / 90 Hip Rotation", "sub": "10 reps", "exerciseId": "ex_076"},
        {"name": "Prone Lat Pull Down", "sub": "10 reps", "exerciseId": "ex_071"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "2 Rounds", items: [
        {"name": "Fast Feet", "sub": "20 secs", "exerciseId": "ex_135"},
        {"name": "Forward Lunges", "sub": "5 reps · each leg", "exerciseId": "ex_046"},
        {"name": "Knee Push Up", "sub": "5 reps", "exerciseId": "ex_065"},
      ]},
      { section: "workout", tag: "STRENGTH · TRISET 1", note: "3 Rounds · do A, B and C, then 60-90 secs off", items: [
        {"name": "DB Shoulder Press", "sub": "8-10 reps", "exerciseId": "ex_029", "sets": 3, "reps": "8-10"},
        {"name": "Curtsy Squats", "sub": "10-12 reps · each side, weighted", "exerciseId": "ex_027", "sets": 3, "reps": "10-12"},
        {"name": "Rocking Chairs", "sub": "30 secs", "exerciseId": "ex_090"},
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART A", note: "4 Mins EMOM · Every Minute on the Minute", items: [
        {"name": "Vertical Jumps", "sub": "Odd min · 6-8 reps", "exerciseId": "ex_140"},
        {"name": "Bear Crawl Shoulder Taps", "sub": "Even min · 40 secs", "exerciseId": "ex_141"},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes rest", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART B", note: "4 Rounds · each for TIME · 60 secs rest after every round", items: [
        {"name": "Goblet Squat", "sub": "8 reps", "exerciseId": "ex_001"},
        {"name": "Box Jumps", "sub": "5 reps · or Step Ups (each leg)", "exerciseId": "ex_104", "alternatives": ["ex_105"]},
        {"name": "DB Lateral Raise into Front Raise", "sub": "8 reps · total", "exerciseId": "ex_132"},
        {"name": "Stationary Gorillas", "sub": "5 reps · hands come off", "exerciseId": "ex_097"},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes rest", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART C", note: "4 Mins EMOM · Every Minute on the Minute", items: [
        {"name": "Sit Throughs", "sub": "Odd min · 10 reps · each side · or 20 reps Cross Body Mountain Climbers (each side)", "exerciseId": "ex_100", "alternatives": ["ex_074"]},
        {"name": "Lateral Jump Over", "sub": "Even min · 40 secs", "exerciseId": "ex_130"},
      ]},
    ],
  },
  {
    id: "full_endurance_2",
    title: "Full Body: Endurance Circuit",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 45,
    muscles: ["full_body"],
    source: "Day 8",
    blurb: "Lunges, presses and rows at 15-12-10 reps with short rests.",
    subtitle: "Full Body – Muscular Endurance (Explosive/Plyometric Work)",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds · then a 3 min AMRAP structured warm up", items: [
        {"name": "Inchworm into a Push Up", "sub": "4 reps · do it on your knees", "exerciseId": "ex_075"},
        {"name": "Bird Dog", "sub": "8 reps · total", "exerciseId": "ex_057"},
        {"name": "Hip Extensions", "sub": "4 reps · each leg", "exerciseId": "ex_058"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "3 Minutes AMRAP", items: [
        {"name": "Pogo Jumps", "sub": "20 reps", "exerciseId": "ex_063"},
        {"name": "Air Squats", "sub": "4 reps", "exerciseId": "ex_061"},
        {"name": "Plank Toe Touches", "sub": "6 reps · total", "exerciseId": "ex_073"},
      ]},
      { section: "workout", tag: "MUSCULAR ENDURANCE 1", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "DB Reverse Lunges", "sub": "15-12-10 reps · total", "exerciseId": "ex_020", "sets": 3, "reps": "15-12-10"},
        {"name": "DB Push Press", "sub": "15-12-10 reps", "exerciseId": "ex_043", "sets": 3, "reps": "15-12-10"},
        {"name": "Gorilla Rows", "sub": "15-12-10 reps · total · or Alternating DB Bent Over Row (total)", "exerciseId": "ex_123", "sets": 3, "reps": "15-12-10", "alternatives": ["ex_038"]},
      ]},
      { section: "conditioning", tag: "METCON 1", note: "6 Minute EMOM · Every Minute on the Minute", items: [
        {"name": "Rocking Chairs", "sub": "Minute 1 · 40 secs", "exerciseId": "ex_090"},
        {"name": "Box Jumps", "sub": "Minute 2 · max · or Lateral Jump Over", "exerciseId": "ex_104", "alternatives": ["ex_130"]},
        {"name": "Sit Ups", "sub": "Minute 3 · 40 secs", "exerciseId": "ex_144"},
      ]},
      { section: "workout", tag: "MUSCULAR ENDURANCE 2", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "Hip Thrusters", "sub": "15-12-10 reps · or Weighted Glute Bridges", "exerciseId": "ex_018", "sets": 3, "reps": "15-12-10", "alternatives": ["ex_142"]},
        {"name": "90/90 Floor Press", "sub": "15-12-10 reps", "exerciseId": "ex_143", "sets": 3, "reps": "15-12-10"},
        {"name": "Rear Delt Raises", "sub": "15-12-10 reps", "exerciseId": "ex_033", "sets": 3, "reps": "15-12-10"},
      ]},
      { section: "conditioning", tag: "METCON 2", note: "6 Minute EMOM · Every Minute on the Minute", items: [
        {"name": "Single Arm Rows", "sub": "Minute 1 · 40 secs, alternate hands at 00:20 secs", "exerciseId": "ex_030"},
        {"name": "A-Skip", "sub": "Minute 2 · max · or Pogo Jumps", "exerciseId": "ex_133", "alternatives": ["ex_063"]},
        {"name": "Alternating V Ups", "sub": "Minute 3 · 40 secs · each side · or Stationary Bicycle Crunches (each side)", "exerciseId": "ex_145", "alternatives": ["ex_146"]},
      ]},
    ],
  },
  {
    id: "full_arms_endurance",
    title: "Full Body: Glutes & Arms",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 40,
    muscles: ["full_body"],
    source: "Day 12",
    blurb: "Curtsy squats up top, then shrugs, curls, presses and triceps.",
    subtitle: "Full Body – Muscular Endurance + SAQ",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds · then a 3 minute AMRAP structured warm up", items: [
        {"name": "Hip Extensions", "sub": "5 reps · each side", "exerciseId": "ex_058"},
        {"name": "Thoracic Rotations", "sub": "5 reps · each side", "exerciseId": "ex_060"},
        {"name": "90 / 90 Hip Rotation", "sub": "5 reps", "exerciseId": "ex_076"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "3 Minute AMRAP", items: [
        {"name": "Lateral Jump Over", "sub": "6 reps · total", "exerciseId": "ex_130"},
        {"name": "Ab Crunches", "sub": "12 reps", "exerciseId": "ex_153"},
        {"name": "Hostage Squats", "sub": "3 reps", "exerciseId": "ex_082"},
        {"name": "Push Up Pulses", "sub": "3 reps", "exerciseId": "ex_138"},
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 1", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "Curtsy Squats", "sub": "15-12-10 reps · total", "exerciseId": "ex_027", "sets": 3, "reps": "15-12-10"},
        {"name": "DB Shrugs", "sub": "15-12-10 reps", "exerciseId": "ex_036", "sets": 3, "reps": "15-12-10"},
        {"name": "Hammer Curls", "sub": "15-12-10 reps", "exerciseId": "ex_040", "sets": 3, "reps": "15-12-10"},
      ]},
      { section: "workout", tag: "REST", note: "2 minutes", items: [
      ]},
      { section: "conditioning", tag: "METCON 1", note: "SAQ work + Alternating TABATA", items: [
        {"name": "Figure 8 Cone Drill", "sub": "30 secs", "exerciseId": "ex_147"},
        {"name": "Lateral Lunge", "sub": "Tabata movement 1 · alternate legs every round", "exerciseId": "ex_148"},
        {"name": "Box Jumps", "sub": "Tabata movement 2 · or Jump Overs", "exerciseId": "ex_104", "alternatives": ["ex_129"]},
        {"name": "Toe Taps", "sub": "30 secs", "exerciseId": "ex_149"},
      ]},
      { section: "conditioning", tag: "4 MIN ALTERNATING TABATA", note: "8 rounds · 00:20 secs of work, 00:10 secs rest · 4 rounds each", items: [
      ]},
      { section: "workout", tag: "REST", note: "2 minutes", items: [
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 2", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "DB Floor Press", "sub": "15-12-10 reps", "exerciseId": "ex_031", "sets": 3, "reps": "15-12-10"},
        {"name": "Rear Delt Raises", "sub": "15-12-10 reps", "exerciseId": "ex_033", "sets": 3, "reps": "15-12-10"},
        {"name": "Tall Kneeling Tricep Extension", "sub": "15-12-10 reps", "exerciseId": "ex_154", "sets": 3, "reps": "15-12-10"},
      ]},
      { section: "workout", tag: "REST", note: "2 minutes", items: [
      ]},
      { section: "conditioning", tag: "METCON 2", note: "Agility/Plyo work + Alternating TABATA", items: [
        {"name": "Lateral Shuffle", "sub": "30 secs", "exerciseId": "ex_087"},
        {"name": "50% Crawl Tutorial", "sub": "Tabata movement 1", "exerciseId": "ex_150"},
        {"name": "Lateral Bound", "sub": "Tabata movement 2", "exerciseId": "ex_151"},
        {"name": "Plyo Mountain Climbers", "sub": "30 secs", "exerciseId": "ex_152"},
      ]},
      { section: "conditioning", tag: "4 MIN ALTERNATING TABATA", note: "8 rounds · 00:20 secs of work, 00:10 secs rest · 4 rounds each", items: [
      ]},
    ],
  },
  {
    id: "full_balance_carries",
    title: "Full Body: Stability & Carries",
    image: "/Fullbody_figure.png",
    category: "full",
    tag: "Endurance",
    minutes: 45,
    muscles: ["full_body"],
    source: "Day 10",
    blurb: "Squats, pullovers, curls and carries that challenge your balance.",
    subtitle: "Full Body – Muscular Endurance + Balance and Stability",
    blocks: [
      { section: "warmup", tag: "WARM UP AND MOBILITY", note: "4 Minute EMOM · 0:40 on, 0:20 off · then the structured warm up", items: [
        {"name": "Squat to Stand", "sub": "Minute 1", "exerciseId": "ex_062"},
        {"name": "Seated Thoracic Rotations", "sub": "Minute 2", "exerciseId": "ex_079"},
        {"name": "Inchworm into 2 Shoulder Taps", "sub": "Minute 3 · each side", "exerciseId": "ex_059"},
        {"name": "Scapula Push Ups", "sub": "Minute 4", "exerciseId": "ex_068"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "2 Rounds", items: [
        {"name": "Single Leg Glute Bridges", "sub": "6 reps · each leg", "exerciseId": "ex_055"},
        {"name": "Bicep Curl to Tricep Extensions", "sub": "4 reps", "exerciseId": "ex_080"},
        {"name": "Bodyweight Renegade Rows", "sub": "6 reps · each side, no push up", "exerciseId": "ex_081"},
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 1", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "Sumo Squats", "sub": "15-12-10 reps", "exerciseId": "ex_023", "sets": 3, "reps": "15-12-10"},
        {"name": "DB Front Raises", "sub": "15-12-10 reps", "exerciseId": "ex_155", "sets": 3, "reps": "15-12-10"},
        {"name": "Tall Kneeling Tricep Extension", "sub": "15-12-10 reps", "exerciseId": "ex_154", "sets": 3, "reps": "15-12-10"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 1", note: "Ladder · 2-4-6-8-6-4-2 reps of the middle two, between two suitcase carries", items: [
        {"name": "Suitcase Carry", "sub": "60 secs · right hand", "exerciseId": "ex_110"},
        {"name": "DB Deadlifts", "sub": "2-4-6-8-6-4-2 reps", "exerciseId": "ex_025"},
        {"name": "Up Downs", "sub": "2-4-6-8-6-4-2 reps", "exerciseId": "ex_122"},
        {"name": "Suitcase Carry", "sub": "60 secs · left hand", "exerciseId": "ex_110"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "workout", tag: "MUSCLE ENDURANCE 2", note: "3 Rounds · 60 secs rest · 15 reps, then 12, then 10", items: [
        {"name": "Goblet Knee to Squat", "sub": "15-12-10 reps · total · or Knees to Standing (total)", "exerciseId": "ex_156", "sets": 3, "reps": "15-12-10", "alternatives": ["ex_101"]},
        {"name": "DB Pull Overs", "sub": "15-12-10 reps", "exerciseId": "ex_035", "sets": 3, "reps": "15-12-10"},
        {"name": "Hammer Curls", "sub": "15-12-10 reps", "exerciseId": "ex_040", "sets": 3, "reps": "15-12-10"},
      ]},
      { section: "workout", tag: "REST", note: "2 mins", items: [
      ]},
      { section: "conditioning", tag: "METCON 2", note: "Ladder · 2-4-6-8-6-4-2 reps of the middle two, between two overhead marches", items: [
        {"name": "Single Arm Overhead March", "sub": "60 secs · right hand", "exerciseId": "ex_157"},
        {"name": "Step Ups", "sub": "2-4-6-8-6-4-2 reps · each side", "exerciseId": "ex_105"},
        {"name": "Stationary Gorillas", "sub": "2-4-6-8-6-4-2 reps · hands off the ground", "exerciseId": "ex_097"},
        {"name": "Single Arm Overhead March", "sub": "60 secs · left hand", "exerciseId": "ex_157"},
      ]},
    ],
  },
  {
    id: "leg_flow_cardio",
    title: "Leg Day: Flow & Cardio",
    image: "/Legs_figure.png",
    category: "legs",
    tag: "Cardio",
    minutes: 70,
    muscles: ["legs"],
    source: "Day 9",
    blurb: "A short shin and quad warm-up, then a 30 minute interval run and a 30 minute steady cardio finish.",
    subtitle: "Lower Body Flow + Cardio",
    blocks: [
      { section: "warmup", tag: "TRI SET", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Tibialis Raises", "sub": "10 reps", "exerciseId": "ex_047"},
        {"name": "Bent Knee Calf Raises", "sub": "15 reps", "exerciseId": "ex_166"},
        {"name": "VMO Squats", "sub": "10 reps", "exerciseId": "ex_167"},
      ]},
      { section: "conditioning", tag: "CARDIO 1 · RUN", note: "30 min EMOM · Every Minute on the Minute", items: [
        {"name": "Walk and Jog", "sub": "30 secs each · first 8 mins"},
        {"name": "Rest", "sub": "60 secs", "rest": true},
        {"name": "Run", "sub": "30 secs · next 16 mins · good pace, don't jog", "exerciseId": "ex_168"},
        {"name": "Rest", "sub": "30 secs · between runs", "rest": true},
        {"name": "Sprint / Run", "sub": "30 secs · last 6 mins · max effort", "exerciseId": "ex_168"},
        {"name": "Rest", "sub": "60 secs", "rest": true},
      ]},
      { section: "conditioning", tag: "CARDIO 2", note: "30-35 mins · don't go easy", items: [
        {"name": "Row", "sub": "30-35 mins · or Cycle, or Elliptical", "exerciseId": "ex_169", "alternatives": ["ex_170", "ex_171"]},
      ]},
    ],
  },
  {
    id: "upper_flow_cardio",
    title: "Upper Body: Flow & Cardio",
    image: "/chest_figure.png",
    category: "upper",
    tag: "Cardio",
    minutes: 45,
    muscles: ["shoulders", "core"],
    source: "Day 11",
    blurb: "Shoulder warm-up, then pick an interval run or a core circuit.",
    subtitle: "Upper Body Flow + Cardio",
    blocks: [
      { section: "warmup", tag: "TRI SET", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "External Rotators", "sub": "8-10 reps · each arm", "exerciseId": "ex_172"},
        {"name": "Trap Raises", "sub": "8-10 reps · or Y Raises", "exerciseId": "ex_173", "alternatives": ["ex_174"]},
        {"name": "Good Mornings", "sub": "8-10 reps", "exerciseId": "ex_053"},
      ]},
      { section: "conditioning", tag: "OPTION 1 · INTERVAL RUN", note: "For time · pick this or option 2", items: [
        {"name": "Easy Jog", "sub": "5 mins", "exerciseId": "ex_168"},
        {"name": "400m Runs", "sub": "8 rounds · 400m at 70-80% effort, 90 secs full rest between", "exerciseId": "ex_168"},
        {"name": "Cool Down Jog", "sub": "5 mins · then a walk and cool down stretches", "exerciseId": "ex_168"},
      ]},
      { section: "conditioning", tag: "OPTION 2 · CORE CIRCUIT", note: "5-6 Rounds · each one for time · 60 secs rest after every round", items: [
        {"name": "A-Skips", "sub": "30 secs", "exerciseId": "ex_133"},
        {"name": "Weighted Sit Ups", "sub": "20 reps · or Sit Ups", "exerciseId": "ex_160", "alternatives": ["ex_144"]},
        {"name": "Weighted Leg Raises", "sub": "15 reps · slow and controlled · or Leg Raises", "exerciseId": "ex_175", "alternatives": ["ex_161"]},
        {"name": "Plank Twists", "sub": "10 reps · each side", "exerciseId": "ex_139"},
        {"name": "Stationary Gorillas", "sub": "30 secs · hands do not come off the floor", "exerciseId": "ex_097"},
        {"name": "Alternating V Ups", "sub": "10 reps · each side · or Plank Toe Touches", "exerciseId": "ex_145", "alternatives": ["ex_073"]},
        {"name": "Leg Lifts", "sub": "15 reps", "exerciseId": "ex_091"},
        {"name": "Weighted Toe Touches", "sub": "20 reps · or Toe Touches", "exerciseId": "ex_176", "alternatives": ["ex_136"]},
        {"name": "Lateral Shuffle with an Up Down", "sub": "30 secs", "exerciseId": "ex_087"},
      ]},
    ],
  },
  {
    id: "leg_strength_metcon",
    title: "Leg Day: Strength & Metcon",
    image: "/Gobletsquat_figure.png",
    category: "legs",
    tag: "Strength",
    minutes: 55,
    muscles: ["legs"],
    source: "Day 29",
    blurb: "Lunges, squats and jumps, then tabata and timed rounds to finish.",
    subtitle: "Lower Body Strength and Metcon",
    blocks: [
      { section: "warmup", tag: "MOBILITY & GENERAL WARM UP", note: "2 Rounds", items: [
        {"name": "World's Greatest Stretch", "sub": "20 secs · alternate sides next round", "exerciseId": "ex_056"},
        {"name": "90/90 Hip Rotations", "sub": "10 reps · total", "exerciseId": "ex_076"},
        {"name": "Single Leg Raises", "sub": "10 reps · each leg", "exerciseId": "ex_177"},
        {"name": "Standing Knees to Chest", "sub": "10 reps · total", "exerciseId": "ex_178"},
      ]},
      { section: "warmup", tag: "STRUCTURED WARM UP", note: "2 Rounds", items: [
        {"name": "Pogo Jumps", "sub": "20 secs", "exerciseId": "ex_063"},
        {"name": "Air Squats", "sub": "5 reps", "exerciseId": "ex_061"},
        {"name": "Rocking Chairs", "sub": "5 reps", "exerciseId": "ex_090"},
      ]},
      { section: "workout", tag: "STRENGTH · TRISET 1", note: "3 Rounds · 60-90 secs rest", items: [
        {"name": "Goblet Reverse Lunges", "sub": "8-10 reps · each leg, weighted", "exerciseId": "ex_098", "sets": 3, "reps": "8-10"},
        {"name": "Goblet Squats", "sub": "10-12 reps", "exerciseId": "ex_001", "sets": 3, "reps": "10-12"},
        {"name": "Box Jumps", "sub": "30 secs · or Lateral Jump Over", "exerciseId": "ex_104", "alternatives": ["ex_130"]},
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART A", note: "4 Min Alternating Tabata · 00:20 secs work, 00:10 secs rest · 4 rounds each", items: [
        {"name": "Plyo Mountain Climbers", "sub": "Movement 1", "exerciseId": "ex_152"},
        {"name": "Wall Sit Hold", "sub": "Movement 2", "exerciseId": "ex_179"},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART B", note: "5 Rounds · each one for time · 30 secs rest after every round", items: [
        {"name": "Up Downs", "sub": "6 reps", "exerciseId": "ex_122"},
        {"name": "Weighted Hostage Squats", "sub": "12 reps", "exerciseId": "ex_082"},
        {"name": "Sit Ups", "sub": "6 reps", "exerciseId": "ex_144"},
        {"name": "Single Unders", "sub": "50 reps · or 25 Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
      ]},
      { section: "conditioning", tag: "REST", note: "2 minutes", items: [
      ]},
      { section: "conditioning", tag: "CONDITIONING · PART C", note: "4 Min Alternating Tabata · 00:20 secs work, 00:10 secs rest · 4 rounds each", items: [
        {"name": "Split Pogo Jumps", "sub": "Movement 1", "exerciseId": "ex_137"},
        {"name": "Hamstring Plank", "sub": "Movement 2", "exerciseId": "ex_180"},
      ]},
    ],
  },
  {
    id: "leg_power_giant_set",
    title: "Leg Day: Power & Giant Set",
    image: "/Bulgariansquat_figure.png",
    category: "legs",
    tag: "Power",
    minutes: 55,
    muscles: ["legs"],
    source: "Day 36",
    blurb: "A single-leg giant set, then two seven-minute AMRAP finishers.",
    subtitle: "Lower Body + Power",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "World's Greatest Stretch", "sub": "20 secs · alternate sides next round", "exerciseId": "ex_056"},
        {"name": "90/90 Hip Rotations", "sub": "10 reps · total", "exerciseId": "ex_076"},
        {"name": "Single Leg Raises", "sub": "5 reps · each leg", "exerciseId": "ex_177"},
        {"name": "Knee Tucks", "sub": "10 reps · total", "exerciseId": "ex_181"},
        {"name": "Pogo Jumps", "sub": "20 secs", "exerciseId": "ex_063"},
      ]},
      { section: "workout", tag: "GIANT SET", note: "3 Rounds back-to-back · 60-90 secs rest", items: [
        {"name": "Split Squats", "sub": "10 reps · each leg, right leg forward first", "exerciseId": "ex_028", "sets": 3, "reps": "10"},
        {"name": "Single Leg Assisted Squats", "sub": "10 reps · each leg, right leg on the ground first", "exerciseId": "ex_182", "sets": 3, "reps": "10"},
        {"name": "Rest", "sub": "15 secs · between the right and left side", "rest": true},
      ]},
      { section: "conditioning", tag: "METCON · PART A", note: "60 secs jumps, then 7 Min AMRAP, then 90 secs jumps", items: [
        {"name": "Single Unders", "sub": "60 secs · then again for 90 secs at the end · or Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "Sumo Squats", "sub": "8 reps", "exerciseId": "ex_023"},
        {"name": "Up Downs", "sub": "6 reps", "exerciseId": "ex_122"},
        {"name": "DB Deadlifts", "sub": "8 reps · or KB", "exerciseId": "ex_025"},
        {"name": "Sit Ups", "sub": "6 reps", "exerciseId": "ex_144"},
      ]},
      { section: "conditioning", tag: "REST", note: "1 minute", items: [
      ]},
      { section: "conditioning", tag: "METCON · PART B", note: "60 secs plank hold, then 7 Min AMRAP, then 60 secs plank hold", items: [
        {"name": "Push-Up Plank Hold", "sub": "60 secs · then again for 60 secs at the end", "exerciseId": "ex_109"},
        {"name": "Hostage Squats", "sub": "8 reps", "exerciseId": "ex_082"},
        {"name": "Bear Crawl", "sub": "6 reps", "exerciseId": "ex_128"},
        {"name": "Box Jumps", "sub": "8 reps · total · or Prisoner Box Step Ups", "exerciseId": "ex_104", "alternatives": ["ex_163"]},
        {"name": "Leg Raises", "sub": "6 reps", "exerciseId": "ex_161"},
      ]},
    ],
  },
  {
    id: "upper_chipper",
    title: "Upper Body: Chipper Metcon",
    image: "/Arms_figure.png",
    category: "upper",
    tag: "Metcon",
    minutes: 50,
    muscles: ["shoulders", "chest", "back", "arms"],
    source: "Day 38",
    blurb: "A long for-time chipper: pushes, rows and arms, split by jump rope and core.",
    subtitle: "Upper Body Metcon",
    blocks: [
      { section: "warmup", tag: "MOBILITY & WARM UP", note: "2 Rounds", items: [
        {"name": "Thoracic Rotations", "sub": "20 secs · change side next round", "exerciseId": "ex_060"},
        {"name": "Shoulder Taps", "sub": "5 reps · each side", "exerciseId": "ex_165"},
        {"name": "Knee Push Ups", "sub": "5 reps", "exerciseId": "ex_065"},
        {"name": "Plank Toe Touches", "sub": "5 reps · each side", "exerciseId": "ex_073"},
        {"name": "High Knees", "sub": "20 secs", "exerciseId": "ex_102"},
      ]},
      { section: "conditioning", tag: "UPPER BODY CHIPPER · PART 1", note: "For time · work down the list", items: [
        {"name": "DB Push Press", "sub": "40 reps · or Barbell Push Press", "exerciseId": "ex_043", "alternatives": ["ex_183"]},
        {"name": "Single Arm Rows", "sub": "40 reps · each side", "exerciseId": "ex_030"},
        {"name": "Hand Release Push Ups", "sub": "40 reps", "exerciseId": "ex_044"},
        {"name": "DB Bicep Curls", "sub": "40 reps", "exerciseId": "ex_013"},
        {"name": "DB Tricep Extensions", "sub": "40 reps", "exerciseId": "ex_041"},
        {"name": "Single Unders", "sub": "100 reps · or 50 Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "Sit Ups", "sub": "50 reps", "exerciseId": "ex_144"},
      ]},
      { section: "conditioning", tag: "UPPER BODY CHIPPER · PART 2", note: "For time · keep going", items: [
        {"name": "Ground to Overhead", "sub": "40 reps", "exerciseId": "ex_184"},
        {"name": "DB Bent Over Rows", "sub": "40 reps", "exerciseId": "ex_038"},
        {"name": "DB Bench Press", "sub": "40 reps · or DB Floor Press", "exerciseId": "ex_050", "alternatives": ["ex_031"]},
        {"name": "Hammer Curls", "sub": "40 reps", "exerciseId": "ex_040"},
        {"name": "DB Tricep Kickbacks", "sub": "40 reps", "exerciseId": "ex_185"},
        {"name": "Single Unders", "sub": "100 reps · or 50 Jumping Jacks", "exerciseId": "ex_118", "alternatives": ["ex_119"]},
        {"name": "Leg Raises", "sub": "50 reps", "exerciseId": "ex_161"},
      ]},
    ],
  },
]
