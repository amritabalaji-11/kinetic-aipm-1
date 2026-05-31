import { useEffect, useState } from "react"

const BASE_URL = "http://localhost:8000"

const HomePage = () => {
  const [ladderUrl, setLadderUrl] = useState(null)
  const [ladderLoading, setLadderLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem("user_id") || "dev-user"
    fetch(`${BASE_URL}/users/${userId}/profile-images`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setLadderUrl(d?.progress_ladder_image_url ?? null)
        setLadderLoading(false)
      })
      .catch(() => setLadderLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-light-bg px-5 pt-8 pb-6" style={{ colorScheme: "light" }}>
      <h1 className="text-text-primary font-sans text-heading-1 mb-6">Home</h1>

      <div className="rounded-2xl bg-white p-4" style={{ border: "1.5px solid #c7d2fe" }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Progress Ladder</h2>

        {ladderLoading ? (
          <div className="w-full rounded-xl animate-pulse bg-gray-200" style={{ height: 180 }} />
        ) : ladderUrl ? (
          <img
            src={ladderUrl}
            alt="Progress ladder"
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: 300 }}
          />
        ) : (
          <div className="w-full rounded-xl flex items-center justify-center bg-gray-100" style={{ height: 180 }}>
            <p className="text-sm text-gray-400">Complete a session to see your progress ladder</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage