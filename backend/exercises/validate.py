"""Checks that an exercise spec follows the structure in `schema.py`. Returns a list of plain-English problems (empty = valid).

It checks shape (every section and field present, right types, only known words), and meaning (a rule's measure exists, a
validated rule has proof, every topic that can be shown has a rule, no forbidden phrase in anything a user reads, wording
short enough). Run on the shipped spec by the tests, and on every spec when it is first loaded.
"""
import copy
import re
from pathlib import Path

from exercises import schema as S

BACKEND = Path(__file__).resolve().parents[1]
_SNAKE = re.compile(r"^[a-z][a-z0-9_]*$")
_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _is_str(v):
    return isinstance(v, str) and v.strip() != ""


class _Report:
    def __init__(self):
        self.errors = []

    def add(self, path, message):
        self.errors.append(f"{path}: {message}")

    def need(self, obj, path, key, check, what):
        """The key must exist and pass `check`. Returns the value (or None)."""
        if not isinstance(obj, dict) or key not in obj:
            self.add(path, f"'{key}' is missing")
            return None
        if not check(obj[key]):
            self.add(f"{path}.{key}", f"must be {what}")
            return None
        return obj[key]

    def only(self, obj, path, allowed):
        for key in obj:
            if key not in allowed:
                self.add(path, f"unknown field '{key}' (allowed: {', '.join(sorted(allowed))})")


def _forbidden_phrase(text):
    low = text.lower()
    for bad in S.FORBIDDEN_PHRASES:
        if bad in low:
            return f"contains the forbidden phrase '{bad}'"
    return None


def _user_text_problems(text, numbers_allowed=False):
    """Why a line the user will read is not allowed, or None."""
    problem = _forbidden_phrase(text)
    if problem:
        return problem
    if not numbers_allowed and re.search(r"\d", text):
        return "contains a number (no degrees, rep numbers or ideal ranges in user-facing wording)"
    return None


# ---------------------------------------------------------------- sections

def _identity(spec, r):
    sec = spec.get("identity", {})
    p = "identity"
    r.only(sec, p, {"exercise_id", "name", "spec_version", "status", "family", "aliases", "equipment_variants", "reference_file_stem", "trainer_signoff", "updated"})
    r.need(sec, p, "exercise_id", lambda v: isinstance(v, str) and bool(_SLUG.match(v)), "a hyphenated lowercase slug, e.g. 'goblet-squat'")
    r.need(sec, p, "name", _is_str, "text")
    r.need(sec, p, "spec_version", lambda v: isinstance(v, str) and bool(re.match(S.SEMVER, v)), "a version like 1.0.0")
    r.need(sec, p, "status", lambda v: v in S.SPEC_STATUSES, f"one of {S.SPEC_STATUSES}")
    r.need(sec, p, "family", _is_str, "text")
    r.need(sec, p, "aliases", lambda v: isinstance(v, list) and all(_is_str(x) for x in v), "a list of names")
    r.need(sec, p, "reference_file_stem", _is_str, "text (the coaching reference file name without _coaching_reference.md)")
    variants = r.need(sec, p, "equipment_variants", lambda v: isinstance(v, list) and len(v) >= 1, "a list with at least one variant")
    for i, v in enumerate(variants or []):
        if not (isinstance(v, dict) and _is_str(v.get("catalog_id")) and _is_str(v.get("equipment"))):
            r.add(f"{p}.equipment_variants[{i}]", "needs catalog_id and equipment")
    if "trainer_signoff" not in sec:
        r.add(p, "'trainer_signoff' is missing (use null until a trainer signs it off)")
    elif sec["trainer_signoff"] is not None and not (isinstance(sec["trainer_signoff"], dict) and _is_str(sec["trainer_signoff"].get("name")) and _is_str(sec["trainer_signoff"].get("date"))):
        r.add(f"{p}.trainer_signoff", "must be null or {name, date}")


