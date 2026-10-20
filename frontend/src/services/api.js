// One place that talks to the backend: it attaches the signed-in user's login token to every request,
// and signs the user out (back to the splash screen) when the server says the token is no longer valid.
import { TOKEN_KEY, getToken } from "./authService"

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export async function apiFetch(input, options = {}) {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(input, { ...options, headers })

  if (res.status === 401 && token) {
    // expired or invalid token: forget this session and start again from the splash screen
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem("active_user_id")
    if (window.location.pathname !== "/") window.location.assign("/")
  }
  return res
}
