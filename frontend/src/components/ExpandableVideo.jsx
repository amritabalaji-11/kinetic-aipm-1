import { useEffect, useRef, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

// A YouTube video (through YouTube's own player) that can be maximised to fill the screen and minimised again.
// The same player keeps playing when it is maximised. Options:
//   cover  - something to show until it is tapped (the player then loads and starts); without it the player loads straight away
//   loop   - repeat the video
// A widescreen video on Android turns the phone to landscape when maximised (where the browser allows it).
// iPhones do not allow the browser's own full screen for web pages, so a screen-sized overlay is used there.
const BAR = {
  position: "absolute", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  border: "none", cursor: "pointer", background: "rgba(15,23,42,0.72)", color: "#FFFFFF", fontFamily: "'DM Sans'", fontWeight: 600,
}

export default function ExpandableVideo({ youtubeId, title, vertical = false, width = "100%", cover = null, loop = false }) {
  const [started, setStarted] = useState(!cover)
  const [expanded, setExpanded] = useState(false)
  const boxRef = useRef(null)

  function maximise() {
    setStarted(true)
    setExpanded(true)
    const box = boxRef.current
    if (!vertical && box?.requestFullscreen) {
      // real full screen, and landscape on phones that allow it; if either is refused the overlay still works
      box.requestFullscreen()
        .then(() => screen.orientation?.lock?.("landscape").catch(() => {}))
        .catch(() => {})
    }
  }

  function minimise() {
    setExpanded(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    try { screen.orientation?.unlock?.() } catch { /* not supported */ }
  }

  useEffect(() => {
    if (!expanded) return undefined
    const onKey = (e) => { if (e.key === "Escape") minimise() }
    // leaving full screen with the phone's own back gesture should also minimise
    const onFullscreenChange = () => { if (!document.fullscreenElement) setExpanded(false) }
    window.addEventListener("keydown", onKey)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden" // the page behind does not scroll
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      document.body.style.overflow = previous
    }
  }, [expanded])

  const params = `playsinline=1&rel=0&modestbranding=1${loop ? `&loop=1&playlist=${youtubeId}` : ""}${cover ? "&autoplay=1" : ""}`

  return (
    // a same-size spacer keeps the page from jumping while the video is maximised
    <div style={{ position: "relative", width, aspectRatio: vertical ? "9 / 16" : "16 / 9" }}>
      <div
        ref={boxRef}
        style={expanded
          ? { position: "fixed", inset: 0, zIndex: 4000, background: "#000000" }
          : { position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", background: "#0F172A" }}
      >
        {started ? (
          <iframe
            title={title}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?${params}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            style={expanded && !vertical
              // a widescreen video keeps its shape, centred on black: as wide as the screen allows, or as tall as it
              // is when the phone is on its side. (Stretching it to a tall screen cropped it.)
              ? { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(100vw, 177.78vh)", height: "auto", aspectRatio: "16 / 9", border: 0 }
              : { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <button type="button" aria-label={`Play: ${title}`} onClick={() => setStarted(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", padding: 0, cursor: "pointer", background: "none" }}>
            {cover}
          </button>
        )}
        {expanded ? (
          <button type="button" aria-label="Minimize video" onClick={minimise}
            style={{ ...BAR, top: "max(14px, env(safe-area-inset-top))", right: 14, height: 44, padding: "0 16px", borderRadius: 22, fontSize: 14 }}>
            <Minimize2 size={18} /> Minimize
          </button>
        ) : (
          <button type="button" aria-label="Full screen" onClick={maximise}
            style={{ ...BAR, top: 6, right: 6, width: 36, height: 36, borderRadius: 18 }}>
            <Maximize2 size={17} />
          </button>
        )}
      </div>
    </div>
  )
}