def _goal_profiles(spec, r):
    sec = spec.get("goal_profiles", {})
    p = "goal_profiles"
    r.only(sec, p, {"default", "supported", "unsupported", "profiles"})
    default = r.need(sec, p, "default", _is_str, "a goal name")
    supported = r.need(sec, p, "supported", lambda v: isinstance(v, list) and len(v) >= 1 and all(_is_str(x) for x in v), "a list of goal names")
    unsupported = r.need(sec, p, "unsupported", lambda v: isinstance(v, dict) and all(_is_str(k) and _is_str(x) for k, x in v.items()), "a {goal: reason} map")
    profiles = r.need(sec, p, "profiles", lambda v: isinstance(v, dict), "a {goal: {overrides}} map")
    if supported and default and default not in supported:
        r.add(p, f"the default goal '{default}' must be in 'supported'")
    if supported and unsupported and set(supported) & set(unsupported):
        r.add(p, f"goals cannot be both supported and unsupported: {sorted(set(supported) & set(unsupported))}")
    for goal in supported or []:
        entry = (profiles or {}).get(goal)
        if not isinstance(entry, dict) or not isinstance(entry.get("overrides"), dict):
            r.add(f"{p}.profiles.{goal}", "needs an 'overrides' map (empty for the default goal)")
            continue
        for path in entry["overrides"]:
            try:
                from exercises.registry import _set_path
                _set_path(copy.deepcopy(spec), path, entry["overrides"][path])
            except Exception as e:  # noqa: BLE001 - any failure means the path does not point at something real
                r.add(f"{p}.profiles.{goal}.overrides", f"path {path!r} does not point at anything in this spec ({e})")


def _capture(spec, r):
    sec = spec.get("capture", {})
    p = "capture"
    r.only(sec, p, {"preferred_view", "views", "target_reps", "tips", "view_notes"})
    views = r.need(sec, p, "views", lambda v: isinstance(v, dict) and set(v) <= set(S.VIEW_GROUPS) and all(isinstance(x, list) and x and all(_is_str(i) for i in x) for x in v.values()), f"a map of view groups ({', '.join(S.VIEW_GROUPS)}) to lists of camera_view names")
    pref = r.need(sec, p, "preferred_view", lambda v: v in S.VIEW_GROUPS, f"one of {S.VIEW_GROUPS}")
    if views and pref and pref not in views:
        r.add(p, f"preferred_view '{pref}' is not one of the allowed views")
    target = r.need(sec, p, "target_reps", lambda v: isinstance(v, list) and len(v) == 2 and all(_is_int(x) for x in v) and v[0] <= v[1], "[min, max] reps")
    min_reps = (spec.get("selection") or {}).get("min_reps")
    if target and _is_int(min_reps) and target[0] < min_reps:
        r.add(f"{p}.target_reps", f"the lowest target ({target[0]}) is below selection.min_reps ({min_reps})")
    tips = r.need(sec, p, "tips", lambda v: isinstance(v, list) and len(v) >= 1, "a list of tips")
    for i, tip in enumerate(tips or []):
        if not (isinstance(tip, dict) and _is_str(tip.get("bold")) and _is_str(tip.get("why"))):
            r.add(f"{p}.tips[{i}]", "needs 'bold' and 'why'")
    notes = r.need(sec, p, "view_notes", lambda v: isinstance(v, dict) and set(v) <= set(S.VIEW_GROUPS) and all(_is_str(x) for x in v.values()), "a {view group: note} map")
    for group, text in (notes or {}).items():
        problem = _user_text_problems(text)
        if problem:
            r.add(f"{p}.view_notes.{group}", problem)


def _tracked_ok(neutral, tracked):
    """The sided landmarks a neutral name stands for that are NOT tracked (either side may be the one nearest the camera)."""
    return [n for n in S.NEUTRAL_LANDMARKS.get(neutral, ()) if n not in tracked]


