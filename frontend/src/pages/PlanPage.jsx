import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { PRESET_CATEGORIES, PRESET_WORKOUTS } from "../data/presetWorkouts"
import { getMyWorkouts } from "../utils/myWorkouts"
import { listWorkouts } from "../services/workoutService"
import { TOP_FADE_BACKGROUND } from "../utils/pageBackground"
import { lastDoneText, matchesQuery, planProfile, suggestions, trainingHistory, workoutType } from "../utils/planProfile"
import { FilterSheet, HeroCard, PlanCard, PreviewSheet, Shelf } from "../components/PlanDiscovery"
import { TypeFilter } from "../components/WorkoutTypeUi"

const GRADIENT = "linear-gradient(92.52deg, #0284C7 0%, #9747FF 100%)"
const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const DM_SANS = "'DM Sans', sans-serif"
const LINK_PURPLE = "#6A1FD6" // a little darker than the brand purple so text links stay readable on the gradient

// "Cardio & sweat" isn't a body area, so it is added to the chips from the data file
const FOCUS = [...PRESET_CATEGORIES, { id: "cardio", label: "Cardio & sweat", icon: null }]
const EQUIP_RANK = { none: 0, light: 1, gym: 2 } // "dumbbells" also includes plans that need nothing

function CategoryChip({ category, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
        padding: category.icon ? "6px 18px 6px 8px" : "9px 18px",
        borderRadius: 32, cursor: "pointer", fontFamily: DM_SANS, fontSize: 14,
        fontWeight: active ? 600 : 400,
        color: active ? "#FFFFFF" : "#0F172A",
        background: active ? GRADIENT : "rgba(255,255,255,0.78)",
        border: active ? "1px solid transparent" : "1px solid rgba(129,51,255,0.28)",
      }}
    >
      {category.icon && (
        <span style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={category.icon} alt="" style={{ maxWidth: 26, maxHeight: 26, objectFit: "contain" }} />
        </span>
      )}
      {category.label}
    </button>
  )
}

const NO_FILTERS = { time: null, goal: null, equip: null }

