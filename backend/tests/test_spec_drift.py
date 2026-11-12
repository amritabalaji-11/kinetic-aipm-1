"""Drift tests: numbers that live in code the spec does not drive yet must still match the spec.

The coaching rules and the before/after chooser read the spec directly, so they cannot drift. The rep counter, the trackers,
the frontend and the prompt keep their own copies; these tests fail when a copy no longer matches the spec. If one fails,
change the spec and the copy together (and say so in the commit).
"""
import re
import unittest
from pathlib import Path

from exercises.registry import get_spec

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
SPEC = get_spec("goblet-squat")


def read(path):
    return Path(path).read_text(encoding="utf-8")


def number_after(name, text):
    match = re.search(rf"\b{name}\s*=\s*(-?\d+(?:\.\d+)?)", text)
    assert match, f"{name} not found"
    return float(match.group(1))


class RepCountingMatchesSpec(unittest.TestCase):
    def test_rep_counter_thresholds(self):
        from mediapipe_code.mp_utils.trackers import traker_configuration as cfg
        want = SPEC["rep_counting"]
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
        self.assertIn(f"dorsiflexion_at_bottom >= {int(SPEC['rules']['ankle']['good_deg'])}:", source)


class FrontendMatchesSpec(unittest.TestCase):
    def test_minimum_reps(self):
        want = SPEC["rules"]["min_reps"]
        self.assertEqual(number_after("MIN_REPS", read(REPO / "frontend/src/utils/analysisRules.js")), want)
        self.assertEqual(SPEC["screen"]["frontend_min_reps"], want)
        self.assertIn(f"{want} to ", read(REPO / "frontend/src/components/FilmingTips.jsx"))
        self.assertIn(f"at least {want},", read(REPO / "frontend/src/components/FilmingTips.jsx"))

    def test_quick_lowering_line(self):
        self.assertEqual(number_after("QUICK_BELOW", read(REPO / "frontend/src/utils/feedbackItems.js")), SPEC["rules"]["lowering"]["quick_seconds"])
        self.assertEqual(SPEC["screen"]["frontend_quick_below_seconds"], SPEC["rules"]["lowering"]["quick_seconds"])

    def test_freeze_at_the_bottom(self):
        self.assertEqual(number_after("HOLD_S", read(REPO / "frontend/src/components/ComparisonPlayer.jsx")), SPEC["screen"]["freeze_seconds"])

    def test_fixed_reminder_lines(self):
        source = read(REPO / "frontend/src/utils/feedbackItems.js")
        for line in SPEC["reminders"]:
            self.assertIn(line, source, line)


class PromptAndReferenceMatchSpec(unittest.TestCase):
    def test_prompt_lists_every_topic_the_spec_can_produce(self):
        prompt = read(BACKEND / "prompts" / "haiku_call_1_system.txt")
        topic_line = next(line for line in prompt.splitlines() if line.startswith("- Topics:"))
        topics = set(SPEC["rules"]["work_on_order"]) | set(SPEC["rules"]["went_well_order"])
        for topic in topics:
            self.assertIn(f"`{topic}`", topic_line, topic)

    def test_reference_file_exists(self):
        self.assertTrue((BACKEND / "coaching_references" / f"{SPEC['reference_file_stem']}_coaching_reference.md").exists())

    def test_every_topic_with_an_arrow_label_is_a_known_topic(self):
        topics = set(SPEC["rules"]["work_on_order"]) | set(SPEC["rules"]["went_well_order"]) | {"depth"}
        self.assertTrue(set(SPEC["comparison"]["arrow_labels"]) <= topics)


if __name__ == "__main__":
    unittest.main()
