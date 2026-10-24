import { useEffect, useState } from "react"
import { apiFetch, BASE_URL } from "../services/api"

// The trainer-style scripts for an exercise ({ full, short }), written ahead of time and kept in the database.
// null while loading or when there is none (callers then fall back to reading the guide's points).
const cache = new Map() // exerciseId -> { full, short } | false

export function useCoachScript(exerciseId) {
  const [scripts, setScripts] = useState(() => cache.get(exerciseId) || null)
  useEffect(() => {
    if (!exerciseId) return undefined
    if (cache.has(exerciseId)) { setScripts(cache.get(exerciseId) || null); return undefined }
    let live = true
    apiFetch(`${BASE_URL}/exercises/${exerciseId}/guide`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const value = data?.coach_script ? { full: data.coach_script, short: data.coach_script_short || null } : false
        cache.set(exerciseId, value)
        if (live) setScripts(value || null)
      })
      .catch(() => {}) // offline: try again next time
    return () => { live = false }
  }, [exerciseId])
  return scripts
}
