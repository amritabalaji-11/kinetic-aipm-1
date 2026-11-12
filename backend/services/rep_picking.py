"""Shared by the before/after video (comparison.py) and the still picture (focus_overlay.py): which rep a spec asks for, and where the arrow goes.

Everything is driven by the exercise spec. A pick says `{pick, measure, pool}`:
  pick     typical_early | min | max | closest_to_median | middle      (see exercises/schema.py for what each means)
  measure  a measure id from the spec
  pool     all | flagged | after_first | first_third | last_third
Reps here are the counted reps (partial reps removed), in order. "flagged" means the reps the work-on item rests on; with no flagged reps it
means all of them.
"""
from statistics import median

from exercises.schema import FRONT_ANCHORS, LANDMARKS


class Reps:
    """The counted reps of one set, read through one spec, with the picking rules."""

    def __init__(self, reps, spec, flagged=()):
        self.reps = list(reps)
        self.spec = spec
        self.flagged = {int(x) for x in flagged}
        self.n = len(self.reps)
        self.measures = {m["id"]: m for m in spec["measures"]}

    def value(self, rep, measure_id):
        m = self.measures[measure_id]
        section, key = m["field"].split(".", 1)
        v = (rep.get(section) or {}).get(key)
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            return None
        above = m.get("valid_above")
        return v if above is None or v > above else None

    def pool(self, name):
        third = max(1, self.n // 3)
        if name == "all":
            return self.reps
        if name == "flagged":
            return [r for r in self.reps if r.get("rep_number") in self.flagged] or self.reps
        if name == "after_first":
            return self.reps[1:] or self.reps
        if name == "first_third":
            return self.reps[:third]
        if name == "last_third":
            return self.reps[-third:]
        raise ValueError(f"unknown pool {name!r}")

    def pick(self, spec_pick):
        """The rep a pick asks for, or None when no rep has a value for the measure."""
        if not spec_pick:
            return None
        kind, mid = spec_pick["pick"], spec_pick.get("measure")
        pool = self.pool(spec_pick["pool"])
        if kind == "middle":
            return pool[len(pool) // 2] if pool else None
        if kind == "typical_early":
            early = self.reps[1:4] if self.n > 5 else self.reps[:3]      # the first rep is often a warm-up
            cand = [r for r in early if self.value(r, mid) is not None]
            if not cand:
                return None
            target = median(self.value(r, mid) for r in cand)
            return min(cand, key=lambda r: abs(self.value(r, mid) - target))
        cand = [r for r in pool if self.value(r, mid) is not None]
        if not cand and spec_pick["pool"] == "after_first":
            cand = [r for r in self.reps if self.value(r, mid) is not None]
        if not cand:
            return None
        if kind == "min":
            return min(cand, key=lambda r: self.value(r, mid))
        if kind == "max":
            return max(cand, key=lambda r: self.value(r, mid))
        if kind == "closest_to_median":
            target = median(self.value(r, mid) for r in cand)
            return min(cand, key=lambda r: abs(self.value(r, mid) - target))
        raise ValueError(f"unknown pick {kind!r}")


# ---------------------------------------------------------------- which rule is the focus of the video and the picture

def focus_rule(coaching_output, spec):
    """(rule, set of flagged reps) for the issue the video and picture are about, or (None, set()).

    The first "work on" item is the focus. With no work-on item, the first flag rule that fired and has a comparison is (so a
    short depth can still get a picture).
    """
    rules = {r["id"]: r for r in spec["rules"]}
    signals = (coaching_output or {}).get("signals") or {}
    work = ((coaching_output or {}).get("feedback_items") or {}).get("work_on") or []
    if work:
        rule_id = (signals.get("rules") or {}).get(f"work_on:{work[0].get('topic')}")
        rule = rules.get(rule_id)
        if rule and rule.get("comparison"):
            return rule, {int(n) for n in (work[0].get("reps_flagged") or [])}
        return None, set()
    fired = set(signals.get("fired_flags") or [])
    for rule in spec["rules"]:
        if rule["kind"] == "flag" and rule.get("flag") in fired and rule.get("comparison"):
            return rule, set()
    return None, set()


# ---------------------------------------------------------------- where the arrow goes

def _point(pose, idx):
    try:
        lm = pose[idx]
        return (float(lm.x), float(lm.y)) if lm is not None else None
    except Exception:  # noqa: BLE001 - a missing landmark means no arrow, never a crash
        return None


def view_in_groups(spec, camera_view, groups):
    return any(camera_view in spec["capture"]["views"].get(g, []) for g in groups)


def anchor_point(pose, arrow, camera_view, spec):
    """{x, y, back} for an arrow spec on one frame's landmarks (x and y are 0 to 1 positions in the picture, back is -1 or 1: which side
    of the picture the tail of the arrow comes from), or None when the arrow does not apply to this view or a landmark is missing."""
    if not arrow or pose is None or not view_in_groups(spec, camera_view, arrow["views"]):
        return None
    anchor = arrow["anchor"]
    side_right = camera_view == "side_right"
    marks = []
    for name in anchor["landmarks"]:
        if name in FRONT_ANCHORS:
            k1, k2 = _point(pose, 25), _point(pose, 26)
            if not (k1 and k2):
                return None
            marks.append(k1 if k1[0] < k2[0] else k2)          # the knee on the left of the picture
        else:
            left_idx, right_idx = LANDMARKS[name]
            p = _point(pose, right_idx if side_right else left_idx)
            if not p:
                return None
            marks.append(p)
    if anchor.get("tail") in ("left", "right"):
        back = -1.0 if anchor["tail"] == "left" else 1.0
    else:
        nose, hip = _point(pose, 0), _point(pose, LANDMARKS["hip"][1 if side_right else 0])
        if not (nose and hip):
            return None
        back = -1.0 if nose[0] > hip[0] else 1.0                # the person faces the other way from their back
    if len(marks) == 2:
        t = anchor["t"]
        x, y = marks[0][0] + (marks[1][0] - marks[0][0]) * t, marks[0][1] + (marks[1][1] - marks[0][1]) * t
    else:
        x, y = marks[0]
    x += back * anchor.get("back_offset", 0.0) + anchor.get("x_offset", 0.0)
    return {"x": round(x, 3), "y": round(y, 3), "back": back}
