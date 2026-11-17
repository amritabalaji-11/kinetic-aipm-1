import { BRICOLAGE } from "./planUi"

// The "best project you'll ever work on is YOU" banner, in the Kinetic look: the peach, lavender and mint gradient, the four scanner corners from the
// logo (all the same distance in from the edge), and a big gradient YOU. `bottomSpace` leaves room for something that overlaps its lower edge (the avatar).
const CORNER = { position: "absolute", width: 16, height: 16, borderStyle: "solid", borderWidth: 0 }
const EDGE = "3px solid"
const BLUE = "#3b82f6"
const VIOLET = "#8b5cf6"

export default function MotivationBanner({ height = 112, bottomSpace = 0, rounded = 16, youSize = 40, style }) {
  const inset = 10
  return (
    <div role="img" aria-label="The best project you'll ever work on is you."
      style={{ position: "relative", height, borderRadius: rounded, background: "linear-gradient(135deg, #FBE7E0 0%, #E6DEFF 52%, #D6F5EA 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: `0 24px ${bottomSpace}px`, boxSizing: "border-box", overflow: "hidden", ...style }}>
      <i style={{ ...CORNER, left: inset, top: inset, borderTop: `${EDGE} ${BLUE}`, borderLeft: `${EDGE} ${BLUE}`, borderTopLeftRadius: 5 }} />
      <i style={{ ...CORNER, right: inset, top: inset, borderTop: `${EDGE} ${VIOLET}`, borderRight: `${EDGE} ${VIOLET}`, borderTopRightRadius: 5 }} />
      <i style={{ ...CORNER, left: inset, bottom: inset, borderBottom: `${EDGE} ${BLUE}`, borderLeft: `${EDGE} ${BLUE}`, borderBottomLeftRadius: 5 }} />
      <i style={{ ...CORNER, right: inset, bottom: inset, borderBottom: `${EDGE} ${VIOLET}`, borderRight: `${EDGE} ${VIOLET}`, borderBottomRightRadius: 5 }} />
      <div aria-hidden="true" style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 11.5, letterSpacing: "0.14em", lineHeight: 1.35, color: "#1E1B4B", textTransform: "uppercase" }}>
        The best project<br />you&apos;ll ever work on is
      </div>
      <div aria-hidden="true" style={{ fontFamily: BRICOLAGE, fontWeight: 900, fontSize: youSize, lineHeight: 1, letterSpacing: "0.02em", marginTop: 2, background: "linear-gradient(92deg, #0284C7 0%, #6D5CE7 55%, #9747FF 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>YOU.</div>
    </div>
  )
}
