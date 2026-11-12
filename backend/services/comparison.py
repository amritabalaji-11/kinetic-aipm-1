"""Which two reps to show side by side, and where to point. Decided by code, from the same facts as the written feedback.

The app plays the user's own video twice, each copy jumping to one of the reps chosen here. So all this module has to say
is: which issue, which two reps, when each rep starts and ends in the video, and where the arrow goes at the bottom.

Rules (the focus issue is the first item under "Work on"; or depth when it is flagged short or very shallow):
  chest_lean      before = a typical early rep (closest to the person's own first reps)   after = the rep with the most lean
  pace_drift      before = a typical early rep                                            after = the rep lowered fastest
  lowering_speed  left = a typical rep at its real speed        right = the same rep with the lowering slowed to 2 seconds
  ankle_mobility  left = the best rep (most ankle range)        right = a typical rep   (one picture if there is no real difference)
  depth           left = the deepest rep                        right = a typical rep   (one picture if there is no real difference)
  knee_tracking   left = the rep where the knees move least     right = the rep where they move most (front); only if clearly different, else one typical rep
  nothing to fix  no comparison: the app just plays the original video.
Only reps that count (not partial) are used. Times are in seconds on the video's own timeline.
"""
from statistics import median

from exercises.registry import get_spec

# All numbers and labels come from the exercise spec (exercises/goblet-squat/spec.md, section 1 and section 7).
EXERCISE_ID = "goblet-squat"
_C = get_spec(EXERCISE_ID)["comparison"]

FPS = 30.0                                       # the pipeline converts every upload to 30 fps before analysing, so frame_index / 30 is seconds
MIN_REPS = _C["min_reps"]                        # fewer counted reps than this: no comparison
PAD_S = _C["pad_seconds"]                        # a little before the rep starts and after it ends
ARROW_WINDOW_S = _C["arrow_window_seconds"]      # the arrow shows this long either side of the bottom (the app caps it shorter; it shows through the freeze)
SLOW_TARGET_S = _C["slow_target_seconds"]        # the "how to correct" lowering time
MIN_ANKLE_DIFF = _C["min_ankle_diff_deg"]        # degrees of ankle range between best and typical rep for a pair to be worth showing
MIN_DEPTH_DIFF = _C["min_depth_diff_ratio"]      # hip-below-knee ratio between deepest and typical rep
# The shakiest rep must move the knees at least this many times as much as the steadiest, or there is nothing to show as a pair.
# Rep-to-rep differences in the knee gap itself are a few pixels, less than the pose model's error on a front view
# (9 px ranked two reps the wrong way round on the labelled knee-fault clip), so the gap is never used to rank reps.
MIN_KNEE_TRAVEL_RATIO = _C["min_knee_travel_ratio"]

ARROW_LABELS = dict(_C["arrow_labels"])


def _num(v):
    return v if isinstance(v, (int, float)) else None


def _get(rep, section, key):
    return _num((rep.get(section) or {}).get(key))


def _closest(reps, getter, target):
    cand = [r for r in reps if getter(r) is not None]
    return min(cand, key=lambda r: abs(getter(r) - target)) if cand else None


def _times(rep_number, frames):
    """Start, bottom and end of a rep, from the frames the analysis kept for it (they are only the frames while it was under way)."""
    mine = [f for f in frames if f.get("rep_number") == rep_number]
    if not mine:
        return None
    lo = min(f["frame_index"] for f in mine) / FPS
    hi = max(f["frame_index"] for f in mine) / FPS
    bottom_frame = min(mine, key=lambda f: f["knee_angle"] if f.get("knee_angle") is not None else float("inf"))
    return {"start_s": round(max(0.0, lo - PAD_S), 2), "end_s": round(hi + PAD_S, 2), "bottom_s": round(bottom_frame["frame_index"] / FPS, 2), "pose": bottom_frame.get("norm_pose")}


def _point(pose, idx):
    try:
        lm = pose[idx]
        return (float(lm.x), float(lm.y)) if lm is not None else None
    except Exception:
        return None


def _arrow(pose, topic, camera_view):
    """Where the arrow points, as 0 to 1 positions in the picture, and which side the person's back is on."""
    if topic not in ARROW_LABELS or pose is None:
        return None
    if topic == "knee_tracking":
        if camera_view != "front":
            return None
        k1, k2 = _point(pose, 25), _point(pose, 26)
        if not (k1 and k2):
            return None
        left_knee = k1 if k1[0] < k2[0] else k2      # the knee on the left of the picture; the arrow comes in from outside it
        return {"x": round(left_knee[0] - 0.02, 3), "y": round(left_knee[1], 3), "back": -1.0}
    if camera_view not in ("side_left", "side_right"):
        return None
    right = camera_view == "side_right"
    sh, hip = _point(pose, 12 if right else 11), _point(pose, 24 if right else 23)
    knee, ankle, nose = _point(pose, 26 if right else 25), _point(pose, 28 if right else 27), _point(pose, 0)
    if not (sh and hip and knee and ankle and nose):
        return None
    back = -1.0 if nose[0] > hip[0] else 1.0
    if topic == "chest_lean":
        tip = ((sh[0] + hip[0]) / 2 + back * 0.07, (sh[1] + hip[1]) / 2)
    elif topic == "ankle_mobility":
        tip = (ankle[0] + (knee[0] - ankle[0]) * 0.35 + back * 0.05, ankle[1] + (knee[1] - ankle[1]) * 0.35)
    else:
        tip = (hip[0] + back * 0.06, hip[1])
    return {"x": round(tip[0], 3), "y": round(tip[1], 3), "back": back}


