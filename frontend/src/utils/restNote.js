// "3 Rounds · 60-90 secs rest" -> 90. "2 minutes rest" -> 120. Falls back to 90.
export function restSecondsFromNote(note = "") {
  const secs = note.match(/(\d+)(?:-(\d+))?\s*secs?\s*(?:rest|off)/i)
  if (secs) return Number(secs[2] || secs[1])
  const mins = note.match(/(\d+)\s*min(?:ute)?s?\s*rest/i)
  if (mins) return Number(mins[1]) * 60
  return 90
}
