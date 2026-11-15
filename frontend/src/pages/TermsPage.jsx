import LegalPage, { CONTACT_EMAIL } from "./LegalPage"

// Plain-language terms for the app as it is today. Have these checked by someone qualified before you rely on them.
export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="14 November 2026" sections={[
      { heading: "Using Kinetic", body: ["Kinetic helps you plan and log workouts and gives feedback on your exercise form. By signing in you agree to these terms and to our Privacy policy."] },
      { heading: "Not medical advice", body: ["Kinetic’s guides and feedback are general information, not medical or professional advice. The AI can be wrong, and it only sees what the camera shows. Choose weights and movements that are right for your body. Stop if something hurts, and talk to a doctor or physio about any injury or health condition before you train."] },
      { heading: "Your content", body: ["The videos, photos and messages you send stay yours. You let us store and process them to run the app and to give you feedback. We only let our team watch a video as described in the Privacy policy."] },
      { heading: "Looking after your account", body: ["Keep your sign-in secure. Please only upload videos of yourself, or of people who are happy for you to share them, and nothing unlawful or harmful."] },
      { heading: "Changes and contact", body: [`We may change the app and these terms as Kinetic grows, and we will update the date above. Questions: ${CONTACT_EMAIL}`] },
    ]} />
  )
}
