// Following a workout video: which move the video is on, and which moves are finished because the video has moved past them.
// A move has `at` (the second of the video where it starts) when the video gave us one; moves without it are ticked once a later move has started.

// The index of the move the video is on: the furthest move that has already started. -1 before the first one (the intro).
export function currentMove(items, seconds) {
  let found = -1
  items.forEach((it, i) => { if (!it.rest && typeof it.at === "number" && it.at <= seconds) found = i })
  return found
}

// The items with every move before `index` ticked. Ticks only ever go forward, and the same list comes back when nothing changed.
export function tickBefore(items, index) {
  let changed = false
  const next = items.map((it, i) => {
    if (i < index && !it.rest && !it.done) { changed = true; return { ...it, done: true } }
    return it
  })
  return changed ? next : items
}

// Every move ticked (the video ended)
export const tickAll = (items) => tickBefore(items, items.length)

// Can this routine follow its video? It needs at least two moves with a start time.
export const canFollow = (items) => items.filter((it) => typeof it.at === "number").length >= 2
