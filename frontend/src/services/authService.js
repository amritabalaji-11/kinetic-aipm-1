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

// Returns { user_id, email, display_name, auth_provider }, or null if the token is missing/invalid
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
