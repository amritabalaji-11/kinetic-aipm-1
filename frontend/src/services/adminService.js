import { BASE_URL, apiFetch } from "./api"

// The admin pages' data. The server refuses anyone who is not an admin (403), whatever the app shows.
async function call(path) {
  let res
  try {
    res = await apiFetch(`${BASE_URL}/admin${path}`)
  } catch {
    throw Object.assign(new Error("We couldn't reach the server. Try again in a moment."), { status: 0 })
  }
  if (!res.ok) throw Object.assign(new Error(res.status === 403 ? "Admins only." : `Something went wrong (${res.status}).`), { status: res.status })
  return res.json()
}

export const getSummary = () => call("/summary")
export const getUsers = ({ q = "", limit = 30, offset = 0 } = {}) => call(`/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
export const getUser = (id) => call(`/users/${encodeURIComponent(id)}`)
export const revealEmail = (id) => call(`/users/${encodeURIComponent(id)}/email`)
