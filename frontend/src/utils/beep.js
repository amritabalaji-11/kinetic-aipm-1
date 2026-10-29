// A short beep (and a buzz on Android) for when a timer ends. Phones only allow sound after a tap,
// so call unlockAudio() inside the tap that starts a timer.
let ctx = null

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === "suspended") ctx.resume()
  } catch { /* no sound: the timer still works */ }
}

export function beep(times = 2) {
  try {
    unlockAudio()
    const t0 = ctx.currentTime
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.28)
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.28 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.28 + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + i * 0.28)
      osc.stop(t0 + i * 0.28 + 0.22)
    }
  } catch { /* no sound */ }
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* not supported (iPhone) */ }
}

// Says a short word out loud ("Work", "Rest", "Round 3") through the phone's own voice, if it has one.
export function speak(text) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05
    window.speechSynthesis.speak(u)
  } catch { /* no voice */ }
}
