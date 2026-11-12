"""The rule engine, one behaviour at a time, on synthetic sets. The engine knows nothing about any exercise, so these use a made-up one."""
import unittest

from services.rule_engine import evaluate

VIEWS = {"side": ["side_left", "side_right"], "front": ["front"]}


def spec_with(*rules, min_reps=5, skip_first_above=5, min_with_data=4):
    return {
        "identity": {"exercise_id": "test-exercise"},
        "capture": {"views": VIEWS},
        "selection": {"min_reps": min_reps, "min_with_data": min_with_data, "skip_first_rep_when_more_than": skip_first_above, "majority_share": 0.5},
        "measures": [{"id": "m", "field": "data.v", "views": ["any"]}, {"id": "z", "field": "data.z", "views": ["any"], "valid_above": 0}],
        "rules": list(rules),
    }


def rule(rid="r", kind="work_on", test=None, views=("side",), measure="m", **extra):
    base = {"id": rid, "topic": "t_" + rid, "kind": kind, "views": list(views), "measure": measure, "status": "draft", "evidence": ["x"],
            "test": test or {"type": "share_over", "threshold": 5}}
    if kind == "flag":
        base["flag"] = "flag_" + rid
    else:
        base["wording"] = {"headline": "h", "why": "w", "cue": "c"}
    base.update(extra)
    return base


def reps(values, view="side_right", field="v"):
    return [{"rep_number": i + 1, "camera_view": view, "data": {field: v}} for i, v in enumerate(values)]


def fired(result):
    return [s["rule"] for s in result["signals"]]


class ShareTests(unittest.TestCase):
    def test_more_than_half_is_required_exactly_half_is_not_enough(self):
        s = spec_with(rule(test={"type": "share_over", "threshold": 5, "skip_first": True}))
        half = evaluate(reps([9, 9, 9, 1, 1, 1]), s)            # first rep skipped (6 reps): considered [9,9,1,1,1], flagged 2 of 5
        self.assertEqual(fired(half), [])
        exactly_half = evaluate(reps([9, 9, 9, 1, 1, 1]), spec_with(rule(test={"type": "share_over", "threshold": 5})))   # nothing skipped: 3 of 6
        self.assertEqual(fired(exactly_half), [])
        most = evaluate(reps([1, 9, 9, 9, 1, 1]), s)            # considered [9,9,9,1,1]: 3 of 5
        self.assertEqual(fired(most), ["r"])
        self.assertEqual(most["signals"][0]["reps_flagged"], [2, 3, 4])

    def test_over_includes_the_threshold_and_under_excludes_it(self):
        over = spec_with(rule(test={"type": "share_over", "threshold": 5}))
        under = spec_with(rule(test={"type": "share_under", "threshold": 5}))
        self.assertEqual(fired(evaluate(reps([5, 5, 5, 5, 5]), over)), ["r"])
        self.assertEqual(fired(evaluate(reps([5, 5, 5, 5, 5]), under)), [])
        self.assertEqual(fired(evaluate(reps([4.9] * 5), under)), ["r"])

    def test_the_first_rep_is_skipped_only_when_asked_and_only_in_longer_sets(self):
        skip = spec_with(rule(test={"type": "share_over", "threshold": 5, "skip_first": True, "min_with_data": 4}))
        keep = spec_with(rule(test={"type": "share_over", "threshold": 5, "min_with_data": 4}))
        warmup_only = [9, 1, 1, 1, 1, 1]          # the only high rep is the first one
        self.assertEqual(evaluate(reps(warmup_only), skip)["signals"], [])
        five = [9, 9, 9, 1, 1]                    # five reps: nothing is skipped
        self.assertEqual(fired(evaluate(reps(five), skip)), ["r"])
        self.assertEqual(evaluate(reps([9, 9, 9, 1, 1, 1]), keep)["signals"], [])     # 3 of 6 is not more than half
        self.assertEqual(fired(evaluate(reps([9, 9, 9, 9, 1, 1]), keep)), ["r"])

    def test_it_needs_enough_reps_with_a_value(self):
        s = spec_with(rule())
        self.assertEqual(evaluate(reps([9, 9, 9, None, None]), s)["signals"], [])         # only 3 values
        self.assertEqual(fired(evaluate(reps([9, 9, 9, 9, None]), s)), ["r"])
        s3 = spec_with(rule(test={"type": "share_over", "threshold": 5, "min_with_data": 3}))
        self.assertEqual(fired(evaluate(reps([9, 9, 9, None, None]), s3)), ["r"])

    def test_min_flagged_stops_a_one_off(self):
        s = spec_with(rule(test={"type": "share_over", "threshold": 5, "min_with_data": 1, "min_flagged": 2}, requires_enough_reps=False))
        self.assertEqual(evaluate(reps([9]), s)["signals"], [])
        self.assertEqual(fired(evaluate(reps([9, 9, 1]), s)), ["r"])

    def test_between_and_the_typical_value(self):
        s = spec_with(rule(kind="went_well", test={"type": "share_between", "min": 1.5, "max": 4.5, "typical_within": True}))
        self.assertEqual(fired(evaluate(reps([2, 2, 2, 2, 9]), s)), ["r"])
        self.assertEqual(evaluate(reps([2, 2, 9, 9, 9]), s)["signals"], [])
        loose = spec_with(rule(kind="went_well", test={"type": "share_between", "min": 1.5, "max": 4.5}))
        self.assertEqual(fired(evaluate(reps([2, 2, 2, 9, 9]), loose)), ["r"])


