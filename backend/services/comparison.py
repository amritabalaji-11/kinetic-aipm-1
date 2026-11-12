"""Which two reps to show side by side, and where to point. Decided by code, from the same facts as the written feedback.

The app plays the user's own video twice, each copy jumping to one of the reps chosen here. So all this module has to say
is: which issue, which two reps, when each rep starts and ends in the video, and where the arrow goes at the bottom.

It knows nothing about any one exercise. The focus is the first item under "Work on" (or, with none, the first flag that fired and has a
comparison), and that rule's `comparison` block in the exercise spec says what to show: the mode (pair, slow or single), how to pick
the left and right rep, the labels, the arrow, and when a pair is not worth showing. See `exercises/SCHEMA.md` and section 8 of the spec.
"""
from exercises.registry import get_spec
from services.rep_picking import Reps, anchor_point, focus_rule

FPS = 30.0   # the pipeline converts every upload to 30 fps before analysing, so frame_index / 30 is seconds on the video's own timeline
DEFAULT_EXERCISE_ID = "goblet-squat"


def _times(rep_number, frames, vis):
    """Start, bottom and end of a rep, from the frames the analysis kept for it (they are only the frames while it was under way)."""
    mine = [f for f in frames if f.get("rep_number") == rep_number]
    if not mine:
        return None
    field, pick = vis["key_moment"]["frame_field"], vis["key_moment"]["pick"]
    bad = float("inf") if pick == "min" else float("-inf")
    key = lambda f: f[field] if f.get(field) is not None else bad
    moment = min(mine, key=key) if pick == "min" else max(mine, key=key)
    lo = min(f["frame_index"] for f in mine) / FPS
    hi = max(f["frame_index"] for f in mine) / FPS
    pad = vis["pad_seconds"]
    return {"start_s": round(max(0.0, lo - pad), 2), "end_s": round(hi + pad, 2), "bottom_s": round(moment["frame_index"] / FPS, 2), "pose": moment.get("norm_pose")}


def _passes_pair_if(cmp_, pair, left, right):
    """Does the left/right pair clear the bar the rule sets for being worth showing as a pair?"""
    cond = cmp_.get("pair_if")
    if not cond:
        return True
    lv, rv = pair.value(left, cond["measure"]), pair.value(right, cond["measure"])
    if lv is None or rv is None:
        return False
    if "gap_at_least" in cond:
        return lv - rv >= cond["gap_at_least"]
    return lv > 0 and rv / lv >= cond["ratio_at_least"]


def choose_comparison(coaching_output, final_json, rep_frames, exercise_id=DEFAULT_EXERCISE_ID, goal=None):
    """Returns the comparison to store with the analysis, or None when there is nothing to compare."""
    spec = get_spec(exercise_id, goal)
    vis = spec["visuals"]
    reps = [r for r in (final_json or {}).get("reps", []) if not r.get("partial")]
    if len(reps) < vis["min_reps"]:
        return None
    rule, flagged = focus_rule(coaching_output, spec)
    if rule is None:
        return None
    cmp_ = rule["comparison"]
    camera_view = reps[0].get("camera_view")
    pick = Reps(reps, spec, flagged)

    mode = cmp_["mode"]
    labels = cmp_.get("labels") or []
    left = pick.pick(cmp_["left"])
    if left is None:
        return None
    right = None
    if mode == "pair":
        right = pick.pick(cmp_["right"])
        if right is None or right["rep_number"] == left["rep_number"] or not _passes_pair_if(cmp_, pick, left, right):
            mode, right = "single", None
            if cmp_.get("else_single"):
                left = pick.pick(cmp_["else_single"]) or left
    elif mode == "slow":
        right = left

    times = {}
    for rep in (left, right):
        if rep is not None and rep["rep_number"] not in times:
            times[rep["rep_number"]] = _times(rep["rep_number"], rep_frames, vis)
    if times.get(left["rep_number"]) is None:
        return None

    def panel(rep):
        t = times[rep["rep_number"]]
        return {"rep": rep["rep_number"], "start_s": t["start_s"], "end_s": t["end_s"], "bottom_s": t["bottom_s"],
                "arrow": anchor_point(t["pose"], cmp_.get("arrow"), camera_view, spec)}

    out = {
        "topic": rule["topic"], "rule": rule["id"], "mode": mode,
        "label_left": vis["single_label"] if mode == "single" else labels[0],
        "label_right": labels[1] if len(labels) > 1 else "",
        "arrow_label": (cmp_.get("arrow") or {}).get("label"),
        "left": panel(left),
    }
    if mode in ("pair", "slow"):
        if times.get(right["rep_number"]) is None:
            out["mode"] = "single"
            out["label_left"] = vis["single_label"]
        else:
            out["right"] = panel(right)
            if mode == "slow":
                real = pick.value(left, cmp_["left"]["measure"]) or 0.8
                out["slow"] = {"lowering_s": round(real, 2), "target_s": vis["slow_target_seconds"]}
    out["arrow_window_s"] = vis["arrow_window_seconds"]
    return out
