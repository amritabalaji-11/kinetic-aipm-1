import Model from "react-body-highlighter"
import { DM_SANS, GRAY, INK, cardStyle } from "./planUi"

// Which muscles the guide's names mean on the body diagram. A name can light up more than one area.
const MODEL_MUSCLES = {
  quads: ["quadriceps"], quadriceps: ["quadriceps"],
  glutes: ["gluteal"], glute: ["gluteal"], hips: ["gluteal"],
  hamstring: ["hamstring"], hamstrings: ["hamstring"],
  calves: ["calves"],
  adductors: ["adductor"],
  core: ["abs", "obliques"], abs: ["abs"], obliques: ["obliques"],
  chest: ["chest"],
  "upper back": ["upper-back", "trapezius"], back: ["upper-back", "lower-back"], "lower back": ["lower-back"], ql: ["lower-back"], lats: ["upper-back"],
  shoulders: ["front-deltoids", "back-deltoids"], deltoids: ["front-deltoids", "back-deltoids"],
  biceps: ["biceps"], triceps: ["triceps"], forearms: ["forearm"],
}
const toModel = (names) => names.flatMap((n) => MODEL_MUSCLES[n.toLowerCase()] ?? [])

// Which of the two views a muscle can be seen from, so each name can say "front" or "back"
const ON_FRONT = new Set(["quadriceps", "abs", "obliques", "chest", "biceps", "front-deltoids", "forearm", "adductor"])
const ON_BACK = new Set(["gluteal", "hamstring", "upper-back", "trapezius", "lower-back", "triceps", "back-deltoids"])
function viewOf(name) {
  const parts = toModel([name])
  if (parts.length && parts.every((m) => ON_FRONT.has(m))) return "front"
  if (parts.length && parts.every((m) => ON_BACK.has(m))) return "back"
  return "front and back"
}

const MAIN = "#E5484D"    // red. index.css pulses polygons with this exact colour, so change both together
const HELPING = "#F5B800" // yellow
const BODY = "#D6D3E8"    // muscles not used

// The body diagram colours a muscle by how many "exercises" list it, so main muscles are listed twice (red) and helping once (yellow)
function diagramData(main, helping) {
  const m = toModel(main)
  const h = toModel(helping).filter((x) => !m.includes(x))
  return [
    { name: "main", muscles: m },
    { name: "main-too", muscles: m },
    { name: "helping", muscles: h },
  ].filter((e) => e.muscles.length > 0)
}

// Front and back views with the muscles this exercise works: main in red, helping in yellow
export default function MuscleMap({ main, helping }) {
  const data = diagramData(main, helping)
  const figure = { width: 82, flexShrink: 0 }
  return (
    <div style={{ ...cardStyle, padding: 12, display: "flex", alignItems: "center", gap: 12, margin: "10px 0 14px" }}>
      <div className="muscle-map" style={{ display: "flex", gap: 6 }}>
        {["anterior", "posterior"].map((view) => (
          <div key={view} style={{ textAlign: "center" }}>
            <Model type={view} data={data} bodyColor={BODY} highlightedColors={[HELPING, MAIN]} style={figure} svgStyle={{ width: "100%", height: "auto" }} />
            <span style={{ fontFamily: DM_SANS, fontSize: 10, color: GRAY }}>{view === "anterior" ? "Front" : "Back"}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Legend color={MAIN} label="Main muscles" names={main} />
        <Legend color={HELPING} label="Also working" names={helping} />
      </div>
    </div>
  )
}

function Legend({ color, label, names }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: color, flexShrink: 0 }} /> {label}
      </div>
      <div style={{ marginTop: 2 }}>
        {names.map((n) => (
          <div key={n} style={{ fontFamily: DM_SANS, fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.45 }}>
            {n} <span style={{ fontWeight: 400, color: GRAY, fontSize: 12 }}>· {viewOf(n)} view</span>
          </div>
        ))}
      </div>
    </div>
  )
}
