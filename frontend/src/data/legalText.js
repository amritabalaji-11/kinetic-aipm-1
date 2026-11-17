// Short legal-ish texts shown inside the app. The Terms and Privacy pages carry the full versions.
// Bump HEALTH_NOTICE_VERSION whenever the health note's wording changes: everyone is then asked to tick it again.

export const CONTACT_EMAIL = "amrita.balaji@gmail.com"

export const HEALTH_NOTICE_VERSION = "2026-11-16"
export const HEALTH_NOTICE = {
  title: "A note before you start",
  intro: "Kinetic’s workouts and tips are based on what has worked for me, Amrita. They’re general fitness information, not medical advice.",
  conditions: ["pregnant or recently gave birth", "breastfeeding", "diastasis recti", "a heart condition", "a past or present injury or pain"],
  advice: "please check with a doctor or physio before following them. And stop any exercise that hurts.",
  tick: "I understand this isn’t medical advice, and I’ll check with a professional if any of this applies to me.",
  after: "You can read this again any time in Profile → Terms.",
}

export const INJURY_REMINDER = "Thanks for telling us. Please check these workouts with a doctor or physio before you start, and skip anything that hurts."

export const CREATOR_NOTE = {
  title: "About these videos",
  paragraphs: [
    "The demo videos in Kinetic are made by independent creators. They play through YouTube’s own player, straight from the creator’s channel; we don’t copy or host them, and creators can switch embedding off at any time.",
    "We show them as references for how an exercise looks, and we always credit the creator. Kinetic isn’t connected to, sponsored by or endorsed by them.",
  ],
  takedown: `Are you the creator and want a video removed? Email ${CONTACT_EMAIL}.`,
}
