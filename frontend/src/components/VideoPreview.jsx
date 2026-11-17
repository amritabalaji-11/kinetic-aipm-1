import { useState } from "react"
import { Clapperboard, Play } from "lucide-react"
import { BRICOLAGE, DM_SANS, GRAY, INK } from "./planUi"
import { previewOf } from "../utils/videoLink"

// The video being read, so the waiting screen is not empty: its own picture (YouTube) or a soft gradient card (other sites), with the scanner line moving over it.
export default function VideoPreview({ link }) {
  const p = previewOf(link)
  const [tried, setTried] = useState(0) // which picture we are on; past the last one, the gradient card shows
  if (!p) return null
  const picture = p.pictures[tried]
  const corner = (pos) => ({ position: "absolute", width: 20, height: 20, border: "3px solid #fff", opacity: 0.9, zIndex: 2, ...pos })
  return (
    <div aria-hidden="true" style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(129,51,255,0.25)", boxShadow: "0 4px 14px rgba(129,51,255,0.1)", marginTop: 14 }}>
      <div style={{ position: "relative", height: 178, background: picture ? "#1E1B4B" : "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 55%, #D6F5EA 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
        {picture
          ? <img src={picture} alt="" onError={() => setTried((n) => n + 1)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : <>
              <span style={{ width: 54, height: 54, borderRadius: 27, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#8133ff", boxShadow: "0 2px 8px rgba(129,51,255,0.2)" }}><Clapperboard size={24} /></span>
              <span style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: INK }}>{p.name} video</span>
            </>}
        {picture && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.45))" }} />}
        <span style={corner({ left: 10, top: 10, borderRight: "none", borderBottom: "none", borderRadius: "6px 0 0 0" })} />
        <span style={corner({ right: 10, top: 10, borderLeft: "none", borderBottom: "none", borderRadius: "0 6px 0 0" })} />
        <span style={corner({ left: 10, bottom: 10, borderRight: "none", borderTop: "none", borderRadius: "0 0 0 6px" })} />
        <span style={corner({ right: 10, bottom: 10, borderLeft: "none", borderTop: "none", borderRadius: "0 0 6px 0" })} />
        <span className="vp-scan" style={{ position: "absolute", left: 0, right: 0, top: "10%", height: 3, zIndex: 2, background: "linear-gradient(90deg, transparent, #9747FF, #0284C7, transparent)", boxShadow: "0 0 14px 3px rgba(151,71,255,0.65)" }} />
      </div>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: DM_SANS, fontSize: 12.5, color: GRAY }}>
        <Play size={12} fill={GRAY} /> <b style={{ color: INK, fontWeight: 600 }}>{p.short}</b>
      </div>
      <style>{`.vp-scan{animation:vpscan 2.6s ease-in-out infinite}@keyframes vpscan{0%,100%{top:10%}50%{top:88%}}@media (prefers-reduced-motion:reduce){.vp-scan{animation:none;top:50%}}`}</style>
    </div>
  )
}