def choose_comparison(coaching_output, final_json, rep_frames):
    """Returns the comparison to store with the analysis, or None when there is nothing to compare."""
    reps = [r for r in (final_json or {}).get("reps", []) if not r.get("partial")]
    if len(reps) < MIN_REPS:
        return None
    items = (coaching_output or {}).get("feedback_items") or {}
    work = items.get("work_on") or []
    sig = (coaching_output or {}).get("signals") or {}
    topic = work[0].get("topic") if work else ("depth" if (sig.get("depth_short") or sig.get("depth_very_shallow")) else None)
    if topic is None:
        return None
    flagged = {int(n) for n in (work[0].get("reps_flagged") or [])} if work else set()
    n = len(reps)
    camera_view = reps[0].get("camera_view")
    early = reps[1:4] if n > 5 else reps[:3]               # the first rep is often a warm-up

    lean = lambda r: _get(r, "back_data", "back_angle_at_bottom")
    low = lambda r: _get(r, "tempo_data", "eccentric")
    ank = lambda r: _get(r, "ankle_data", "dorsiflexion_at_bottom")
    dep = lambda r: _get(r, "depth_data", "hip_below_knee_ratio")
    pool = [r for r in reps if not flagged or r.get("rep_number") in flagged] or reps

    left = right = None
    mode, label_left, label_right = "pair", "How it was", "How it is now"
    if topic == "chest_lean" and ((sig.get("numbers") or {}).get("lean") or {}).get("mode") == "high":
        # the lean is high from the start, so there is no "before": show the least-leaned rep next to the most-leaned one
        label_left, label_right = "Your best rep", "Leaning furthest"
        after_first = [r for r in reps[1:] if lean(r) is not None]
        left = min(after_first, key=lean, default=None)
        right = max(after_first, key=lean, default=None)
    elif topic == "chest_lean":
        vals = [lean(r) for r in early if lean(r) is not None]
        left = _closest(early, lean, median(vals)) if vals else None
        right = max((r for r in pool if lean(r) is not None), key=lean, default=None)
    elif topic == "pace_drift":
        third = max(1, n // 3)
        vals = [low(r) for r in reps[:third] if low(r)]
        left = _closest(reps[:third], low, median(vals)) if vals else None
        right = min((r for r in reps[-third:] if low(r)), key=low, default=None)
    elif topic == "lowering_speed":
        mode, label_left, label_right = "slow", "Your pace", "A 2-second lowering"
        vals = [low(r) for r in pool if low(r)]
        left = right = _closest(pool, low, median(vals)) if vals else None
    elif topic == "ankle_mobility":
        label_left, label_right = "Your best rep", "A typical rep"
        left = max((r for r in reps if ank(r) is not None), key=ank, default=None)
        vals = [ank(r) for r in reps if ank(r) is not None]
        right = _closest(reps, ank, median(vals)) if vals else None
        if left and right and ank(left) - ank(right) < MIN_ANKLE_DIFF:
            right = None
    elif topic == "knee_tracking":
        label_left, label_right = "Your best rep", "Knees drifting in"
        kn = lambda r: _get(r, "stability_data", "knee_ankle_ratio_at_bottom")
        tr = lambda r: _get(r, "stability_data", "knee_travel")
        # within one set, the rep where the knees move most looks shakiest. Which rep is steadiest is decided by that, not by the gap at the bottom
        # (the gap differs by only a few pixels between reps, less than the pose model's error on a front view).
        moving = [r for r in reps[1:] if tr(r) is not None] or [r for r in reps if tr(r) is not None]
        left = min(moving, key=tr, default=None)
        right = max(moving, key=tr, default=None)
        label_left, label_right = "Your steadiest rep", "Knees moving most"
        if not (left and right and tr(left) > 0 and tr(right) / tr(left) >= MIN_KNEE_TRAVEL_RATIO):
            # every rep looks alike, so there is no steadier rep to compare with: show one typical rep with the arrow
            vals = [kn(r) for r in pool if kn(r) is not None]
            left = _closest(pool, kn, median(vals)) if vals else None
            right = None
    elif topic == "depth":
        label_left, label_right = "Your deepest rep", "A typical rep"
        left = max((r for r in reps if dep(r) is not None), key=dep, default=None)
        vals = [dep(r) for r in reps if dep(r) is not None]
        right = _closest(reps, dep, median(vals)) if vals else None
        if left and right and dep(left) - dep(right) < MIN_DEPTH_DIFF:
            right = None
    else:
        return None

    if left is None:
        return None
    if right is None or (mode == "pair" and right["rep_number"] == left["rep_number"]):
        mode, right = "single", None
        label_left = "Your set"

    tl = _times(left["rep_number"], rep_frames)
    if tl is None:
        return None
    out = {"topic": topic, "mode": mode, "label_left": label_left, "label_right": label_right, "arrow_label": ARROW_LABELS.get(topic)}

    def panel(t, rep):
        return {"rep": rep["rep_number"], "start_s": t["start_s"], "end_s": t["end_s"], "bottom_s": t["bottom_s"], "arrow": _arrow(t["pose"], topic, camera_view)}

    out["left"] = panel(tl, left)
    if mode in ("pair", "slow"):
        tr = tl if mode == "slow" else _times(right["rep_number"], rep_frames)
        if tr is None:
            out["mode"] = "single"
        else:
            out["right"] = panel(tr, left if mode == "slow" else right)
            if mode == "slow":
                real = low(left) or 0.8
                out["slow"] = {"lowering_s": round(real, 2), "target_s": SLOW_TARGET_S}
    out["arrow_window_s"] = ARROW_WINDOW_S
    return out
