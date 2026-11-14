import { BASE_URL, apiFetch } from "./api"

// The "Let the Kinetic team watch this video to improve the feedback" switch for one analysis
export async function getTeamReview(analysisId) {
  const res = await apiFetch(`${BASE_URL}/analysis/${encodeURIComponent(analysisId)}`)
  if (!res.ok) throw new Error("load")
  return Boolean((await res.json()).analysis?.team_review_consent)
}

export async function setTeamReview(analysisId, allowed) {
  const res = await apiFetch(`${BASE_URL}/analysis/${encodeURIComponent(analysisId)}/team-review`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allowed }),
  })
  if (!res.ok) throw new Error("save")
  return allowed
}
