// Weekly calendar — current week May 24–30, 2026
// workoutDays: indices 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
export const WEEKLY_CALENDAR = {
  user_001: { weekLabel: "May 24 to 30", workoutDays: [1, 3], streak: 4 },
  user_002: { weekLabel: "May 24 to 30", workoutDays: [1, 3, 5], streak: 5 },
  user_003: { weekLabel: "May 24 to 30", workoutDays: [0, 3], streak: 3 },
}

// Progress ladder — organized by weight rung
// sessions: array of { analyzed: bool, score?: number }
export const PROGRESS_LADDER = {
  user_001: {
    exercise: "Goblet Squat",
    tabs: ["Goblet Squat", "Barbell Squat", "RDL"],
    rungs: [
      {
        weight: "14 kg",
        label: "New",
        avgScore: 70,
        totalSessions: 2,
        analyzedCount: 2,
        sessions: [
          { analyzed: true, score: 68 },
          { analyzed: true, score: 71 },
        ],
      },
      {
        weight: "12 kg",
        label: "Current",
        subLabel: "showing last 5",
        avgScore: 81,
        totalSessions: 8,
        analyzedCount: 3,
        sessions: [
          { analyzed: true, score: 76 },
          { analyzed: false },
          { analyzed: true, score: 82 },
          { analyzed: false },
          { analyzed: true, score: 85 },
        ],
      },
      {
        weight: "10 kg",
        label: "Past",
        subLabel: "Your baseline",
        avgScore: 83,
        totalSessions: 2,
        analyzedCount: 1,
        sessions: [
          { analyzed: false },
          { analyzed: true, score: 83 },
        ],
      },
    ],
  },
  user_002: {
    exercise: "Romanian Deadlift",
    tabs: ["Dead lift", "RDL", "Hip Hinge"],
    rungs: [
      {
        weight: "24 kg",
        label: "New",
        avgScore: 68,
        totalSessions: 1,
        analyzedCount: 1,
        sessions: [{ analyzed: true, score: 68 }],
      },
      {
        weight: "20 kg",
        label: "Current",
        subLabel: "showing last 3",
        avgScore: 78,
        totalSessions: 6,
        analyzedCount: 3,
        sessions: [
          { analyzed: true, score: 74 },
          { analyzed: false },
          { analyzed: false },
          { analyzed: true, score: 78 },
          { analyzed: true, score: 82 },
        ],
      },
      {
        weight: "16 kg",
        label: "Past",
        subLabel: "Your baseline",
        avgScore: 85,
        totalSessions: 4,
        analyzedCount: 2,
        sessions: [
          { analyzed: false },
          { analyzed: true, score: 83 },
          { analyzed: true, score: 87 },
        ],
      },
    ],
  },
  user_003: {
    exercise: "Goblet Squat",
    tabs: ["Goblet Squat", "Dead lift", "RDL"],
    rungs: [
      {
        weight: "22 kg",
        label: "Stuck",
        avgScore: 71,
        totalSessions: 8,
        analyzedCount: 4,
        sessions: [
          { analyzed: true, score: 69 },
          { analyzed: false },
          { analyzed: true, score: 70 },
          { analyzed: false },
          { analyzed: true, score: 71 },
          { analyzed: true, score: 72 },
        ],
      },
      {
        weight: "18 kg",
        label: "Past",
        subLabel: "showing last 3",
        avgScore: 79,
        totalSessions: 6,
        analyzedCount: 3,
        sessions: [
          { analyzed: true, score: 76 },
          { analyzed: false },
          { analyzed: true, score: 80 },
          { analyzed: true, score: 82 },
        ],
      },
      {
        weight: "14 kg",
        label: "Past",
        subLabel: "Your baseline",
        avgScore: 84,
        totalSessions: 3,
        analyzedCount: 2,
        sessions: [
          { analyzed: false },
          { analyzed: true, score: 82 },
          { analyzed: true, score: 86 },
        ],
      },
    ],
  },
}

// Detailed form history with coaching feedback
export const FORM_HISTORY_DETAILED = {
  user_001: [
    {
      id: "fh_001_1",
      exercise: "Goblet Squat",
      score: 71,
      date: "May 27",
      weight: "14 kg",
      reps: "8 reps",
      feedback: "Posture solid across 8 reps. One more clean set and you're ready for 14kg.",
    },
    {
      id: "fh_001_2",
      exercise: "Goblet Squat",
      score: 68,
      date: "May 26",
      weight: "14 kg",
      reps: "8 reps",
      feedback: "Best tempo yet; minor knee drift on the final rep only.",
    },
    {
      id: "fh_001_3",
      exercise: "Goblet Squat",
      score: 85,
      date: "May 24",
      weight: "12 kg",
      reps: "10 reps",
      feedback: "Depth held for 6 reps, ankle dorsiflexion limited reps 7-8.",
    },
  ],
  user_002: [
    {
      id: "fh_002_1",
      exercise: "Romanian Deadlift",
      score: 82,
      date: "May 27",
      weight: "20 kg",
      reps: "10 reps",
      feedback: "Hip hinge pattern is clean. Back stayed neutral through all reps. Push to 24 kg next session.",
    },
    {
      id: "fh_002_2",
      exercise: "Romanian Deadlift",
      score: 78,
      date: "May 26",
      weight: "20 kg",
      reps: "10 reps",
      feedback: "Good form on first 7 reps. Slight back rounding on reps 8 to 10. Slow down the descent.",
    },
    {
      id: "fh_002_3",
      exercise: "Romanian Deadlift",
      score: 74,
      date: "May 22",
      weight: "20 kg",
      reps: "10 reps",
      feedback: "Solid session. Hamstring engagement visible. Work on maintaining tension at the bottom.",
    },
  ],
  user_003: [
    {
      id: "fh_003_1",
      exercise: "Goblet Squat",
      score: 72,
      date: "May 27",
      weight: "22 kg",
      reps: "8 reps",
      feedback: "Slight improvement from last session. Ankle mobility is still limiting depth. Prioritise mobility work.",
    },
    {
      id: "fh_003_2",
      exercise: "Goblet Squat",
      score: 71,
      date: "May 25",
      weight: "22 kg",
      reps: "8 reps",
      feedback: "Consistent scores but no breakthrough yet. Try heel-elevated squats to unlock more depth.",
    },
    {
      id: "fh_003_3",
      exercise: "Goblet Squat",
      score: 70,
      date: "May 21",
      weight: "22 kg",
      reps: "8 reps",
      feedback: "Stuck at this weight for 4 weeks. Form is safe but depth is limited. Mobility drills needed.",
    },
  ],
}