class TrendTests(unittest.TestCase):
    GROWTH = {"type": "growth_vs_start", "baseline_reps": 3, "growth": 5, "min_with_data": 4, "min_flagged": 2}

    def test_growth_compares_the_later_reps_with_the_persons_own_start(self):
        s = spec_with(rule(test=self.GROWTH))
        out = evaluate(reps([40, 40, 40, 40, 50, 50, 50, 50]), s)
        self.assertEqual(fired(out), ["r"])
        self.assertEqual(out["signals"][0]["reps_flagged"], [5, 6, 7, 8])
        self.assertEqual(out["signals"][0]["numbers"]["growth"], 10.0)
        self.assertEqual(evaluate(reps([40] * 8), s)["signals"], [])
        self.assertEqual(evaluate(reps([50] * 8), s)["signals"], [])           # high from the start is not growth

    def test_in_a_five_rep_set_the_later_reps_never_include_the_start(self):
        s = spec_with(rule(test=self.GROWTH))
        out = evaluate(reps([40, 40, 40, 52, 52]), s)
        self.assertEqual(fired(out), ["r"])
        self.assertEqual(out["signals"][0]["reps_flagged"], [4, 5])
        self.assertEqual(evaluate(reps([40, 40, 52, 40, 40]), s)["signals"], [])   # a bump inside the first 3 reps is not "later"

    def test_steady_is_praise_when_nothing_grew(self):
        s = spec_with(rule(kind="went_well", test={"type": "steady_vs_start", "baseline_reps": 3, "growth_max": 2, "margin": 4, "min_with_data": 4}))
        out = evaluate(reps([30, 31, 30, 30, 31, 33, 30]), s)
        self.assertEqual(fired(out), ["r"])
        self.assertEqual(out["signals"][0]["reps_flagged"], [1, 2, 3, 4, 5, 6, 7])  # the start is 30; every rep is within 4 of it (the highest is 33)
        self.assertEqual(evaluate(reps([30, 30, 30, 36, 36, 36, 36]), s)["signals"], [])

    DROP = {"type": "drop_over_thirds", "drop": 0.3, "last_over_first_max": 0.75, "typical_min": 0.6, "min_with_data": 3}

    def test_a_drop_across_the_set(self):
        s = spec_with(rule(measure="z", test=self.DROP))
        out = evaluate(reps([1.4, 1.4, 1.3, 1.2, 0.8, 0.8], field="z"), s)
        self.assertEqual(fired(out), ["r"])
        self.assertEqual(out["signals"][0]["reps_flagged"], [5, 6])
        self.assertEqual(evaluate(reps([1.0] * 6, field="z"), s)["signals"], [])
        self.assertEqual(evaluate(reps([0.4, 0.4, 0.3, 0.3, 0.2, 0.2], field="z"), s)["signals"], [])   # already very quick: "typical_min" stops it


