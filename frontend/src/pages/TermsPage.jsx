import LegalPage, { CONTACT_EMAIL } from "./LegalPage"
import { CREATOR_NOTE } from "../data/legalText"

// Plain-language terms for the app as it is today. Have these checked by someone qualified before you rely on them.
export const TERMS = {
  title: "Terms",
  updated: "16 November 2026",
  sections: [
      { heading: "Using Kinetic", body: ["Kinetic helps you plan and log workouts and gives feedback on your exercise form. By signing in you agree to these terms and to our Privacy policy."] },
      { heading: "Not medical advice", body: ["Kinetic’s workouts and tips are based on what has worked for its founder. They’re general fitness information, not medical or professional advice. The AI can be wrong, and it only sees what the camera shows.", "If you’re pregnant or recently gave birth, breastfeeding, have diastasis recti, a heart condition, or a past or present injury or pain, check with a doctor or physio before following them. Choose weights and movements that are right for your body, and stop any exercise that hurts."] },
      { heading: "Videos from other creators", body: [...CREATOR_NOTE.paragraphs.map((p) => p.replace("The demo videos in Kinetic", "Some exercise guides include videos that")), `If you’re a creator and would like a video removed from Kinetic, email ${CONTACT_EMAIL} and we’ll take it down promptly.`] },
      { heading: "Your content", body: ["The videos, photos and messages you send stay yours. You let us store and process them to run the app and to give you feedback. We only let our team watch a video as described in the Privacy policy."] },
      { heading: "Looking after your account", body: ["Keep your sign-in secure. Please only upload videos of yourself, or of people who are happy for you to share them, and nothing unlawful or harmful."] },
      { heading: "Changes and contact", body: [`We may change the app and these terms as Kinetic grows, and we will update the date above. Questions: ${CONTACT_EMAIL}`] },
  ],
}

export default function TermsPage() {
  return <LegalPage {...TERMS} />
}
