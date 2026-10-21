// Page backgrounds, in one place so every screen stays in step.
//
// Browse / landing screens (Plan, Home, Profile): a peach and lavender glow across the top that fades
// into the flat lilac. Task screens (workout planner, builder, logging, results, upload ...): flat lilac only.

export const FLAT_LILAC = "#F0EFFE"

const L = "240,239,254" // FLAT_LILAC as r,g,b, for the fade
export const TOP_FADE_BACKGROUND = [
  `linear-gradient(180deg, rgba(${L},0) 0px, rgba(${L},0) 150px, ${FLAT_LILAC} 380px)`, // fades the glow out
  "radial-gradient(440px 340px at 0% 0%, #F9E3DC 0%, transparent 100%)", // peach, top left
  "radial-gradient(540px 400px at 100% 30px, #DCD2FF 0%, transparent 100%)", // lavender, top right
  "radial-gradient(380px 220px at 16% 340px, rgba(187,238,232,0.45) 0%, transparent 100%)", // a hint of mint
  FLAT_LILAC,
].join(", ")
