// What we can tell about a pasted video link without asking the server: which site, and (for YouTube) the picture.

const SITE_NAMES = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" }

function hostOf(url) {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`) } catch { return null }
}

export function youtubeIdFrom(link) {
  const u = hostOf(String(link || "").trim())
  if (!u) return null
  const host = u.hostname.replace(/^www\.|^m\./, "")
  let id = null
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0]
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v")
    else id = (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/) || [])[1]
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null
}

// A link to some site other than YouTube (YouTube is the only site we read for now). Text that is not a link at all is not "another site".
export function isOtherSite(link) {
  const text = String(link || "").trim()
  if (!text || /\s/.test(text)) return false
  const u = hostOf(text)
  if (!u || !u.hostname.includes(".")) return false
  const host = u.hostname.replace(/^www\.|^m\./, "")
  return !["youtube.com", "youtu.be", "music.youtube.com"].includes(host)
}

// { site, name, short, pictures } or null when the text is not a link we know yet. `pictures` are tried in order.
export function previewOf(link) {
  const text = String(link || "").trim()
  const id = youtubeIdFrom(text)
  if (id) {
    return {
      site: "youtube", name: SITE_NAMES.youtube, short: `youtu.be/${id}`,
      pictures: [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`],
      small: [`https://i.ytimg.com/vi/${id}/mqdefault.jpg`],
    }
  }
  const u = hostOf(text)
  if (!u) return null
  const host = u.hostname.replace(/^www\./, "")
  for (const site of ["instagram", "tiktok"]) {
    if (host === `${site}.com` || host.endsWith(`.${site}.com`)) {
      const path = u.pathname.replace(/\/$/, "")
      return { site, name: SITE_NAMES[site], short: `${host}${path.length > 24 ? `${path.slice(0, 22)}…` : path}`, pictures: [], small: [] }
    }
  }
  return null
}
