"""The validator: a bad spec must fail, with a message that says what is wrong and where."""
import copy
import unittest
from pathlib import Path

from exercises.registry import parse_spec_text
from exercises.validate import validate_spec

SPEC_PATH = Path(__file__).resolve().parents[1] / "exercises" / "goblet-squat" / "spec.md"
BASE = parse_spec_text(SPEC_PATH.read_text(encoding="utf-8"), "goblet-squat spec")


def problems(change, check_files=True):
    spec = copy.deepcopy(BASE)
    change(spec)
    return validate_spec(spec, folder="goblet-squat", check_files=check_files)


def rule(spec, rule_id):
    return next(r for r in spec["rules"] if r["id"] == rule_id)


class ValidatorTests(unittest.TestCase):
    def assertFails(self, change, *words, check_files=True):
        errors = problems(change, check_files)
        self.assertTrue(errors, "the validator accepted a bad spec")
        text = " | ".join(errors).lower()
        for w in words:
            self.assertIn(w.lower(), text, f"expected {w!r} in: {errors}")

    def test_the_shipped_spec_is_valid(self):
        self.assertEqual(validate_spec(copy.deepcopy(BASE), folder="goblet-squat"), [])

    # ---- shape
    def test_a_missing_section(self):
        self.assertFails(lambda s: s.pop("visuals"), "kinetic:visuals", "missing")

    def test_sections_out_of_order(self):
        def swap(s):
            items = list(s.items())
            s.clear()
            for k, v in [items[1], items[0], *items[2:]]:
                s[k] = v
        self.assertFails(swap, "out of order")

    def test_an_unknown_section(self):
        self.assertFails(lambda s: s.update(bonus={}), "unknown section")

    def test_the_id_must_match_the_folder(self):
        errors = validate_spec(copy.deepcopy(BASE), folder="other-folder", check_files=False)
        self.assertTrue(any("must equal the folder" in e for e in errors), errors)

    def test_goal_default_must_be_supported(self):
        self.assertFails(lambda s: s["goal_profiles"].update(default="endurance"), "default goal", "supported")

    def test_a_goal_cannot_be_supported_and_unsupported(self):
        self.assertFails(lambda s: s["goal_profiles"]["unsupported"].update(strength="x"), "both supported and unsupported")

    def test_an_override_must_point_at_something_real(self):
        self.assertFails(lambda s: s["goal_profiles"]["profiles"]["strength"]["overrides"].update({"rules[ghost].test.threshold": 1}), "does not point at anything")

    # ---- rules
    def test_unknown_test_type(self):
        self.assertFails(lambda s: rule(s, "lean_high")["test"].update(type="vibes"), "'type'")

    def test_a_test_needs_its_parameters(self):
        self.assertFails(lambda s: rule(s, "lean_high")["test"].pop("threshold"), "needs 'threshold'")

    def test_a_test_rejects_unknown_parameters(self):
        self.assertFails(lambda s: rule(s, "lean_high")["test"].update(sparkle=1), "unknown field 'sparkle'")

    def test_a_rule_must_use_a_known_measure(self):
        self.assertFails(lambda s: rule(s, "lean_high").update(measure="no_such_measure"), "measure id")

    def test_duplicate_rule_ids(self):
        self.assertFails(lambda s: rule(s, "lean_growth").update(id="lean_high"), "duplicate rule id")

    def test_a_work_on_rule_needs_all_three_lines(self):
        self.assertFails(lambda s: rule(s, "lean_high")["wording"].pop("cue"), "'cue' is missing")

    def test_a_flag_says_nothing(self):
        self.assertFails(lambda s: rule(s, "depth_short").update(wording={"headline": "x"}), "flag says nothing")

    def test_a_flag_needs_a_name(self):
        self.assertFails(lambda s: rule(s, "depth_short").pop("flag"), "'flag' is missing")

    def test_forbidden_phrases_are_refused_in_wording(self):
        for phrase in ("Stay tall through the lift.", "Keep your chest up.", "You should go deeper.", "Your back is rounding."):
            self.assertFails(lambda s, p=phrase: rule(s, "lean_high")["wording"].update(headline=p), "forbidden phrase")

    def test_numbers_are_refused_in_wording(self):
        self.assertFails(lambda s: rule(s, "lean_high")["wording"].update(headline="You leaned 45 degrees."), "number")

    def test_wording_must_be_short(self):
        self.assertFails(lambda s: rule(s, "lean_high")["wording"].update(why="word " * 20), "words; the limit")

    def test_group_needs_an_order_and_orders_are_unique(self):
        self.assertFails(lambda s: rule(s, "lean_high").pop("group_order"), "go together")
        self.assertFails(lambda s: rule(s, "lean_growth").update(group_order=1), "already has a rule at position")

    def test_a_topic_in_both_lists_must_share_a_group(self):
        def split(s):
            r = rule(s, "lean_steady")
            r.pop("group"), r.pop("group_order")
        self.assertFails(split, "share one 'group'")

    # ---- status and proof
    def test_tested_needs_proof(self):
        self.assertFails(lambda s: s["evidence"]["proof"].pop(0), "marked tested but has no entry")

    def test_validated_needs_a_trainer_signoff(self):
        self.assertFails(lambda s: rule(s, "lean_high").update(status="validated"), "trainer_signoff is null")

    def test_proof_means_tested_not_draft(self):
        self.assertFails(lambda s: rule(s, "lean_high").update(status="draft"), "should be marked tested")

    def test_proof_must_name_listed_clips(self):
        self.assertFails(lambda s: s["evidence"]["proof"][0].update(fires_on="no_such_clip"), "listed in evidence.clips")

    # ---- selection
    def test_every_topic_that_can_be_shown_needs_a_place_in_the_order(self):
        self.assertFails(lambda s: s["selection"]["work_on_order"].remove("knee_tracking"), "could never be shown")

    def test_an_ordered_topic_needs_a_rule(self):
        self.assertFails(lambda s: s["selection"]["went_well_order"].append("posture"), "has no went_well rule")

    # ---- comparison
    def test_a_pair_needs_a_right_rep(self):
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"].pop("right"), "'right' is missing")

    def test_a_comparison_needs_a_picture(self):
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"].pop("picture"), "'picture' is missing")

    def test_praise_has_no_before_after(self):
        self.assertFails(lambda s: rule(s, "lean_steady").update(comparison=copy.deepcopy(rule(s, "lean_high")["comparison"])), "praise has no before/after")

    def test_an_arrow_needs_a_known_landmark_and_a_short_label(self):
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"]["arrow"]["anchor"].update(landmarks=["elbow", "hip"]), "landmarks")
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"]["arrow"].update(label="A very long label indeed"), "1-3 word label")

    def test_picks_and_pools_come_from_the_vocabulary(self):
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"]["left"].update(pick="best_vibes"), "pick")
        self.assertFails(lambda s: rule(s, "lean_high")["comparison"]["left"].update(pool="everyone"), "pool")

    # ---- the rest
    def test_the_changelog_must_end_at_the_spec_version(self):
        self.assertFails(lambda s: s["identity"].update(spec_version="9.9.9"), "changelog")

    def test_golden_data_must_exist_for_every_clip(self):
        self.assertFails(lambda s: s["evidence"]["clips"].append({"id": "ghost", "view": "side", "reps": 8, "label": None, "source_recording": "x"}), "ghost")

    def test_the_running_backend_does_not_need_the_tests_folder(self):
        """At run time the file checks are skipped, so a deploy that leaves the tests out still starts."""
        errors = problems(lambda s: s["evidence"].update(golden_dir="tests/golden/not-shipped"), check_files=False)
        self.assertEqual(errors, [])
        self.assertTrue(problems(lambda s: s["evidence"].update(golden_dir="tests/golden/not-shipped"), check_files=True))

    def test_screen_text_may_not_say_forbidden_things(self):
        self.assertFails(lambda s: s["screen"]["reminders"].append("Keep your chest up."), "forbidden phrase")

    def test_measure_fields_look_like_per_rep_paths(self):
        self.assertFails(lambda s: s["measures"][0].update(field="lean"), "per-rep path")

    def test_target_reps_cannot_go_below_the_minimum(self):
        self.assertFails(lambda s: s["capture"].update(target_reps=[3, 8]), "below selection.min_reps")


if __name__ == "__main__":
    unittest.main()
