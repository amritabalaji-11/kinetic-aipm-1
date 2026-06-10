import { useEffect, useState, useMemo } from "react"
import { Navigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function ProfilePage() {
  const { activeUserId } = useUser()
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeUserId) return

    setLoading(true)
    fetch(`${BASE_URL}/users/${activeUserId}/details`)
      .then(r => r.json())
      .then(data => {
        setProfile(data.user_profile ?? null)
        setWorkouts(Array.isArray(data.workout_sessions) ? data.workout_sessions : [])
      })
      .finally(() => setLoading(false))
  }, [activeUserId])

  if (!activeUserId) {
    return <Navigate to="/login" replace />
  }

  const stats = useMemo(() => {
    if (!workouts.length) return { totalSessions: 0, totalSets: 0, lastDate: null, trend: [], maxW: 1 }

    // group rows by session_id
    const sessionMap = workouts.reduce((acc, row) => {
      if (!acc[row.session_id]) acc[row.session_id] = []
      acc[row.session_id].push(row)
      return acc
    }, {})

    const sessions = Object.values(sessionMap)
      .map(rows => ({
        date: rows[0].logged_at,
        sets: rows,
        avgW: rows.reduce((a, r) => a + r.weight_value, 0) / rows.length,
        totalVol: rows.reduce((a, r) => a + r.weight_value * r.rep_count, 0),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    const trend = sessions.map(s => s.avgW)
    const maxW  = Math.max(...trend)

    return {
      totalSessions: sessions.length,
      totalSets: workouts.length,
      lastDate: new Date(sessions.at(-1).date),
      trend,
      maxW,
      sessions, // used in the history list below
    }
  }, [workouts])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eeff] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0eeff] p-4">
      <div className="max-w-md mx-auto space-y-4 pb-8">

        {/* PROFILE CARD */}
        {profile && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 mt-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
              {profile.display_name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate">{profile.display_name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {profile.gender} · Age {profile.age} · {profile.level}
              </p>
              <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                profile.injury_report
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-600"
              }`}>
                {profile.injury_report ? "Injury reported" : "No injuries"}
              </span>
            </div>
          </div>
        )}

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <div className="text-xs text-gray-400 mt-0.5">Sessions</div>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold">{stats.totalSets}</div>
            <div className="text-xs text-gray-400 mt-0.5">Total sets</div>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <div className="text-sm font-bold mt-1">
              {stats.lastDate ? stats.lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Last workout</div>
          </div>
        </div>

        {/* WEIGHT PROGRESSION */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-bold mb-0.5">Weight progression</div>
          <div className="text-xs text-gray-400 mb-3">avg kg · per session</div>
          {stats.trend.length < 2 ? (
            <p className="text-xs text-gray-400">Not enough data yet</p>
          ) : (
            <div className="flex gap-1.5 items-end h-20">
              {stats.trend.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-indigo-400 rounded-t"
                    style={{ height: `${Math.round((w / stats.maxW) * 100)}%` }}
                    title={`${w.toFixed(1)} kg`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SESSION HISTORY */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-bold mb-3">Session history</div>
          <div className="space-y-3">
            {(stats.sessions ?? []).slice().reverse().map((sess, i) => {
              const date = new Date(sess.date)
              const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              const totalVol = Math.round(sess.totalVol)
              const exerciseName = sess.sets[0]?.exercise_name ?? "Exercise"

              return (
                <details key={i} className="group" {...(i === 0 ? { open: true } : {})}>
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div>
                      <span className="text-sm font-medium">{exerciseName}</span>
                      <span className="text-xs text-gray-400 ml-2">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{totalVol} kg·rep</span>
                      <span className="text-gray-300 group-open:rotate-90 transition-transform text-xs">▶</span>
                    </div>
                  </summary>

                  <table className="w-full mt-2 text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-1 font-medium">Set</th>
                        <th className="text-right pb-1 font-medium">Weight</th>
                        <th className="text-right pb-1 font-medium">Reps</th>
                        <th className="text-right pb-1 font-medium">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sess.sets.map(s => (
                        <tr key={s.set_number} className="border-b border-gray-50 last:border-0">
                          <td className="py-1 text-gray-500">Set {s.set_number}</td>
                          <td className="py-1 text-right">{s.weight_value} {s.weight_unit}</td>
                          <td className="py-1 text-right">{s.rep_count}</td>
                          <td className="py-1 text-right text-indigo-400 font-medium">
                            {Math.round(s.weight_value * s.rep_count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}