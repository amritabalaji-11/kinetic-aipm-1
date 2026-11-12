"""The rule engine: turns one exercise spec and a set's per-rep measurements into the list of coaching points that are allowed.

It knows nothing about any one exercise. Everything it needs, which measure to read, which views a rule needs, which test to apply and with
what numbers, comes from the spec's `rules` list (see `exercises/SCHEMA.md`). A new exercise is a new spec, not new code.

How a rule is judged:
  - A rule needs a camera view it lists, enough reps if it says so, and `min_with_data` reps that have a value for its measure.
  - Each test judges the "considered" reps: all counted reps, minus the first when the rule says `skip_first` and the set has more reps than
    `selection.skip_first_rep_when_more_than` (the first rep is often a warm-up). Reps with no usable value are not counted.
  - A rule that fires lists the reps it rests on (`reps_flagged`). Praise and flags follow the same rules as work-on items.
  - Rules in the same `group` are tried in `group_order`; the first one that fires wins, the rest are skipped.

The output is a plain dict (see `evaluate`). Nothing here talks to the AI or the screen.
"""
from statistics import median

from exercises.registry import get_spec
from exercises.schema import ANY_VIEW


def _field(rep, path):
    section, key = path.split(".", 1)
    value = (rep.get(section) or {}).get(key)
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _med(values):
    values = [v for v in values if v is not None]
    return median(values) if values else None


class _Set:
    """One set of reps, read through one spec."""

    def __init__(self, reps, spec):
        self.reps = reps
        self.spec = spec
        self.n = len(reps)
        self.nums = [r.get("rep_number", i + 1) for i, r in enumerate(reps)]
        self.sel = spec["selection"]
        self.measures = {m["id"]: m for m in spec["measures"]}
        self.view_groups = spec["capture"]["views"]
        views = [r.get("camera_view") for r in reps if r.get("camera_view")]
        self.view = max(set(views), key=views.count) if views else None
        self.enough = self.n >= self.sel["min_reps"]
        self._cache = {}

    def values(self, measure_id):
        """The measure's value for every rep, None where there is no usable value."""
        if measure_id not in self._cache:
            m = self.measures[measure_id]
            above = m.get("valid_above")
            out = []
            for rep in self.reps:
                v = _field(rep, m["field"])
                out.append(v if v is not None and (above is None or v > above) else None)
            self._cache[measure_id] = out
        return self._cache[measure_id]

    def view_ok(self, rule):
        groups = rule["views"]
        if ANY_VIEW in groups:
            return True
        return self.view is not None and any(self.view in self.view_groups.get(g, []) for g in groups)

    def considered(self, test):
        skip = test.get("skip_first", False) and self.n > self.sel["skip_first_rep_when_more_than"]
        return range(1 if skip else 0, self.n)

    def min_with_data(self, test):
        return test.get("min_with_data", self.sel["min_with_data"])


# ---------------------------------------------------------------- the tests: each returns None, or {"reps": [...], "numbers": {...}}

def _share(s, rule, keep):
    test, mid = rule["test"], rule["measure"]
    vals = s.values(mid)
    ids = [i for i in s.considered(test) if vals[i] is not None]
    if len(ids) < s.min_with_data(test):
        return None
    if test["type"] == "share_between" and test.get("typical_within"):
        typical = median([vals[i] for i in ids])
        if not (test["min"] <= typical <= test["max"]):
            return None
    flagged = [i for i in ids if keep(vals[i])]
    share = test.get("share", s.sel["majority_share"])
    if len(flagged) >= test.get("min_flagged", 1) and len(flagged) > share * len(ids):
        return {"reps": [s.nums[i] for i in flagged],
                "numbers": {"measure": mid, "considered": len(ids), "flagged": len(flagged), "median": round(median([vals[i] for i in ids]), 2)}}
    return None


