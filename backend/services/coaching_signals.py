"""Code decides WHAT can be said; the AI only words it.

Works out, from the per-rep measurements, which coaching points are allowed for a goblet squat set and on
which reps they apply. The AI is given the result and may not add topics or change the rep lists. After the AI
answers, `apply_signals` enforces it: topics that were not allowed are dropped, rep lists are overwritten with the
real ones, missing allowed points are filled from the short wording below, and over-long wording is replaced.

Draft numbers (kept at the top so they are easy to change after a trainer looks at real samples):
  - Lean grows:      the lean at the bottom is 5 degrees or more above the person's own first 3 reps.
  - Lowering quick:  under 0.6 seconds on most reps (a drop). Controlled: 1.5 to 4.5 seconds.
  - Ankle range:     good at 30 degrees or more (side camera), limited under 25.
  - Depth:           hip height against knee height (see DEPTH_* below). The first rep is skipped (often a warm-up).
Lean, depth and ankle range are only used for side-camera videos. Knee drift and side-to-side shift are not here on purpose.
"""
from statistics import median

MIN_REPS = 6
LEAN_GROWTH_DEG = 5.0
# A lean that is high from the start does not grow, so growth alone misses it. Draft safety line, from the labelled clips:
# median lean on reps 2+ is 29-31 for the good torso clip and Amrita's side clips, 38 for v2, 41-48 for user_002, 46 for v1, 50 for the torso-fault clip.
LEAN_HIGH_DEG = 45.0
QUICK_SECONDS = 0.6      # a drop, not a lowering. Across 17 test videos nearly everyone lowers in 0.7 to 1.3 s; only 6 very fast clips are under this
CONTROLLED_MIN_SECONDS = 1.5   # praise only a deliberate lowering
CONTROLLED_MAX_SECONDS = 4.5
PACE_DROP_SECONDS = 0.3
ANKLE_GOOD_DEG = 30.0
# Depth: how low the hips get compared with the knees, as a share of upright torso length (positive = hips lower than
# the knees). Measured on 17 test videos: good-depth sets sit at +0.1 to +0.2, the clip a person marked "depth good" at -0.04,
# the clip marked "depth fault" at -0.26, and the very shallow user at -0.28. Front views are not used: they shift it by about 0.3.
DEPTH_GOOD_RATIO = -0.08
DEPTH_VERY_SHALLOW_RATIO = -0.20
ANKLE_LIMITED_DEG = 25.0
# Knees in (front camera only): knee gap divided by ankle gap at the bottom. Knees normally travel out as you sit.
# Draft: through the app's own pipeline the labelled knee-fault clip reads 1.06-1.15, the labelled good one 1.17-1.26, user_002 front 1.02-1.08, user_003 1.5+.
# The gap between the fault and good clips is small, so treat the cut-off as a first guess.
# It depends on stance width, so it needs labelled front videos before it is trusted.
KNEE_IN_RATIO = 1.15
MAX_WORDS_LINE = 12      # headline, why and cue stay this sharp

# Short wording. Used as the suggestion to the AI and as the fallback when the AI's wording is missing or too long.
WORDING = {
    ("work_on", "chest_lean"): {
        "headline": "You leaned further forward as the set went on.",
        "why": "More forward lean loads your lower back.",
        "cue": "Sit your hips back as you lower.",
    },
    ("work_on", "ankle_mobility"): {
        "headline": "Your ankle mobility looked limited.",
        "why": "Limited ankle range pushes the knees in or the body forward.",
        "cue": "Keep your whole foot on the floor.",
    },
    ("work_on", "knee_tracking"): {
        "headline": "Your knees drifted inward as you lowered.",
        "why": "Knees caving in loads the inside of the knee.",
        "cue": "Push your knees out over your little toes.",
    },
    ("work_on", "pace_drift"): {
        "headline": "You rushed more as the set went on.",
        "why": "Rushing costs you control at the bottom.",
        "cue": "Count to two on every lowering.",
    },
    ("work_on", "lowering_speed"): {
        "headline": "You dropped into the squat on most reps.",
        "why": "Dropping fast means less control at the bottom.",
        "cue": "Lower for about two seconds.",
    },
    ("went_well", "depth"): {"headline": "Your depth was consistent."},
    ("went_well", "ankle_mobility"): {"headline": "Your ankle mobility was good."},
    ("went_well", "lowering_speed"): {"headline": "You lowered with control."},
    ("went_well", "chest_lean"): {"headline": "Your torso position stayed steady."},
}
WORK_ON_ORDER = ["chest_lean", "knee_tracking", "ankle_mobility", "pace_drift", "lowering_speed"]  # safety, then pace
WENT_WELL_ORDER = ["depth", "ankle_mobility", "lowering_speed", "chest_lean"]


