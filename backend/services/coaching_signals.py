"""Code decides WHAT can be said; the AI only words it.

Works out, from the per-rep measurements, which coaching points are allowed for a goblet squat set and on
which reps they apply. The AI is given the result and may not add topics or change the rep lists. After the AI
answers, `apply_signals` enforces it: topics that were not allowed are dropped, rep lists are overwritten with the
real ones, missing allowed points are filled from the short wording in the spec, and over-long wording is replaced.

EVERY number and every line of wording comes from the exercise spec, `exercises/goblet-squat/spec.md` (the
`kinetic-spec` rules block). Change them there, never here. The spec also says why each number is what it is,
how far it has been checked, and whether it is a draft. The golden tests (`tests/golden/`) fail if a result changes.

The rules in short (full table in the spec, section 5):
  - A point is flagged or praised only if it held on MORE THAN HALF the reps considered.
  - One topic goes in one list only; at most 2 items per list (1 if there are too few reps).
  - Lean is judged against the person's own first reps (growth), plus a safety line for a lean that is high from the start.
  - Lean, depth and ankle range need a side camera (depth also an angled one). Knee tracking needs the front camera.
    Lowering speed and pace work from any camera.
  - Depth is never a "work on": it only produces the flags `depth_short` and `depth_very_shallow`, which the app turns
    into a gentle "Try next" card or a "bodyweight first" card.
"""
from statistics import median

from exercises.registry import get_spec

EXERCISE_ID = "goblet-squat"
_SPEC = get_spec(EXERCISE_ID)
_R = _SPEC["rules"]

MIN_REPS = _R["min_reps"]                                  # fewer reps than this: ask for another video
MIN_WITH_DATA = _R["min_reps_with_data"]                   # reps with a usable measurement needed before a rule may fire
SKIP_FIRST_ABOVE = _R["skip_first_rep_when_more_than"]     # the first rep is often a warm-up: skipped above this many reps
MAX_ITEMS = _R["max_items_per_list"]
MAX_ITEMS_FEW_REPS = _R["max_items_when_few_reps"]
MAX_WORDS_LINE = _R["max_words_per_line"]                  # headline, why and cue stay this sharp

LEAN_BASELINE_REPS = _R["lean"]["baseline_reps"]           # "the person's own start" = this many first reps
LEAN_GROWTH_DEG = _R["lean"]["growth_deg"]
LEAN_HIGH_DEG = _R["lean"]["high_deg"]                     # a lean that is high from the start does not grow, so growth alone misses it
LEAN_STEADY_GROWTH_MAX_DEG = _R["lean"]["steady_growth_max_deg"]
LEAN_STEADY_MARGIN_DEG = _R["lean"]["steady_rep_margin_deg"]
LEAN_FLAG_MIN_REPS = _R["lean"]["flag_min_reps"]

QUICK_SECONDS = _R["lowering"]["quick_seconds"]            # a drop, not a lowering (draft: no real clip is this fast)
CONTROLLED_MIN_SECONDS = _R["lowering"]["controlled_min_seconds"]   # praise only a deliberate lowering
CONTROLLED_MAX_SECONDS = _R["lowering"]["controlled_max_seconds"]
PACE_DROP_SECONDS = _R["lowering"]["pace_drop_seconds"]
PACE_LAST_OVER_FIRST_MAX = _R["lowering"]["pace_last_over_first_max"]
QUICK_MIN_REPS = _R["lowering"]["quick_min_reps"]

ANKLE_GOOD_DEG = _R["ankle"]["good_deg"]
ANKLE_LIMITED_DEG = _R["ankle"]["limited_deg"]

# Depth: how low the hips get compared with the knees, as a share of upright torso length (positive = hips lower
# than the knees). Front views are not used: they shift it by about 0.3.
DEPTH_GOOD_RATIO = _R["depth"]["good_ratio"]
DEPTH_VERY_SHALLOW_RATIO = _R["depth"]["very_shallow_ratio"]