def _start_and_later(s, rule):
    """(own start median, later median, later start index, valid indexes) for the growth and steady tests, or None."""
    test = rule["test"]
    vals = s.values(rule["measure"])
    valid = [i for i in range(s.n) if vals[i] is not None]
    if len(valid) < s.min_with_data(test):
        return None
    base = median([vals[i] for i in valid[: test["baseline_reps"]]])
    later_start = max(s.n // 2, test["baseline_reps"])      # the "later" reps never include the reps that make up the person's own start
    later = _med([vals[i] for i in range(later_start, s.n)])
    if later is None:
        return None
    return base, later, later_start, valid


def _growth(s, rule):
    test, vals = rule["test"], s.values(rule["measure"])
    got = _start_and_later(s, rule)
    if not got:
        return None
    base, later, later_start, _ = got
    growth = later - base
    if growth < test["growth"]:
        return None
    flagged = [i for i in range(later_start, s.n) if vals[i] is not None and vals[i] >= base + test["growth"]]
    if len(flagged) < test.get("min_flagged", 1):
        return None
    return {"reps": [s.nums[i] for i in flagged],
            "numbers": {"measure": rule["measure"], "own_start_median": round(base, 1), "later_median": round(later, 1), "growth": round(growth, 1), "flagged": len(flagged)}}


def _steady(s, rule):
    test, vals = rule["test"], s.values(rule["measure"])
    got = _start_and_later(s, rule)
    if not got:
        return None
    base, later, _, valid = got
    if later - base > test["growth_max"]:
        return None
    steady = [i for i in valid if vals[i] <= base + test["margin"]]
    if not steady:
        return None
    return {"reps": [s.nums[i] for i in steady],
            "numbers": {"measure": rule["measure"], "own_start_median": round(base, 1), "later_median": round(later, 1), "growth": round(later - base, 1)}}


def _drop_over_thirds(s, rule):
    test, vals = rule["test"], s.values(rule["measure"])
    valid = [i for i in range(s.n) if vals[i] is not None]
    if len(valid) < s.min_with_data(test):
        return None
    typical = median([vals[i] for i in valid])
    third = max(1, s.n // 3)
    first = _med(vals[:third])
    last = _med(vals[-third:])
    if typical < test["typical_min"] or first is None or last is None:
        return None
    if first - last >= test["drop"] and last <= test["last_over_first_max"] * first:
        return {"reps": [s.nums[i] for i in range(s.n - third, s.n)],
                "numbers": {"measure": rule["measure"], "typical": round(typical, 2), "first_third": round(first, 2), "last_third": round(last, 2)}}
    return None


def _run_test(s, rule):
    test = rule["test"]
    kind = test["type"]
    if kind == "share_over":
        return _share(s, rule, lambda v: v >= test["threshold"])
    if kind == "share_under":
        return _share(s, rule, lambda v: v < test["threshold"])
    if kind == "share_between":
        return _share(s, rule, lambda v: test["min"] <= v <= test["max"])
    if kind == "growth_vs_start":
        return _growth(s, rule)
    if kind == "steady_vs_start":
        return _steady(s, rule)
    if kind == "drop_over_thirds":
        return _drop_over_thirds(s, rule)
    raise ValueError(f"unknown test type {kind!r} in rule {rule.get('id')!r}")


def _applies(s, rule):
    """A rule is only judged with a camera view it lists, and with enough reps if it says so."""
    if not s.view_ok(rule):
        return False
    return s.enough or not rule.get("requires_enough_reps", True)


def evaluate(reps, spec) -> dict:
    """The coaching points this set allows.

    Returns {exercise_id, rep_count, enough_reps, camera_view, flags, signals, numbers}:
      flags    {flag name: True/False} for every flag rule in the spec (False when its views or data are missing)
      signals  [{kind, topic, rule, reps_flagged, numbers, wording}] for every work-on and went-well point that fired
      numbers  {measure id: {"valid": reps with a value, "median": ...}} for the measures a rule could use here
    """
    s = _Set(reps, spec)
    rules = spec["rules"]
    flags = {r["flag"]: False for r in rules if r["kind"] == "flag"}
    signals, done_groups = [], set()

    for rule in rules:
        group = rule.get("group")
        if group in done_groups:
            continue
        # a group is tried in order; the first rule that fires wins
        candidates = sorted((r for r in rules if r.get("group") == group), key=lambda r: r["group_order"]) if group else [rule]
        for cand in candidates:
            if not _applies(s, cand):
                continue
            hit = _run_test(s, cand)
            if hit is None:
                continue
            if cand["kind"] == "flag":
                flags[cand["flag"]] = True
            else:
                signals.append({"kind": cand["kind"], "topic": cand["topic"], "rule": cand["id"], "reps_flagged": sorted(set(hit["reps"])),
                                "numbers": hit["numbers"], "wording": dict(cand["wording"])})
            if group:
                done_groups.add(group)
                break
        if group:
            done_groups.add(group)

    numbers = {}
    for mid in {r["measure"] for r in rules if s.view_ok(r)}:
        vals = [v for v in s.values(mid) if v is not None]
        numbers[mid] = {"valid": len(vals), "median": round(median(vals), 2) if vals else None}

    return {"exercise_id": spec["identity"]["exercise_id"], "rep_count": s.n, "enough_reps": s.enough, "camera_view": s.view,
            "flags": flags, "signals": signals, "numbers": numbers}
