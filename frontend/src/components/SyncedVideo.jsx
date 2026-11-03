import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"

// A YouTube video inside the page that tells us when it is played or paused (through YouTube's own player interface),
// and can be played or paused from outside, so a timer can follow the video.
//   onState: "playing" | "paused" | "ended" | "buffering"
// ref gives { play(), pause(), ready }
let apiPromise = null
function loadYouTubeApi() {
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      if (window.YT?.Player) return resolve(window.YT)
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT) }
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.async = true
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

const NAMES = { 1: "playing", 2: "paused", 0: "ended", 3: "buffering" }

// What YouTube's error codes mean, in plain words
const WHY = {
  100: "This video was removed or is private.",
  101: "The creator doesn't allow this video to play inside other apps.",
  150: "The creator doesn't allow this video to play inside other apps.",
  153: "YouTube couldn't tell which app the video is playing in. A privacy setting or extension in the browser (for example one that hides where you came from) can cause this.",
  2: "The player couldn't open this video link.",
  5: "The player ran into a problem on this device.",
}

const SyncedVideo = forwardRef(function SyncedVideo({ videoId, title, onState, onReadyChange }, ref) {
  const host = useRef(null)
  const player = useRef(null)
  const onStateRef = useRef(onState)
  const [failed, setFailed] = useState(null) // the YouTube error code, if the video cannot play
  const playingRef = useRef(false)
  const readyRef = useRef(false) // read at the moment of asking, so it is never a render behind
  onStateRef.current = onState
  const onReadyRef = useRef(onReadyChange)
  onReadyRef.current = onReadyChange

  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return
      const mount = document.createElement("div")
      host.current.appendChild(mount)
      player.current = new YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (!cancelled) { readyRef.current = true; onReadyRef.current?.(true) } },
          onStateChange: (e) => { const name = NAMES[e.data]; if (name === "playing") playingRef.current = true; else if (name && name !== "buffering") playingRef.current = false; if (name) onStateRef.current?.(name) },
          onError: (e) => { if (cancelled) return; readyRef.current = false; setFailed(e.data); onReadyRef.current?.(false) }, // the timer then runs on its own
        },
      })
    })
    return () => { cancelled = true; setFailed(null); try { player.current?.destroy() } catch { /* already gone */ } player.current = null; readyRef.current = false; onReadyRef.current?.(false) }
  }, [videoId])

  useImperativeHandle(ref, () => ({
    play: () => player.current?.playVideo?.(),
    pause: () => player.current?.pauseVideo?.(),
    time: () => player.current?.getCurrentTime?.() ?? 0, // where the video is, in seconds
    seekTo: (secs) => player.current?.seekTo?.(secs, true),
    get playing() { return playingRef.current },
    get ready() { return readyRef.current },
  }), [])

  return (
    <>
      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", background: "#0F172A", marginBottom: 8 }} aria-label={title ? `Video: ${title}` : "Video"}>
        <div ref={host} style={{ position: "absolute", inset: 0 }} />
      </div>
      {failed !== null && (
        <div role="alert" style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "10px 12px", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, lineHeight: 1.4, color: "#451A03" }}>
          <b style={{ color: "#92400E" }}>The video can&apos;t play here</b> (YouTube error {failed}). {WHY[failed] || "YouTube couldn't play it in this app."}
          {" "}<a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" style={{ color: "#6D28D9", fontWeight: 700 }}>Open on YouTube ↗</a>
          <div style={{ marginTop: 4 }}>The timer still works on its own: press Start on it.</div>
        </div>
      )}
    </>
  )
})

export default SyncedVideo
