"""Drift tests: numbers and words that live in code the spec does not drive yet must still match the spec.

The coaching rules and the before/after chooser read the spec directly, so they cannot drift. The rep counter, the trackers, the
frontend and the prompt keep their own copies; these tests fail when a copy no longer matches the spec. If one fails, change the spec
and the copy together (and say so in the commit).
"""
import re
import unittest
from pathlib import Path

from exercises.registry import get_spec

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
SPEC = get_spec("goblet-squat")
SRC = REPO / "frontend" / "src"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def number_after(name, text):
    match = re.search(rf"\b{name}\s*=\s*(-?\d+(?:\.\d+)?)", text)
    assert match, f"{name} not found"
    return float(match.group(1))


def rule(rule_id):
    return next(r for r in SPEC["rules"] if r["id"] == rule_id)


class RepCountingMatchesSpec(unittest.TestCase):
    def test_rep_counter_thresholds(self):
        from mediapipe_code.mp_utils.trackers import traker_configuration as cfg
        want = SPEC["rep_counting"]["thresholds"]
        self.assertEqual(cfg.THRESHOLD_DOWN, want["threshold_down"])
        self.assertEqual(cfg.THRESHOLD_UP, want["threshold_up"])
        self.assertEqual(cfg.MIN_BOTTOM_HOLD, want["min_bottom_hold"])
        self.assertEqual(cfg.THRESHOLD_DEEP, want["threshold_deep"])
        self.assertEqual(cfg.TURNAROUND_MIN_PEAK, want["turnaround_min_peak"])
        self.assertEqual(cfg.TURNAROUND_DROP, want["turnaround_drop"])
        self.assertEqual(cfg.ASCENT_RISE, want["ascent_rise"])

    def test_setup_and_pick_up_test(self):
        source = read(BACKEND / "mediapipe_code" / "landmark_framework.py")
        want = SPEC["rep_counting"]["setup_outlier"]
        self.assertEqual(number_after("LEAN_OUTLIER_DEG", source), want["lean_deg"])
        self.assertEqual(number_after("KNEE_OUTLIER_DEG", source), want["knee_deg"])
        self.assertEqual(number_after("HANDS_OUTLIER", source), want["hands_share"])

    def test_ankle_tracker_agrees_the_good_line_is_where_the_spec_puts_it(self):
        source = read(BACKEND / "mediapipe_code" / "mp_utils" / "trackers" / "exercise_trackers.py")
        self.assertIn(f"dorsiflexion_at_bottom >= {int(rule('ankle_good')['test']['threshold'])}:", source)

    def test_the_measures_point_at_fields_the_pipeline_really_writes(self):
        """A measure's field must exist in a real analysed rep, or its rules would silently never fire."""
        import json
        sample = json.loads((BACKEND / "tests" / "golden" / "goblet-squat" / "reps" / "v5_torso_fault.json").read_text())[0]
        front = json.loads((BACKEND / "tests" / "golden" / "goblet-squat" / "reps" / "v3_knee_fault.json").read_text())[0]
        for m in SPEC["measures"]:
            section, key = m["field"].split(".")
            source = front if "front" in m["views"] else sample
            self.assertIn(key, source.get(section, {}), f"{m['id']}: {m['field']} is not in the per-rep data")


class FrontendMatchesSpec(unittest.TestCase):
    def test_minimum_reps(self):
        want = SPEC["selection"]["min_reps"]
        self.assertEqual(number_after("MIN_REPS", read(SRC / "utils" / "analysisRules.js")), want)
        self.assertEqual(SPEC["capture"]["target_reps"][0], want)

    def test_the_filming_tips_say_what_the_spec_says(self):
        tips = read(SRC / "components" / "FilmingTips.jsx")
        for tip in SPEC["capture"]["tips"]:
            self.assertIn(tip["bold"], tips, tip["bold"])
            self.assertIn(tip["why"], tips, tip["why"])

    def test_the_front_view_note(self):
        self.assertIn(SPEC["capture"]["view_notes"]["front"], read(SRC / "pages" / "ResultsPage.jsx"))

    def test_quick_lowering_line(self):
        self.assertEqual(number_after("QUICK_BELOW", read(SRC / "utils" / "feedbackItems.js")), rule("lowering_quick")["test"]["threshold"])

    def test_freeze_at_the_bottom(self):
        self.assertEqual(number_after("HOLD_S", read(SRC / "components" / "ComparisonPlayer.jsx")), SPEC["visuals"]["freeze_seconds"])

    def test_fixed_reminder_lines_and_depth_cards(self):
        source = read(SRC / "utils" / "feedbackItems.js")
        for line in [*SPEC["screen"]["reminders"], SPEC["screen"]["pain_line"]]:
            self.assertIn(line, source, line)
        for card in SPEC["screen"]["depth_cards"].values():
            for text in card.values():
                self.assertIn(text, source, text)

    def test_the_rep_error_messages_ask_for_the_minimum_the_screen_asks_for(self):
        source = read(SRC / "hooks" / "useSSEStream.js")
        want = str(SPEC["selection"]["min_reps"])
        for code in ("insufficient_reps", "VIDEO_TOO_SHORT", "NO_REPS_DETECTED"):
            line = next(l for l in source.splitlines() if l.strip().startswith(f"{code}:"))
            self.assertIn(f"at least {want}", line, code)


class PromptAndReferenceMatchSpec(unittest.TestCase):
    def test_prompt_lists_every_topic_the_spec_can_produce(self):
        prompt = read(BACKEND / "prompts" / "haiku_call_1_system.txt")
        topic_line = next(line for line in prompt.splitlines() if line.startswith("- Topics:"))
        topics = {r["topic"] for r in SPEC["rules"] if r["kind"] in ("work_on", "went_well")}
        for topic in topics:
            self.assertIn(f"`{topic}`", topic_line, topic)

    def test_reference_file_exists(self):
        stem = SPEC["identity"]["reference_file_stem"]
        self.assertTrue((BACKEND / "coaching_references" / f"{stem}_coaching_reference.md").exists())

    def test_every_catalogue_variant_is_in_the_catalogue(self):
        catalogue = read(BACKEND / "db" / "exercise_catalog.py")
        for variant in SPEC["identity"]["equipment_variants"]:
            self.assertIn(f'"{variant["catalog_id"]}"', catalogue, variant)
            self.assertIn('"goblet-squat"', catalogue)


if __name__ == "__main__":
    unittest.main()