def _landmarks(spec, r):
    """Which body points matter for this exercise, and how much. Returns the set of tracked landmark names."""
    sec = spec.get("landmarks", {})
    p = "landmarks"
    r.only(sec, p, {"importance_weights", "critical", "important", "least_impact", "thresholds", "side_views_use"})
    weights = r.need(sec, p, "importance_weights", lambda v: isinstance(v, dict) and set(v) == set(S.IMPORTANCE) and all(_is_num(x) and 0 < x <= 1 for x in v.values()),
                     f"a weight from 0 to 1 for each of {S.IMPORTANCE}")
    tracked, seen, total = set(), {}, 0.0
    for level in S.IMPORTANCE:
        names = r.need(sec, p, level, lambda v: isinstance(v, list) and all(x in S.LANDMARK_NAMES for x in v), "a list of MediaPipe landmark names (see schema.LANDMARK_NAMES)")
        for name in names or []:
            if name in seen:
                r.add(f"{p}.{level}", f"'{name}' is already listed under {seen[name]}")
            seen[name] = level
            tracked.add(name)
            total += (weights or {}).get(level, 0)
    if isinstance(sec.get("critical"), list) and not sec["critical"]:
        r.add(f"{p}.critical", "needs at least one critical landmark")
    if weights and abs(total - 1.0) > 0.01:
        r.add(f"{p}.importance_weights", f"the weights of the tracked landmarks add up to {total:.3f}; they must add up to 1")
    th = r.need(sec, p, "thresholds", lambda v: isinstance(v, dict) and set(v) == {"visibility", "presence", "critical_hard_floor", "good", "acceptable"} and all(_is_num(x) and 0 < x <= 1 for x in v.values()),
                "visibility, presence, critical_hard_floor, good and acceptable, each from 0 to 1")
    if th and th["critical_hard_floor"] > th["visibility"]:
        r.add(f"{p}.thresholds", "critical_hard_floor cannot be above visibility")
    if th and th["acceptable"] > th["good"]:
        r.add(f"{p}.thresholds", "acceptable cannot be above good")
    r.need(sec, p, "side_views_use", lambda v: v in S.SIDE_VIEW_USE, f"one of {S.SIDE_VIEW_USE}")
    return tracked


def _measures(spec, r, tracked):
    sec = spec.get("measures")
    p = "measures"
    if not isinstance(sec, list) or not sec:
        r.add(p, "must be a non-empty list")
        return set()
    ids = set()
    for i, m in enumerate(sec):
        here = f"{p}[{i}]"
        if not isinstance(m, dict):
            r.add(here, "must be an object")
            continue
        r.only(m, here, {"id", "label", "field", "unit", "views", "definition", "valid_above", "landmarks"})
        mid = r.need(m, here, "id", lambda v: isinstance(v, str) and bool(_SNAKE.match(v)), "a snake_case name")
        if mid in ids:
            r.add(here, f"duplicate measure id '{mid}'")
        ids.add(mid)
        r.need(m, here, "label", _is_str, "text")
        r.need(m, here, "field", lambda v: isinstance(v, str) and bool(re.match(r"^[a-z_]+\.[a-z_]+$", v)), "a per-rep path like 'back_data.back_angle_at_bottom'")
        r.need(m, here, "unit", _is_str, "text")
        r.need(m, here, "definition", _is_str, "text (landmarks and calculation)")
        r.need(m, here, "views", lambda v: isinstance(v, list) and v and all(x in S.VIEW_GROUPS + (S.ANY_VIEW,) for x in v), "a list of view groups or 'any'")
        if "valid_above" in m and not _is_num(m["valid_above"]):
            r.add(f"{here}.valid_above", "must be a number")
        used = r.need(m, here, "landmarks", lambda v: isinstance(v, list) and v and all(x in S.NEUTRAL_LANDMARKS for x in v), f"a non-empty list of body parts from {sorted(S.NEUTRAL_LANDMARKS)}")
        for name in used or []:
            missing = _tracked_ok(name, tracked)
            if missing:
                r.add(f"{here}.landmarks", f"uses '{name}' but {missing} is not tracked in the landmarks section")
    return ids


