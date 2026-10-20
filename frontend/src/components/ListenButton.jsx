import { useState, useRef, useEffect } from "react"
import { apiFetch } from "../services/api"

// Reads `text` aloud via the backend /tts route (ElevenLabs).
// Audio is cached in the browser per text, so replaying the same text doesn't cost another call.
const audioCache = new Map() // text -> blob URL

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const VARIANTS = {
  onDark: { background: "rgba(255,255,255,0.2)", color: "#FFFFFF" },
  light: { background: "#FCF9FF", color: "#8133FF", border: "1px solid #A36CFB" },
}

export default function ListenButton({ text, variant = "onDark" }) {
  const [status, setStatus] = useState("idle") // idle | loading | playing | error
  const audioRef = useRef(null)

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setStatus("idle")
  }

  useEffect(() => stop, [])

  async function handleClick() {
    if (status === "playing") return stop()
    if (status === "loading" || !text) return
    setStatus("loading")
    try {
      let url = audioCache.get(text)
      if (!url) {
        const res = await apiFetch(`${BASE_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) throw new Error(`TTS failed: ${res.status}`)
        url = URL.createObjectURL(await res.blob())
        audioCache.set(text, url)
      }
      const audio = new Audio(url)
      audio.onended = () => setStatus("idle")
      audioRef.current = audio
      await audio.play()
      setStatus("playing")
    } catch (err) {
      console.error("❌ Listen failed:", err)
      setStatus("error")
    }
  }

  if (!text) return null
  const label = { idle: "Listen", loading: "Loading…", playing: "Stop", error: "Try again" }[status]
  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-xs font-semibold px-3 py-1 rounded-full hover:opacity-90"
      style={VARIANTS[variant]}
    >
      🔊 {label}
    </button>
  )
}
