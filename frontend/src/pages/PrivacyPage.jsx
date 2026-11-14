import LegalPage, { CONTACT_EMAIL } from "./LegalPage"

// Written in plain language. It describes what the app really does today; update it whenever that changes, and have it checked by someone qualified.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="14 November 2026" sections={[
      { heading: "In short", body: [["Your videos are private. Only you can see them.", "The Kinetic team can watch a video only if you turn on “Let the Kinetic team watch this video to improve the feedback” for that video, or if you attach it to feedback you send us.", "You can turn that off at any time, and you can ask us to delete your data."]] },
      { heading: "What we collect", body: ["Your name and email from your sign-in. The workouts and plans you create and log. The videos you upload and the results we make from them. Any feedback you send, with the photos and videos you attach. Basic use of the app, such as when you sign in and what you do, so we can keep it working and improve it."] },
      { heading: "How we use your videos", body: ["We analyse a video with computer vision and AI to give you feedback on your form. Videos and the pictures made from them are stored privately; nobody can open them without a short-lived private link.", "By default, no one at Kinetic watches your videos. If you switch on sharing for a video, our team may watch it next to the feedback we gave, to check and improve that feedback. Switching it off again stops us from opening it."] },
      { heading: "Who can see what", body: ["You can see your own data. People on the Kinetic team who run the app can see who has signed up, how people use it, and the feedback people send. Whenever one of them opens a person’s details or reveals an email address, it is written to a log."] },
      { heading: "Services that help us run Kinetic", body: ["We use Google for sign-in and for cloud hosting and storage, a database provider, an AI provider to analyse form and write feedback, a voice provider for audio coaching, and a service to read the words in a video when you ask Kinetic to turn a video into a routine. YouTube videos in the app are played by YouTube, which may set its own cookies."] },
      { heading: "Your choices", body: [["Turn video sharing on or off for any video, on its results screen.", "Ask for a copy of your data, or ask us to delete your account and everything we hold about you, by emailing us."], `We keep your account and videos until you ask us to delete them.`] },
      { heading: "Contact", body: [`Questions or requests: ${CONTACT_EMAIL}`] },
    ]} />
  )
}
