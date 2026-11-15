import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import ShareChoice from "../components/ShareChoice"
import { DEMO_USERS, useUser } from "../context/UserContext"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"

// Shown once, right after a first sign-in. For now it has one question (can our team watch your videos?); more steps can follow it.
// Someone who has already answered (or a demo account) goes straight on to Home.
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { activeUser, activeUserId, chooseSharing } = useUser()
  const loading = Boolean(activeUserId) && !activeUser  // signed in, profile still loading: wait, do not decide yet
  const done = !loading && (!activeUser || DEMO_USERS[activeUser.id] || activeUser.shareVideos !== null)

  useEffect(() => { if (done) navigate("/home", { replace: true }) }, [done, navigate])
  if (loading || done) return null

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, padding: "64px 24px 40px" }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <ShareChoice onChoose={async (share) => { await chooseSharing(share); navigate("/home", { replace: true }) }} />
      </div>
    </div>
  )
}