def _num(x):
    return x if isinstance(x, (int, float)) else None


def _series(reps, section, key):
    return [_num((r.get(section) or {}).get(key)) for r in reps]


def _med(values):
    v = [x for x in values if x is not None]
    return median(v) if v else None


LEAN_HIGH_WORDING = {
    "headline": "You leaned well forward on most reps.",
    "why": "More forward lean loads your lower back.",
    "cue": "Sit your hips back as you lower.",
}


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
    if side and n >= MIN_REPS and len(valid_idx) >= 4:
        base = median([lean[i] for i in valid_idx[:3]])
        later = _med([lean[i] for i in range(half, n)])
        growth = (later - base) if later is not None else None
        numbers_all["lean"] = {"own_start_median": round(base, 1), "later_half_median": None if later is None else round(later, 1), "growth_deg": None if growth is None else round(growth, 1)}
        later_reps = valid_idx[1:] if n > 5 else valid_idx
        high = [i for i in later_reps if lean[i] >= LEAN_HIGH_DEG]
        numbers_all["lean"]["median_after_first"] = round(median([lean[i] for i in later_reps]), 1)
        if len(high) >= 2 and len(high) > len(later_reps) / 2:
            numbers_all["lean"]["mode"] = "high"
            out.append(_signal("work_on", "chest_lean", [nums[i] for i in high], numbers_all["lean"], LEAN_HIGH_WORDING))
        elif growth is not None:
            numbers_all["lean"]["mode"] = "growth"
            if growth >= LEAN_GROWTH_DEG:
                flagged = [nums[i] for i in range(half, n) if lean[i] is not None and lean[i] >= base + LEAN_GROWTH_DEG]
                if len(flagged) >= 2:
                    out.append(_signal("work_on", "chest_lean", flagged, numbers_all["lean"]))
            elif growth <= 2.0:
                steady = [nums[i] for i in valid_idx if lean[i] <= base + 4.0]
                out.append(_signal("went_well", "chest_lean", steady, numbers_all["lean"]))

    # ---- knees tracking in (front camera: the only view where it can be seen)
    kr = _series(reps, "stability_data", "knee_ankle_ratio_at_bottom")
    ids = [i for i in range(1 if n > 5 else 0, n) if kr[i] is not None]
    if view == "front" and n >= MIN_REPS and len(ids) >= 4:
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
                    and first - last >= PACE_DROP_SECONDS and last <= 0.75 * first)
        if drifting:
            out.append(_signal("work_on", "pace_drift", [nums[i] for i in range(n - third, n)], numbers_all["lowering"]))
        elif len(quick) >= 2 and len(quick) > len(ecc_idx) / 2:
            out.append(_signal("work_on", "lowering_speed", quick, numbers_all["lowering"]))
        elif CONTROLLED_MIN_SECONDS <= typical <= CONTROLLED_MAX_SECONDS:
            ok = [nums[i] for i in ecc_idx if CONTROLLED_MIN_SECONDS <= ecc[i] <= CONTROLLED_MAX_SECONDS]
            if len(ok) > len(ecc_idx) / 2:
                out.append(_signal("went_well", "lowering_speed", ok, numbers_all["lowering"]))

    # ---- depth: praise only. Short and very shallow depth are handed to the app as flags (it decides what to show).
    skip_first = n > 5
    ratio = _series(reps, "depth_data", "hip_below_knee_ratio")
    labels = [(r.get("depth_data") or {}).get("depth_classification") for r in reps]
    depth_short = False
    depth_very_shallow = False
    ids = [i for i in range(1 if skip_first else 0, n) if ratio[i] is not None]
    if depth_view_ok and n >= MIN_REPS and len(ids) >= 4:
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
    if side and n >= MIN_REPS and len(ids) >= 4:
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

    cap = 2 if sig["enough_reps"] else 1
    order_w = [t for t in WENT_WELL_ORDER if t in keep["went_well"]]
    order_k = [t for t in WORK_ON_ORDER if t in keep["work_on"]]
    coaching_output["feedback_items"] = {
        "went_well": [keep["went_well"][t] for t in order_w][:cap],
        "work_on": [keep["work_on"][t] for t in order_k][:cap],
    }
    coaching_output["signals"] = {"camera_view": sig.get("camera_view"), "depth_short": sig["depth_short"], "depth_very_shallow": sig.get("depth_very_shallow", False), "numbers": sig["numbers"], "allowed": [f"{s['kind']}:{s['topic']}" for s in sig["signals"]]}
    return coaching_output