def _rep_counting(spec, r):
    sec = spec.get("rep_counting", {})
    p = "rep_counting"
    r.need(sec, p, "counter", _is_str, "the counter type (e.g. 'hip_angle_cycle')")
    r.need(sec, p, "signal", _is_str, "the signal followed (e.g. 'hip_angle')")
    r.need(sec, p, "start_phase", lambda v: v in ("top", "bottom"), "'top' or 'bottom'")
    for flag in ("partial_last_rep", "unilateral", "timed"):
        r.need(sec, p, flag, lambda v: isinstance(v, bool), "true or false")
    r.need(sec, p, "thresholds", lambda v: isinstance(v, dict) and v and all(_is_num(x) for x in v.values()), "a map of numbers")
    r.need(sec, p, "setup_outlier", lambda v: isinstance(v, dict) and all(_is_num(x) for x in v.values()), "a map of numbers (empty if none)")


def _check_pick(pick, here, ids, r, allow_pool=True):
    if not isinstance(pick, dict):
        r.add(here, "must be an object like {pick, measure, pool}")
        return
    r.only(pick, here, {"pick", "measure", "pool"})
    r.need(pick, here, "pick", lambda v: v in S.PICKS, f"one of {S.PICKS}")
    if pick.get("pick") != "middle":
        r.need(pick, here, "measure", lambda v: v in ids, f"a measure id ({', '.join(sorted(ids))})")
    elif "measure" in pick and pick["measure"] not in ids:
        r.add(f"{here}.measure", "is not a measure id")
    r.need(pick, here, "pool", lambda v: v in S.POOLS, f"one of {S.POOLS}")


def _check_arrow(arrow, here, r, tracked):
    if not isinstance(arrow, dict):
        r.add(here, "must be an object {label, views, anchor}")
        return
    r.only(arrow, here, {"label", "views", "anchor"})
    r.need(arrow, here, "label", lambda v: _is_str(v) and len(v.split()) <= 3, "a 1-3 word label")
    r.need(arrow, here, "views", lambda v: isinstance(v, list) and v and all(x in S.VIEW_GROUPS for x in v), "a list of view groups")
    anchor = r.need(arrow, here, "anchor", lambda v: isinstance(v, dict), "an anchor object")
    if isinstance(anchor, dict):
        r.only(anchor, f"{here}.anchor", {"landmarks", "t", "back_offset", "x_offset", "tail"})
        marks = r.need(anchor, f"{here}.anchor", "landmarks", lambda v: isinstance(v, list) and 1 <= len(v) <= 2 and all(x in S.LANDMARKS or x in S.FRONT_ANCHORS for x in v), f"1-2 of {sorted(S.LANDMARKS)} or {S.FRONT_ANCHORS}")
        if marks and len(marks) == 2:
            r.need(anchor, f"{here}.anchor", "t", lambda v: _is_num(v) and 0 <= v <= 1, "a number from 0 to 1 (how far from the first landmark to the second)")
        for name in marks or []:
            neutral = "knee" if name in S.FRONT_ANCHORS else name
            missing = _tracked_ok(neutral, tracked)
            if missing:
                r.add(f"{here}.anchor", f"points at '{name}' but {missing} is not tracked in the landmarks section")
        for key in ("back_offset", "x_offset"):
            if key in anchor and not _is_num(anchor[key]):
                r.add(f"{here}.anchor.{key}", "must be a number")
        if "tail" in anchor and anchor["tail"] not in ("left", "right", "back"):
            r.add(f"{here}.anchor.tail", "must be left, right or back")