export default function PlanPage() {
  const navigate = useNavigate()
  // The screen always opens on the full view: the suggestion, then every workout. Nothing is remembered between visits.
  const [type, setType] = useState(null) // "strength" | "endurance" | "cardio" | null
  const [chip, setChip] = useState("all")
  const [filters, setFilters] = useState(NO_FILTERS)
  const [query, setQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [workouts, setWorkouts] = useState(null) // null while loading

  useEffect(() => {
    let cancelled = false
    listWorkouts().then((w) => !cancelled && setWorkouts(w)).catch(() => !cancelled && setWorkouts([]))
    return () => { cancelled = true }
  }, [])

  const history = useMemo(() => trainingHistory(workouts || []), [workouts])
  // The suggestion follows the type picked: asking for Cardio suggests a cardio workout
  const ideas = useMemo(() => suggestions(PRESET_WORKOUTS.filter((p) => !type || workoutType(p) === type), history, { includeCardio: type === "cardio" }), [history, type])
  const hero = ideas.length ? ideas[heroIndex % ideas.length] : null
  const lastDoneOf = (plan) => lastDoneText(history, plan)

  const activeCount = Object.values(filters).filter(Boolean).length
  const searching = query.trim().length > 0
  const browsing = chip === "all" && activeCount === 0 && !searching && !type

  const inChip = (plan) => {
    if (chip === "all") return true
    if (chip === "cardio") return ["cardio", "sweat"].includes(planProfile(plan).goal)
    return plan.category === chip
  }
  const passesFilters = (plan) => {
    const p = planProfile(plan)
    if (filters.time && p.time !== filters.time) return false
    if (filters.goal && p.goal !== filters.goal) return false
    if (filters.equip && EQUIP_RANK[p.equipment] > EQUIP_RANK[filters.equip]) return false
    return true
  }
  const inType = (plan) => !type || workoutType(plan) === type
  const visible = PRESET_WORKOUTS.filter((p) => inType(p) && inChip(p) && passesFilters(p) && matchesQuery(p, query))
  // how many would show if the filter sheet closed now (it only changes filters, not the chip or search)

  const myWorkouts = getMyWorkouts()
  const createOwn = () => navigate("/plan/custom")
  const start = (plan) => navigate(`/plan/workout/${plan.id}`)
  const clearAll = () => { setType(null); setChip("all"); setFilters(NO_FILTERS); setQuery("") }

  const byCategory = (cat) => PRESET_WORKOUTS.filter((p) => p.category === cat)
  const quick = PRESET_WORKOUTS.filter((p) => planProfile(p).time === "quick").sort((a, b) => a.minutes - b.minutes)
  const cardio = PRESET_WORKOUTS.filter((p) => ["cardio", "sweat"].includes(planProfile(p).goal))

  return (
    <div style={{ minHeight: "100vh", background: TOP_FADE_BACKGROUND, colorScheme: "light", padding: "24px 24px 140px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, fontFamily: BRICOLAGE, color: "#0F172A", margin: "0 0 6px 0" }}>
        Today, I’m in the mood for…
      </h1>

      {/* search + filters */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRadius: 24, border: "1.5px solid #E6E3F8", background: "#fff" }}>
          <Search size={16} color="#64748B" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workouts or exercises"
            style={{ flex: 1, minWidth: 0, padding: "11px 0", border: "none", outline: "none", background: "transparent", fontFamily: DM_SANS, fontSize: 14 }}
          />
          {searching && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
              <X size={16} color="#64748B" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          style={{
            position: "relative", flexShrink: 0, width: 44, height: 44, borderRadius: 22, cursor: "pointer",
            border: activeCount ? "1.5px solid #8133FF" : "1.5px solid #E6E3F8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Filters"
        >
          <SlidersHorizontal size={18} color={activeCount ? "#8133FF" : "#64748B"} />
          {activeCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: GRADIENT, color: "#fff", fontFamily: DM_SANS, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* one suggestion, based on how long since each muscle group was trained */}
      {!searching && workouts !== null && hero && (
        <div style={{ marginTop: 16 }}>
          <HeroCard
            suggestion={hero}
            canCycle={ideas.length > 1}
            onStart={() => start(hero.plan)}
            onDetails={() => setPreview(hero.plan)}
            onNext={() => setHeroIndex((i) => i + 1)}
          />
        </div>
      )}

      {myWorkouts.length > 0 && browsing && (
        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 600, fontFamily: DM_SANS, color: "#64748B", margin: "0 0 8px" }}>MY WORKOUTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myWorkouts.map((w) => (
              <button key={w.id} type="button" onClick={() => navigate("/plan/custom", { state: { saved: w } })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(129,51,255,0.3)", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                <span>
                  <span style={{ display: "block", fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 16, color: "#0F172A" }}>{w.name}</span>
                  <span style={{ display: "block", fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>{w.items.length} exercises</span>
                </span>
                <ChevronRight size={18} color="#8133FF" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* type of workout: the first filter */}
      <p style={{ fontSize: 11, fontWeight: 600, fontFamily: DM_SANS, color: "#64748B", margin: "18px 0 8px" }}>TYPE OF WORKOUT</p>
      <TypeFilter value={type} onChange={setType} />

      {/* body area chips */}
      <p style={{ fontSize: 11, fontWeight: 600, fontFamily: DM_SANS, color: "#64748B", margin: "18px 0 8px" }}>BODY AREA</p>
      <div style={{ display: "flex", gap: 8, margin: "0 -24px 4px 0", paddingRight: 24, overflowX: "auto", scrollbarWidth: "none" }}>
        {FOCUS.map((c) => (
          <CategoryChip key={c.id} category={c} active={chip === c.id} onClick={() => setChip(c.id)} />
        ))}
      </div>

      {browsing ? (
        <>
          <Shelf title="Quick" subtitle="up to 40 min" plans={quick} onOpen={setPreview} lastDoneOf={lastDoneOf} onSeeAll={() => setFilters({ ...NO_FILTERS, time: "quick" })} />
          <Shelf title="Leg Day" plans={byCategory("legs")} onOpen={setPreview} lastDoneOf={lastDoneOf} onSeeAll={() => setChip("legs")} />
          <Shelf title="Upper Body" plans={byCategory("upper")} onOpen={setPreview} lastDoneOf={lastDoneOf} onSeeAll={() => setChip("upper")} />
          <Shelf title="Full Body" plans={byCategory("full")} onOpen={setPreview} lastDoneOf={lastDoneOf} onSeeAll={() => setChip("full")} />
          <Shelf title="Cardio & sweat" plans={cardio} onOpen={setPreview} lastDoneOf={lastDoneOf} onSeeAll={() => setChip("cardio")} />
        </>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: DM_SANS, fontSize: 12, fontWeight: 600, color: "#64748B" }}>
              {visible.length} WORKOUT{visible.length === 1 ? "" : "S"}
            </span>
            <button type="button" onClick={clearAll} style={{ padding: 0, background: "none", border: "none", color: LINK_PURPLE, fontFamily: DM_SANS, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Clear all
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map((p) => (
              <PlanCard key={p.id} plan={p} onOpen={() => setPreview(p)} lastDone={lastDoneOf(p)} />
            ))}
            {visible.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.6)", fontFamily: DM_SANS, fontSize: 14, color: "#454850", lineHeight: 1.45 }}>
                Nothing matches that. Try fewer filters or a different word, like a muscle or an exercise name.
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={createOwn}
        style={{
          width: "100%", marginTop: 22, display: "flex", alignItems: "center", gap: 12, padding: 14, textAlign: "left", cursor: "pointer",
          borderRadius: 12, background: "rgba(255,255,255,0.5)", border: "1.5px dashed rgba(129,51,255,0.55)",
        }}
      >
        <span style={{ width: 32, height: 32, borderRadius: 16, border: "1.5px solid rgba(129,51,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Plus size={18} color="#8133FF" />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: DM_SANS, fontWeight: 600, fontSize: 15, color: "#0F172A" }}>Create your own</span>
          <span style={{ fontFamily: DM_SANS, fontSize: 12, color: "#64748B" }}>Pick muscles and exercises yourself</span>
        </span>
      </button>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(NO_FILTERS)}
          resultCount={visible.length}
          onClose={() => setFilterOpen(false)}
        />
      )}
      {preview && (
        <PreviewSheet plan={preview} lastDone={lastDoneOf(preview)} onStart={() => start(preview)} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}
