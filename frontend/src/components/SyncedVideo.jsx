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

const SyncedVideo = forwardRef(function SyncedVideo({ videoId, title, onState, onReadyChange }, ref) {
  const host = useRef(null)
  const player = useRef(null)
  const onStateRef = useRef(onState)
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
          onStateChange: (e) => { const name = NAMES[e.data]; if (name) onStateRef.current?.(name) },
        },
      })
    })
    return () => { cancelled = true; try { player.current?.destroy() } catch { /* already gone */ } player.current = null; readyRef.current = false; onReadyRef.current?.(false) }
  }, [videoId])

  useImperativeHandle(ref, () => ({
    play: () => player.current?.playVideo?.(),
    pause: () => player.current?.pauseVideo?.(),
    get ready() { return readyRef.current },
  }), [])

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", background: "#0F172A", marginBottom: 8 }} aria-label={title ? `Video: ${title}` : "Video"}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
})

export default SyncedVideo
