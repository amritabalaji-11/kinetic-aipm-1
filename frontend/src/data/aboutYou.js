// One question each. `multi` ones can have several answers. Every answer is optional.
export const QUESTIONS = [
  { key: "experience", label: "How long have you been training?", options: [["new", "Just starting"], ["1-2", "1–2 years"], ["3+", "3+ years"]] },
  { key: "workouts_per_week", label: "How many times a week do you work out?", options: [["never", "Never"], ["1-2", "1–2"], ["3-4", "3–4"], ["5+", "5 or more"]] },
  { key: "training_types", multi: true, label: "What do you mostly do to train? Select all that apply.", options: [["cardio", "Cardio"], ["strength", "Strength training"], ["yoga_pilates", "Yoga / Pilates"], ["group_classes", "Group classes"]] },
  { key: "age_range", label: "Age range", options: [["18-29", "18–29"], ["30-39", "30–39"], ["40+", "40+"]] },
  { key: "gender", label: "Gender", options: [["woman", "Woman"], ["man", "Man"], ["non_binary", "Non-binary"], ["prefer_not_to_say", "Prefer not to say"]] },
]

export const INJURY_LABEL = "Past injuries or pain"