KNEE_IN_RATIO = _R["knees"]["inward_ratio"]                # front camera only; draft, one labelled fault clip

WORK_ON_ORDER = list(_R["work_on_order"])                  # safety first, then pace
WENT_WELL_ORDER = list(_R["went_well_order"])

# Short wording. Used as the suggestion to the AI and as the fallback when the AI's wording is missing or too long.
WORDING = {(kind, topic): dict(words) for kind in ("work_on", "went_well") for topic, words in _SPEC["wording"][kind].items()}
LEAN_HIGH_WORDING = WORDING[("work_on", "chest_lean_high")]


def _num(x):
    return x if isinstance(x, (int, float)) else None


def _series(reps, section, key):
    return [_num((r.get(section) or {}).get(key)) for r in reps]


def _med(values):
    v = [x for x in values if x is not None]
    return median(v) if v else None


def _signal(kind, topic, flagged, numbers, wording=None):
    return {"kind": kind, "topic": topic, "reps_flagged": sorted(set(flagged)), "numbers": numbers, "wording": wording or WORDING[(kind, topic)]}


def compute_signals(reps: list) -> dict:
    """reps = the per-rep list from the biomechanics JSON. Returns the allowed coaching points."""
    n = len(reps)
    nums = [r.get("rep_number", i + 1) for i, r in enumerate(reps)]
    # Lean, depth and ankle range are only readable from the side. From the front they are not trustworthy, so
    # those points are simply not offered. Timing (lowering speed, rushing) works from any angle.
    views = [r.get("camera_view") for r in reps if r.get("camera_view")]
    view = max(set(views), key=views.count) if views else None
    side = view in ("side_left", "side_right")
    depth_view_ok = side or view == "angled"
    half = n // 2
    out = []
    numbers_all = {}

    # ---- lean, against the person's own start (never a fixed number)
    lean = _series(reps, "back_data", "back_angle_at_bottom")
    valid_idx = [i for i, v in enumerate(lean) if v is not None]
    if side and n >= MIN_REPS and len(valid_idx) >= MIN_WITH_DATA:
        base = median([lean[i] for i in valid_idx[:LEAN_BASELINE_REPS]])
        later_start = max(half, LEAN_BASELINE_REPS)   # the "later" reps never include the reps that make up the person's own start
        later = _med([lean[i] for i in range(later_start, n)])
        growth = (later - base) if later is not None else None
        numbers_all["lean"] = {"own_start_median": round(base, 1), "later_half_median": None if later is None else round(later, 1), "growth_deg": None if growth is None else round(growth, 1)}
        later_reps = valid_idx[1:] if n > SKIP_FIRST_ABOVE else valid_idx
        high = [i for i in later_reps if lean[i] >= LEAN_HIGH_DEG]
        numbers_all["lean"]["median_after_first"] = round(median([lean[i] for i in later_reps]), 1)
        if len(high) >= LEAN_FLAG_MIN_REPS and len(high) > len(later_reps) / 2:
            numbers_all["lean"]["mode"] = "high"
            out.append(_signal("work_on", "chest_lean", [nums[i] for i in high], numbers_all["lean"], LEAN_HIGH_WORDING))
        elif growth is not None:
            numbers_all["lean"]["mode"] = "growth"
            if growth >= LEAN_GROWTH_DEG:
                flagged = [nums[i] for i in range(later_start, n) if lean[i] is not None and lean[i] >= base + LEAN_GROWTH_DEG]
                if len(flagged) >= LEAN_FLAG_MIN_REPS:
                    out.append(_signal("work_on", "chest_lean", flagged, numbers_all["lean"]))
            elif growth <= LEAN_STEADY_GROWTH_MAX_DEG:
                steady = [nums[i] for i in valid_idx if lean[i] <= base + LEAN_STEADY_MARGIN_DEG]
                out.append(_signal("went_well", "chest_lean", steady, numbers_all["lean"]))

    # ---- knees tracking in (front camera: the only view where it can be seen)
    kr = _series(reps, "stability_data", "knee_ankle_ratio_at_bottom")
    ids = [i for i in range(1 if n > SKIP_FIRST_ABOVE else 0, n) if kr[i] is not None]
    if view == "front" and n >= MIN_REPS and len(ids) >= MIN_WITH_DATA:
        inward = [i for i in ids if kr[i] < KNEE_IN_RATIO]
        numbers_all["knees"] = {"median_knee_to_ankle": round(_med([kr[i] for i in ids]), 2), "inward_reps": len(inward), "considered": len(ids)}
        if len(inward) > len(ids) / 2:
            out.append(_signal("work_on", "knee_tracking", [nums[i] for i in inward], numbers_all["knees"]))

    # ---- lowering speed and whether it rushes over the set
    ecc = _series(reps, "tempo_data", "eccentric")
    ecc_idx = [i for i, v in enumerate(ecc) if v is not None and v > 0]
    if len(ecc_idx) >= 3:
        typical = median([ecc[i] for i in ecc_idx])
        third = max(1, n // 3)
        first = _med(ecc[:third])
        last = _med(ecc[-third:])
        numbers_all["lowering"] = {"typical_s": round(typical, 2), "first_third_s": None if first is None else round(first, 2), "last_third_s": None if last is None else round(last, 2)}
        quick = [nums[i] for i in ecc_idx if ecc[i] < QUICK_SECONDS]
        drifting = (n >= MIN_REPS and typical >= QUICK_SECONDS and first is not None and last is not None
                    and first - last >= PACE_DROP_SECONDS and last <= PACE_LAST_OVER_FIRST_MAX * first)
        if drifting:
            out.append(_signal("work_on", "pace_drift", [nums[i] for i in range(n - third, n)], numbers_all["lowering"]))
        elif len(quick) >= QUICK_MIN_REPS and len(quick) > len(ecc_idx) / 2:
            out.append(_signal("work_on", "lowering_speed", quick, numbers_all["lowering"]))
        elif CONTROLLED_MIN_SECONDS <= typical <= CONTROLLED_MAX_SECONDS:
            ok = [nums[i] for i in ecc_idx if CONTROLLED_MIN_SECONDS <= ecc[i] <= CONTROLLED_MAX_SECONDS]
            if len(ok) > len(ecc_idx) / 2:
                out.append(_signal("went_well", "lowering_speed", ok, numbers_all["lowering"]))

    # ---- depth: praise only. Short and very shallow depth are handed to the app as flags (it decides what to show).
    skip_first = n > SKIP_FIRST_ABOVE
    ratio = _series(reps, "depth_data", "hip_below_knee_ratio")
    labels = [(r.get("depth_data") or {}).get("depth_classification") for r in reps]
    depth_short = False
    depth_very_shallow = False
    ids = [i for i in range(1 if skip_first else 0, n) if ratio[i] is not None]
    if depth_view_ok and n >= MIN_REPS and len(ids) >= MIN_WITH_DATA:
        good = [i for i in ids if ratio[i] >= DEPTH_GOOD_RATIO]
        short = [i for i in ids if ratio[i] < DEPTH_GOOD_RATIO]
        very = [i for i in ids if ratio[i] < DEPTH_VERY_SHALLOW_RATIO]
        numbers_all["depth"] = {"median_ratio": round(_med([ratio[i] for i in ids]), 2), "good_reps": len(good), "short_reps": len(short), "very_shallow_reps": len(very), "considered": len(ids)}
        if len(good) > len(ids) / 2:
            out.append(_signal("went_well", "depth", [nums[i] for i in good], numbers_all["depth"]))
        depth_short = len(short) > len(ids) / 2
        depth_very_shallow = len(very) > len(ids) / 2

    # ---- ankle range (side camera measures it on every rep)
    df = _series(reps, "ankle_data", "dorsiflexion_at_bottom")
    ids = [i for i in range(1 if skip_first else 0, n) if df[i] is not None]
    if side and n >= MIN_REPS and len(ids) >= MIN_WITH_DATA:
        good = [i for i in ids if df[i] >= ANKLE_GOOD_DEG]
        limited = [i for i in ids if df[i] < ANKLE_LIMITED_DEG]
        numbers_all["ankle"] = {"median_deg": round(_med([df[i] for i in ids]), 1), "good_reps": len(good), "limited_reps": len(limited), "considered": len(ids)}
        if len(limited) > len(ids) / 2:
            out.append(_signal("work_on", "ankle_mobility", [nums[i] for i in limited], numbers_all["ankle"]))
        elif len(good) > len(ids) / 2:
            out.append(_signal("went_well", "ankle_mobility", [nums[i] for i in good], numbers_all["ankle"]))

    return {"rep_count": n, "enough_reps": n >= MIN_REPS, "camera_view": view, "depth_short": depth_short, "depth_very_shallow": depth_very_shallow, "signals": out, "numbers": numbers_all}


def signals_for_ai(sig: dict) -> dict:
    """The compact version the AI sees. It may use only these points, with these rep lists."""
    return {
        "rep_count": sig["rep_count"],
        "enough_reps": sig["enough_reps"],
        "allowed": [
            {"kind": s["kind"], "topic": s["topic"], "reps_flagged": s["reps_flagged"], "evidence": s["numbers"], "suggested_wording": s["wording"]}
            for s in sig["signals"]
        ],
        "note": "Only the points in 'allowed' may appear. Copy reps_flagged exactly. Anything not listed was checked and is not to be mentioned.",
    }


def _words(text):
    return len(str(text or "").split())


def _sharp(item, wording, fields):
    for f in fields:
        if f not in wording:
            continue
        if not item.get(f) or _words(item.get(f)) > MAX_WORDS_LINE:
            item[f] = wording[f]


def apply_signals(coaching_output: dict, sig: dict) -> dict:
    """Make the AI's feedback_items obey the code: allowed topics only, real rep lists, sharp wording, caps."""
    allowed = {(s["kind"], s["topic"]): s for s in sig["signals"]}
    items = coaching_output.get("feedback_items") or {}
    keep = {"went_well": {}, "work_on": {}}
    for kind in ("went_well", "work_on"):
        for it in items.get(kind) or []:
            s = allowed.get((kind, it.get("topic")))
            if not s or it.get("topic") in keep[kind]:
                continue
            it["reps_flagged"] = s["reps_flagged"]
            it.pop("reps_with", None)
            keep[kind][it["topic"]] = it
    # anything allowed that the AI left out is added from the short wording
    for (kind, topic), s in allowed.items():
        if topic not in keep[kind]:
            keep[kind][topic] = {"topic": topic, "reps_flagged": s["reps_flagged"], **s["wording"]}
    for kind in keep:
        for topic, it in keep[kind].items():
            _sharp(it, allowed[(kind, topic)]["wording"], ("headline", "why", "cue") if kind == "work_on" else ("headline",))
            if kind == "went_well":
                it.setdefault("detail", "")

    cap = MAX_ITEMS if sig["enough_reps"] else MAX_ITEMS_FEW_REPS
    order_w = [t for t in WENT_WELL_ORDER if t in keep["went_well"]]
    order_k = [t for t in WORK_ON_ORDER if t in keep["work_on"]]
    coaching_output["feedback_items"] = {
        "went_well": [keep["went_well"][t] for t in order_w][:cap],
        "work_on": [keep["work_on"][t] for t in order_k][:cap],
    }
    coaching_output["signals"] = {"camera_view": sig.get("camera_view"), "depth_short": sig["depth_short"], "depth_very_shallow": sig.get("depth_very_shallow", False), "numbers": sig["numbers"], "allowed": [f"{s['kind']}:{s['topic']}" for s in sig["signals"]]}
    return coaching_output