class StructureTests(unittest.TestCase):
    def test_views_gate_rules_and_any_matches_everything(self):
        side_only = spec_with(rule(views=("side",)))
        anywhere = spec_with(rule(views=("any",)))
        data = [9, 9, 9, 9, 9]
        self.assertEqual(fired(evaluate(reps(data, "side_left"), side_only)), ["r"])
        self.assertEqual(evaluate(reps(data, "front"), side_only)["signals"], [])
        self.assertEqual(evaluate(reps(data, "angled"), side_only)["signals"], [])
        self.assertEqual(fired(evaluate(reps(data, "front"), anywhere)), ["r"])

    def test_the_most_common_view_wins(self):
        r = reps([9] * 5, "side_right")
        r[0]["camera_view"] = "front"
        self.assertEqual(evaluate(r, spec_with(rule()))["camera_view"], "side_right")

    def test_enough_reps_is_required_unless_the_rule_says_otherwise(self):
        strict = spec_with(rule(test={"type": "share_over", "threshold": 5, "min_with_data": 3}))
        relaxed = spec_with(rule(test={"type": "share_over", "threshold": 5, "min_with_data": 3}, requires_enough_reps=False))
        four = reps([9, 9, 9, 9])
        self.assertFalse(evaluate(four, strict)["enough_reps"])
        self.assertEqual(evaluate(four, strict)["signals"], [])
        self.assertEqual(fired(evaluate(four, relaxed)), ["r"])

    def test_in_a_group_the_first_rule_that_fires_wins_whatever_the_list_order(self):
        low = rule("low", test={"type": "share_under", "threshold": 3}, group="g", group_order=2)
        high = rule("high", test={"type": "share_over", "threshold": 3}, group="g", group_order=1)
        s = spec_with(low, high)                                  # listed low first, but high has the earlier order
        self.assertEqual(fired(evaluate(reps([1, 1, 1, 9, 9, 9, 9, 9, 9]), s)), ["high"])
        self.assertEqual(fired(evaluate(reps([1, 1, 1, 1, 1, 1, 1, 1, 1]), s)), ["low"])
        self.assertEqual(fired(evaluate(reps([1] * 3 + [9] * 3), s)), [])   # neither side holds on more than half (3 of 6 each)

    def test_flags_are_always_present_and_false_unless_they_fire(self):
        s = spec_with(rule("f", kind="flag", test={"type": "share_under", "threshold": 3}, views=("side",)))
        self.assertEqual(evaluate(reps([9] * 5), s)["flags"], {"flag_f": False})
        self.assertEqual(evaluate(reps([1] * 5), s)["flags"], {"flag_f": True})
        self.assertEqual(evaluate(reps([1] * 5, "front"), s)["flags"], {"flag_f": False})      # wrong view: false, not missing
        self.assertEqual(evaluate(reps([1] * 5), s)["signals"], [])                           # a flag is not a signal

    def test_values_at_or_below_valid_above_count_as_missing(self):
        s = spec_with(rule(measure="z", test={"type": "share_under", "threshold": 3, "min_with_data": 4}))
        self.assertEqual(evaluate(reps([0, 0, 0, 1, 1, 1], field="z"), s)["signals"], [])     # zeros are not real values: only 3 usable
        self.assertEqual(fired(evaluate(reps([0, 1, 1, 1, 1, 1], field="z"), s)), ["r"])

    def test_nothing_in_the_set_means_nothing_fires(self):
        out = evaluate([], spec_with(rule()))
        self.assertEqual((out["rep_count"], out["signals"], out["camera_view"], out["enough_reps"]), (0, [], None, False))

    def test_the_result_carries_what_the_app_needs(self):
        out = evaluate(reps([9] * 5), spec_with(rule()))
        self.assertEqual(out["exercise_id"], "test-exercise")
        self.assertEqual(set(out), {"exercise_id", "rep_count", "enough_reps", "camera_view", "flags", "signals", "numbers"})
        self.assertEqual(set(out["signals"][0]), {"kind", "topic", "rule", "reps_flagged", "numbers", "wording"})
        self.assertEqual(out["numbers"]["m"]["valid"], 5)


if __name__ == "__main__":
    unittest.main()