def _check_comparison(cmp_, here, ids, r, tracked):
    if not isinstance(cmp_, dict):
        r.add(here, "must be an object")
        return
    r.only(cmp_, here, {"mode", "labels", "left", "right", "pair_if", "else_single", "arrow", "picture"})
    mode = r.need(cmp_, here, "mode", lambda v: v in S.MODES, f"one of {S.MODES}")
    if mode in ("pair", "slow"):
        r.need(cmp_, here, "labels", lambda v: isinstance(v, list) and len(v) == 2 and all(_is_str(x) for x in v), "two labels [left, right]")
    _check_pick(cmp_.get("left"), f"{here}.left", ids, r) if "left" in cmp_ else r.add(here, "'left' is missing")
    if mode == "pair":
        _check_pick(cmp_.get("right"), f"{here}.right", ids, r) if "right" in cmp_ else r.add(here, "'right' is missing for a pair")
    elif "right" in cmp_:
        r.add(f"{here}.right", f"is not used in mode '{mode}'")
    if "pair_if" in cmp_:
        pif = cmp_["pair_if"]
        if not (isinstance(pif, dict) and pif.get("measure") in ids and (_is_num(pif.get("gap_at_least")) != _is_num(pif.get("ratio_at_least")))):
            r.add(f"{here}.pair_if", "needs a measure id and exactly one of gap_at_least or ratio_at_least")
    if "else_single" in cmp_:
        _check_pick(cmp_["else_single"], f"{here}.else_single", ids, r)
    if "arrow" in cmp_:
        _check_arrow(cmp_["arrow"], f"{here}.arrow", r, tracked)
    if "picture" in cmp_:
        _check_pick(cmp_["picture"], f"{here}.picture", ids, r)
    else:
        r.add(here, "'picture' is missing (which rep the still picture shows)")


def _check_test(test, here, r):
    if not isinstance(test, dict) or test.get("type") not in S.TESTS:
        r.add(here, f"needs a 'type' from {sorted(S.TESTS)}")
        return
    kind = S.TESTS[test["type"]]
    allowed = {"type", *kind["required"], *kind["optional"]}
    r.only(test, here, allowed)
    for key in kind["required"]:
        if key not in test:
            r.add(here, f"a '{test['type']}' test needs '{key}'")
        elif not _is_num(test[key]):
            r.add(f"{here}.{key}", "must be a number")
    for key in ("min_with_data", "min_flagged", "baseline_reps"):
        if key in test and not _is_int(test[key]):
            r.add(f"{here}.{key}", "must be a whole number")
    for key in ("skip_first", "typical_within"):
        if key in test and not isinstance(test[key], bool):
            r.add(f"{here}.{key}", "must be true or false")
    if "share" in test and not (_is_num(test["share"]) and 0 < test["share"] < 1):
        r.add(f"{here}.share", "must be between 0 and 1")


def _rules(spec, r, measure_ids, tracked):
    rules = spec.get("rules")
    p = "rules"
    if not isinstance(rules, list) or not rules:
        r.add(p, "must be a non-empty list")
        return {}
    selection = spec.get("selection") or {}
    max_words = selection.get("max_words_per_line", 12)
    ids, flags, groups = {}, set(), {}
    for i, rule in enumerate(rules):
        here = f"{p}[{rule.get('id', i) if isinstance(rule, dict) else i}]"
        if not isinstance(rule, dict):
            r.add(here, "must be an object")
            continue
        r.only(rule, here, set(S.RULE_FIELDS_REQUIRED) | set(S.RULE_FIELDS_OPTIONAL))
        rid = r.need(rule, here, "id", lambda v: isinstance(v, str) and bool(_SNAKE.match(v)), "a snake_case name")
        if rid in ids:
            r.add(here, f"duplicate rule id '{rid}'")
        ids[rid] = rule
        topic = r.need(rule, here, "topic", lambda v: isinstance(v, str) and bool(_SNAKE.match(v)), "a snake_case topic")
        kind = r.need(rule, here, "kind", lambda v: v in S.KINDS, f"one of {S.KINDS}")
        r.need(rule, here, "views", lambda v: isinstance(v, list) and v and all(x in S.VIEW_GROUPS + (S.ANY_VIEW,) for x in v), "a list of view groups or 'any'")
        measure = r.need(rule, here, "measure", lambda v: v in measure_ids, f"a measure id ({', '.join(sorted(measure_ids))})")
        r.need(rule, here, "status", lambda v: v in S.RULE_STATUSES, f"one of {S.RULE_STATUSES}")
        r.need(rule, here, "evidence", lambda v: isinstance(v, list) and v and all(_is_str(x) for x in v), "a non-empty list of evidence notes (say 'none yet' if there is none)")
        _check_test(rule.get("test"), f"{here}.test", r)
        if "requires_enough_reps" in rule and not isinstance(rule["requires_enough_reps"], bool):
            r.add(f"{here}.requires_enough_reps", "must be true or false")
        if ("group" in rule) != ("group_order" in rule):
            r.add(here, "'group' and 'group_order' go together")
        elif "group" in rule:
            if not _is_str(rule["group"]) or not _is_int(rule["group_order"]):
                r.add(here, "group must be text and group_order a whole number")
            else:
                order = groups.setdefault(rule["group"], [])
                if rule["group_order"] in order:
                    r.add(here, f"group '{rule['group']}' already has a rule at position {rule['group_order']}")
                order.append(rule["group_order"])
        wording = rule.get("wording")
        if kind == "flag":
            r.need(rule, here, "flag", lambda v: isinstance(v, str) and bool(_SNAKE.match(v)), "the flag name (snake_case)")
            if rule.get("flag") in flags:
                r.add(here, f"duplicate flag name '{rule.get('flag')}'")
            flags.add(rule.get("flag"))
            if wording is not None:
                r.add(f"{here}.wording", "a flag says nothing; remove the wording")
        elif kind in ("work_on", "went_well"):
            needed = ("headline", "why", "cue") if kind == "work_on" else ("headline",)
            if not isinstance(wording, dict):
                r.add(here, f"a {kind} rule needs wording with {needed}")
            else:
                r.only(wording, f"{here}.wording", set(needed))
                for key in needed:
                    text = wording.get(key)
                    if not _is_str(text):
                        r.add(f"{here}.wording", f"'{key}' is missing")
                        continue
                    if len(text.split()) > max_words:
                        r.add(f"{here}.wording.{key}", f"is {len(text.split())} words; the limit is {max_words}")
                    problem = _user_text_problems(text)
                    if problem:
                        r.add(f"{here}.wording.{key}", problem)
            if "flag" in rule:
                r.add(here, "only a flag rule has a 'flag' name")
        if "comparison" in rule:
            if kind == "went_well":
                r.add(f"{here}.comparison", "praise has no before/after")
            else:
                _check_comparison(rule["comparison"], f"{here}.comparison", measure_ids, r, tracked)
    return ids


