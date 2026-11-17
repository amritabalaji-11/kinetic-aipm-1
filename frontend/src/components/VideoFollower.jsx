import { useEffect } from "react"
import { currentMove, tickBefore } from "../utils/routineFollow"

// Draws nothing. While a routine's video plays, it checks the video once a second: ticks the moves the video has moved past and says which move is on.
// `latest` holds the newest { workout, commit } from the page, so a check never works from an old copy.
export default function VideoFollower({ followId, ready, playerRef, latest, onNow }) {
  useEffect(() => {
    if (!followId || !ready) return undefined
    const id = setInterval(() => {
      const secs = playerRef.current?.time?.()
      const { workout, commit } = latest.current
      const block = workout.blocks.find((b) => b.id === followId)
      if (typeof secs !== "number" || !block) return
      const index = currentMove(block.items, secs)
      onNow((n) => (n && n.id === followId && n.index === index ? n : { id: followId, index }))
      const items = tickBefore(block.items, index)
      if (items !== block.items) commit({ ...workout, blocks: workout.blocks.map((b) => (b.id === followId ? { ...b, items } : b)) })
    }, 1000)
    return () => clearInterval(id)
  }, [followId, ready, playerRef, latest, onNow])
  return null
}
