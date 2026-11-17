import { useState } from "react"
import { Clapperboard } from "lucide-react"
import { DM_SANS, GRAY, INK } from "./planUi"
import { previewOf } from "../utils/videoLink"

// On the result: a small picture of the video the routine came from, the creator, and a link back to it.
export default function VideoSourceRow({ source }) {
  const p = previewOf(source.url)
  const [broken, setBroken] = useState(false)
  const picture = !broken && p?.small[0]
  const site = p?.name ?? "the video"
  return (
    <a href={source.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid rgba(129,51,255,0.25)", borderRadius: 14, padding: 8, margin: "8px 0 10px", textDecoration: "none" }}>
      <span style={{ width: 92, aspectRatio: "16 / 9", borderRadius: 8, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)", color: "#8133ff" }}>
        {picture ? <img src={picture} alt="" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Clapperboard size={20} />}
      </span>
      <span style={{ fontFamily: DM_SANS, fontSize: 12, color: GRAY, minWidth: 0 }}>
        <b style={{ display: "block", color: INK, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source.author || `A ${site} video`}</b>
        Watch on {site} ↗
      </span>
    </a>
  )
}