def _topics_one_list(rules, r):
    """A topic that has both a work-on rule and a went-well rule must put them in one group, so only one can ever fire."""
    by_topic = {}
    for rid, rule in rules.items():
        if rule.get("kind") in ("work_on", "went_well"):
            by_topic.setdefault(rule["topic"], []).append(rule)
    for topic, items in by_topic.items():
        if {x["kind"] for x in items} == {"work_on", "went_well"}:
            groups = {x.get("group") for x in items}
            if len(groups) != 1 or None in groups:
                r.add(f"rules[topic {topic}]", "has both work_on and went_well rules, which must share one 'group' so a topic can never be in both lists")


def _selection(spec, r, rules):
    sec = spec.get("selection", {})
    p = "selection"
    r.only(sec, p, {"min_reps", "min_with_data", "skip_first_rep_when_more_than", "majority_share", "max_items_per_list", "max_items_when_few_reps", "max_words_per_line", "work_on_order", "went_well_order"})
    for key in ("min_reps", "min_with_data", "skip_first_rep_when_more_than", "max_items_per_list", "max_items_when_few_reps", "max_words_per_line"):
        r.need(sec, p, key, lambda v: _is_int(v) and v >= 1, "a whole number of 1 or more")
    r.need(sec, p, "majority_share", lambda v: _is_num(v) and 0 < v < 1, "a number between 0 and 1")
    for kind, key in (("work_on", "work_on_order"), ("went_well", "went_well_order")):
        order = r.need(sec, p, key, lambda v: isinstance(v, list) and all(_is_str(x) for x in v), "a list of topics, highest priority first (empty if the exercise has none of that kind)")
        if order is None:
            continue
        topics = {rule["topic"] for rule in rules.values() if rule.get("kind") == kind}
        for t in order:
            if t not in topics:
                r.add(f"{p}.{key}", f"topic '{t}' has no {kind} rule")
        for t in topics - set(order):
            r.add(f"{p}.{key}", f"the {kind} topic '{t}' has a rule but is not in the order list, so it could never be shown")
        if len(set(order)) != len(order):
            r.add(f"{p}.{key}", "has a topic twice")


