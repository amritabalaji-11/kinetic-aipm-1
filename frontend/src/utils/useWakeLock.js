import { useEffect } from "react"

// Keeps the phone's screen from locking while `active` is true. A phone that locks (or switches away) pauses the page,
// and an upload would stall. Where the browser has no such feature, or refuses, nothing happens.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return undefined
    let lock = null
    let stopped = false
    const take = async () => {
      try {
        const got = await navigator.wakeLock.request("screen")
        if (stopped) got.release().catch(() => {})
        else lock = got
      } catch { /* refused (for example battery saver): carry on without it */ }
    }
    take()
    // the lock is dropped when the page goes out of view, so ask again when it comes back
    const again = () => { if (document.visibilityState === "visible" && !stopped) take() }
    document.addEventListener("visibilitychange", again)
    return () => {
      stopped = true
      document.removeEventListener("visibilitychange", again)
      lock?.release().catch(() => {})
    }
  }, [active])
}
