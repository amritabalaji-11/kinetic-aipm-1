const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const TOKEN_KEY = "kinetic_token"

export const getToken = () => localStorage.getItem(TOKEN_KEY)

// Exchange a Google ID token for a Kinetic session token
export async function signInWithGoogle(idToken) {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Sign-in failed (${res.status})`)
  }
  const { access_token, user_id } = await res.json()
  localStorage.setItem(TOKEN_KEY, access_token)
  return user_id
}

// Does "Try demo" need a passcode? { enabled, passcode_required }
export async function getDemoStatus() {
  try {
    const res = await fetch(`${BASE_URL}/auth/demo/status`)
    return res.ok ? await res.json() : { enabled: false, passcode_required: false }
  } catch {
    return { enabled: false, passcode_required: false }
  }
}

// Guest login for one of the sample profiles ("Try demo"). The token only works for that profile.
export async function signInAsDemo(userId, passcode) {
  const res = await fetch(`${BASE_URL}/auth/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, passcode: passcode || null }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(res.status === 404 ? "Demo mode isn't available right now." : body.detail || "Demo login failed")
  }
  const { access_token, user_id } = await res.json()
  localStorage.setItem(TOKEN_KEY, access_token)
  return user_id
}

// The person's own "A little about you" answers (only theirs), for the About you page
export async function fetchAbout() {
  const res = await fetch(`${BASE_URL}/auth/me/about`, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) throw new Error("We couldn't load your answers.")
  return res.json()
}

// The optional "A little about you" answers: any of them may be left out; `clear: ["gender", ...]` takes an answer back
export async function saveAboutYou(answers) {
  const res = await fetch(`${BASE_URL}/auth/me/about`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(answers),
  })
  if (!res.ok) throw new Error("We couldn't save that.")
}

// The unit they log weights in ("kg" or "lbs"). Past sets keep their own unit. Returns what was saved.
export async function saveWeightUnit(unit) {
  const res = await fetch(`${BASE_URL}/auth/me/units`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ unit }),
  })
  if (!res.ok) throw new Error("We couldn't save that. Please try again.")
  return (await res.json()).weight_unit
}

// The line under their name on Profile (their favourite motivational line). An empty line clears it. Returns what was saved.
export async function saveMotivationLine(line) {
  const res = await fetch(`${BASE_URL}/auth/me/motivation`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ line }),
  })
  if (!res.ok) throw new Error("We couldn't save that. Please try again.")
  return (await res.json()).motivation_line || ""
}

// They ticked the health note ("not medical advice..."); we keep which version of the text they saw
export async function saveHealthNotice(version) {
  const res = await fetch(`${BASE_URL}/auth/me/health-notice`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ version }),
  })
  if (!res.ok) throw new Error("We couldn't save that. Please try again.")
  return version
}

// Saves their answer to "Can our team watch your videos to check and improve the feedback?" (true / false)
export async function saveSharingChoice(share) {
  const res = await fetch(`${BASE_URL}/auth/me/sharing`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ share }),
  })
  if (!res.ok) throw new Error("We couldn't save that. Please try again.")
  return share
}

// Returns { user_id, email, display_name, auth_provider, role, share_videos_default }, or null if the token is missing/invalid
// Is the saved sign-in still good? "expired" only when the server says so (401/403/404); a slow server or no signal is "unreachable",
// and the person stays signed in. Used by the splash screen, which used to sign people out on any failed request.
export async function checkSession() {
  const token = getToken()
  if (!token) return "expired"
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) return "valid"
    return [401, 403, 404].includes(res.status) ? "expired" : "unreachable"
  } catch {
    return "unreachable"
  }
}

export async function fetchMe() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