def _visuals(spec, r):
    sec = spec.get("visuals", {})
    p = "visuals"
    r.only(sec, p, {"key_moment", "pad_seconds", "freeze_seconds", "slow_target_seconds", "arrow_window_seconds", "min_reps", "single_label", "picture_style", "reference_clip"})
    km = r.need(sec, p, "key_moment", lambda v: isinstance(v, dict) and _is_str(v.get("frame_field")) and v.get("pick") in ("min", "max"), "{frame_field, pick: min|max}")
    del km
    for key in ("pad_seconds", "freeze_seconds", "slow_target_seconds", "arrow_window_seconds"):
        r.need(sec, p, key, lambda v: _is_num(v) and v > 0, "a positive number of seconds")
    r.need(sec, p, "min_reps", lambda v: _is_int(v) and v >= 1, "a whole number")
    r.need(sec, p, "single_label", _is_str, "text")
    r.need(sec, p, "picture_style", lambda v: v in ("arrow_on_frame",), "'arrow_on_frame'")
    if "reference_clip" not in sec:
        r.add(p, "'reference_clip' is missing (use null until there is one)")


def _screen(spec, r):
    sec = spec.get("screen", {})
    p = "screen"
    r.only(sec, p, {"reminders", "pain_line", "depth_cards"})
    lines = list(r.need(sec, p, "reminders", lambda v: isinstance(v, list) and v and all(_is_str(x) for x in v), "a list of reminder lines") or [])
    pain = r.need(sec, p, "pain_line", _is_str, "text")
    if pain:
        lines.append(pain)
    cards = r.need(sec, p, "depth_cards", lambda v: isinstance(v, dict), "a map of cards (may be empty)")
    for name, card in (cards or {}).items():
        if not (isinstance(card, dict) and all(_is_str(card.get(k)) for k in ("title", "why", "cue"))):
            r.add(f"{p}.depth_cards.{name}", "needs title, why and cue")
        else:
            lines.extend(card.values())
    for text in lines:
        problem = _user_text_problems(text, numbers_allowed=True)
        if problem:
            r.add(p, f"'{text[:40]}…' {problem}")


def _progression(spec, r):
    sec = spec.get("progression", {})
    r.need(sec, "progression", "status", lambda v: v in ("not_modelled", "modelled"), "'not_modelled' or 'modelled'")
    r.need(sec, "progression", "notes", _is_str, "text")


def _not_measured(spec, r):
    sec = spec.get("not_measured")
    if not isinstance(sec, list):
        r.add("not_measured", "must be a list (it may be empty)")
        return
    for i, item in enumerate(sec):
        if not (isinstance(item, dict) and _is_str(item.get("item")) and _is_str(item.get("reason"))):
            r.add(f"not_measured[{i}]", "needs 'item' and 'reason'")


def _evidence(spec, r, rules, folder, check_files):
    sec = spec.get("evidence", {})
    p = "evidence"
    r.only(sec, p, {"golden_dir", "clips", "proof"})
    golden = r.need(sec, p, "golden_dir", _is_str, "a path under backend/")
    clips = r.need(sec, p, "clips", lambda v: isinstance(v, list) and v, "a non-empty list of clips")
    clip_ids = set()
    for i, c in enumerate(clips or []):
        here = f"{p}.clips[{i}]"
        if not (isinstance(c, dict) and _is_str(c.get("id")) and c.get("view") in S.VIEW_GROUPS and _is_int(c.get("reps")) and _is_str(c.get("source_recording"))):
            r.add(here, "needs id, view (a view group), reps and source_recording")
            continue
        r.only(c, here, {"id", "view", "reps", "label", "source_recording", "true_rep_count"})
        if c["id"] in clip_ids:
            r.add(here, f"duplicate clip '{c['id']}'")
        clip_ids.add(c["id"])
    proof = r.need(sec, p, "proof", lambda v: isinstance(v, list), "a list (may be empty)")
    proven = set()
    for i, item in enumerate(proof or []):
        here = f"{p}.proof[{i}]"
        if not (isinstance(item, dict) and item.get("rule") in rules and item.get("fires_on") in clip_ids and item.get("silent_on") in clip_ids):
            r.add(here, "needs a rule id, a clip it fires_on and a clip it is silent_on, both listed in evidence.clips")
        else:
            proven.add(item["rule"])
    signed = (spec.get("identity") or {}).get("trainer_signoff")
    for rid, rule in rules.items():
        status = rule.get("status")
        if status in ("tested", "validated") and rid not in proven:
            r.add(f"rules[{rid}]", f"is marked {status} but has no entry in evidence.proof (a clip it fires on and a clip it is silent on)")
        if status == "validated" and not signed:
            r.add(f"rules[{rid}]", "is marked validated but identity.trainer_signoff is null")
        if status == "draft" and rid in proven:
            r.add(f"rules[{rid}]", "has proof in evidence.proof, so it should be marked tested")
    if check_files and golden and clips:
        base = BACKEND / golden
        if not (base / "expected.json").exists():
            r.add(f"{p}.golden_dir", f"{golden}/expected.json does not exist")
        else:
            import json
            listed = set(json.loads((base / "expected.json").read_text()).get("clips", {}))
            for cid in clip_ids:
                if cid not in listed:
                    r.add(f"{p}.clips", f"clip '{cid}' is not in {golden}/expected.json")
                if not (base / "reps" / f"{cid}.json").exists():
                    r.add(f"{p}.clips", f"{golden}/reps/{cid}.json does not exist")


def _decisions(spec, r):
    sec = spec.get("decisions", {})
    p = "decisions"
    r.only(sec, p, {"open", "changelog"})
    items = r.need(sec, p, "open", lambda v: isinstance(v, list), "a list (may be empty)")
    for i, d in enumerate(items or []):
        if not (isinstance(d, dict) and _is_int(d.get("n")) and _is_str(d.get("text")) and _is_str(d.get("status"))):
            r.add(f"{p}.open[{i}]", "needs n, text and status")
    log = r.need(sec, p, "changelog", lambda v: isinstance(v, list) and v, "a non-empty list of {version, date, text}")
    for i, entry in enumerate(log or []):
        if not (isinstance(entry, dict) and all(_is_str(entry.get(k)) for k in ("version", "date", "text"))):
            r.add(f"{p}.changelog[{i}]", "needs version, date and text")
    version = (spec.get("identity") or {}).get("spec_version")
    if log and isinstance(log[-1], dict) and version and log[-1].get("version") != version:
        r.add(f"{p}.changelog", f"the last entry ({log[-1].get('version')}) must match identity.spec_version ({version})")


def validate_spec(spec, folder=None, check_files=True) -> list:
    """Problems in a parsed spec ({section: block}), or an empty list."""
    r = _Report()
    if not isinstance(spec, dict):
        return ["the spec did not parse into sections"]
    if list(spec) != [s for s in S.SECTIONS if s in spec]:
        r.add("sections", f"are out of order; the order must be {', '.join(S.SECTIONS)}")
    for name in spec:
        if name not in S.SECTIONS:
            r.add("sections", f"unknown section 'kinetic:{name}'")
    missing = [s for s in S.SECTIONS if s not in spec]
    for name in missing:
        r.add("sections", f"section 'kinetic:{name}' is missing")
    if missing:
        return r.errors  # the checks below need every section

    _identity(spec, r)
    if folder and (spec["identity"] or {}).get("exercise_id") != folder:
        r.add("identity.exercise_id", f"must equal the folder name '{folder}'")
    _goal_profiles(spec, r)
    tracked = _landmarks(spec, r)
    measure_ids = _measures(spec, r, tracked)
    rules = _rules(spec, r, measure_ids, tracked)
    _topics_one_list(rules, r)
    _selection(spec, r, rules)
    _capture(spec, r)
    _rep_counting(spec, r)
    _visuals(spec, r)
    _screen(spec, r)
    _progression(spec, r)
    _not_measured(spec, r)
    _evidence(spec, r, rules, folder, check_files)
    _decisions(spec, r)
    return r.errors
