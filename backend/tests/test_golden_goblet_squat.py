"""Golden tests: 17 real clips, replayed through the coaching rules.

Each clip's per-rep measurements (from the real pipeline, at ORIGINAL speed) are stored in
`tests/golden/goblet-squat/reps/<clip>.json`; `expected.json` says what the rules must say.

Two kinds of expectation, kept apart on purpose:
  - `labelled`: what a human said about the clip (a fault clip must be flagged, a good clip must not be). Always must hold.
  - `snapshot`: what the code said on the day the spec was written. If this changes, either a bug crept in or the rules
    changed on purpose; in the second case update expected.json and the spec in the same commit.
Never use the old `processed_videos` v1-v6 files to make new golden data: they are saved at 3x speed.
"""
import copy
import json
import re
import unittest
from pathlib import Path

from exercises.registry import get_spec
from services.coaching_signals import apply_signals, compute_signals

GOLDEN = Path(__file__).parent / "golden" / "goblet-squat"
EXPECTED = json.loads((GOLDEN / "expected.json").read_text())["clips"]
REPS = {name: json.loads((GOLDEN / "reps" / f"{name}.json").read_text()) for name in EXPECTED}
SPEC = get_spec("goblet-squat")


def labels(signals):
    out = {f"{s['kind']}:{s['topic']}" for s in signals["signals"]}
    if signals["depth_short"]:
        out.add("flag:depth_short")
    if signals["depth_very_shallow"]:
        out.add("flag:depth_very_shallow")
    return out


class GoldenSnapshot(unittest.TestCase):
    def test_every_clip_gives_the_recorded_result(self):
        for name, clip in EXPECTED.items():
            with self.subTest(clip=name):
                sig = compute_signals(REPS[name])
                want = clip["snapshot"]
                self.assertEqual(sig["rep_count"], want["rep_count"])
                self.assertEqual(sig["enough_reps"], want["enough_reps"])
                self.assertEqual(sig["camera_view"], want["camera_view"])
                self.assertEqual(sorted(f"{s['kind']}:{s['topic']}" for s in sig["signals"]), want["allowed"])
                self.assertEqual({f"{s['kind']}:{s['topic']}": len(s["reps_flagged"]) for s in sig["signals"]}, want["reps_flagged_counts"])
                self.assertEqual(sig["depth_short"], want["depth_short"])
                self.assertEqual(sig["depth_very_shallow"], want["depth_very_shallow"])

    def test_true_rep_counts_match(self):
        for name, clip in EXPECTED.items():
            if "true_rep_count" in clip:
                with self.subTest(clip=name):
                    self.assertEqual(len(REPS[name]), clip["true_rep_count"])


class LabelledClips(unittest.TestCase):
    """What a human said about the clip. These must always hold."""

    def test_fault_clips_are_flagged_and_good_clips_are_not(self):
        checked = 0
        for name, clip in EXPECTED.items():
            if "labelled" not in clip:
                continue
            got = labels(compute_signals(REPS[name]))
            for item in clip["labelled"]["must"]:
                checked += 1
                self.assertIn(item, got, f"{name} ({clip['human_label']}) must give {item}")
            for item in clip["labelled"]["must_not"]:
                checked += 1
                self.assertNotIn(item, got, f"{name} ({clip['human_label']}) must not give {item}")
        self.assertGreaterEqual(checked, 10)


class EngineRules(unittest.TestCase):
    """The rules every exercise shares, checked on all 17 clips."""

    def apply(self, name):
        sig = compute_signals(REPS[name])
        ai = {"feedback_items": {"went_well": [{"topic": "depth", "headline": "x " * 30, "reps_flagged": [99]}],
                                 "work_on": [{"topic": "made_up", "headline": "y", "why": "z", "cue": "c"}]}}
        return sig, apply_signals(copy.deepcopy(ai), copy.deepcopy(sig))

    def test_one_topic_in_one_list_only(self):
        for name in EXPECTED:
            with self.subTest(clip=name):
                _, out = self.apply(name)
                well = {i["topic"] for i in out["feedback_items"]["went_well"]}
                work = {i["topic"] for i in out["feedback_items"]["work_on"]}
                self.assertFalse(well & work)

    def test_never_more_than_two_per_list_and_never_a_made_up_topic(self):
        known = set(SPEC["rules"]["work_on_order"]) | set(SPEC["rules"]["went_well_order"])
        for name in EXPECTED:
            with self.subTest(clip=name):
                _, out = self.apply(name)
                for kind in ("went_well", "work_on"):
                    items = out["feedback_items"][kind]
                    self.assertLessEqual(len(items), SPEC["rules"]["max_items_per_list"])
                    for it in items:
                        self.assertIn(it["topic"], known)

    def test_a_one_off_is_never_flagged_or_praised(self):
        """Every item rests on at least 2 reps. (Lean growth is a trend over the later reps and pace drift compares thirds,
        so 'more than half of all reps' is not the test for those; each rule's own majority test is pinned by the snapshot.)"""
        for name in EXPECTED:
            sig = compute_signals(REPS[name])
            for s in sig["signals"]:
                with self.subTest(clip=name, signal=f"{s['kind']}:{s['topic']}"):
                    self.assertGreaterEqual(len(s["reps_flagged"]), 2)

    def test_ai_wording_that_is_too_long_is_replaced_with_the_short_wording(self):
        limit = SPEC["rules"]["max_words_per_line"]
        for name in EXPECTED:
            with self.subTest(clip=name):
                _, out = self.apply(name)
                for kind in ("went_well", "work_on"):
                    for it in out["feedback_items"][kind]:
                        for field in ("headline", "why", "cue"):
                            if field in it:
                                self.assertLessEqual(len(str(it[field]).split()), limit, f"{it['topic']}.{field}")

    def test_rep_lists_come_from_the_code_not_the_ai(self):
        for name in EXPECTED:
            with self.subTest(clip=name):
                sig, out = self.apply(name)
                real = {s["topic"]: s["reps_flagged"] for s in sig["signals"]}
                for kind in ("went_well", "work_on"):
                    for it in out["feedback_items"][kind]:
                        self.assertEqual(it["reps_flagged"], real[it["topic"]])


class WordingRules(unittest.TestCase):
    FORBIDDEN = ("stay tall", "chest up", "upright", "rounding", "go deeper", "deeper", "valgus", "dorsiflexion", "eccentric")

    def test_no_forbidden_phrases_numbers_or_rep_numbers_in_any_wording(self):
        for kind, topics in SPEC["wording"].items():
            for topic, words in topics.items():
                for field, text in words.items():
                    with self.subTest(topic=f"{kind}.{topic}.{field}"):
                        low = text.lower()
                        for bad in self.FORBIDDEN:
                            self.assertNotIn(bad, low)
                        self.assertIsNone(re.search(r"\d", text), "no numbers in user-facing wording")
                        self.assertLessEqual(len(text.split()), SPEC["rules"]["max_words_per_line"])


class FewRepsAndFiveRepSets(unittest.TestCase):
    def test_a_five_rep_cut_of_real_clips_is_enough_and_gives_sensible_results(self):
        for name in ("v5_torso_fault", "v6_torso_good", "amrita_side_12.5"):
            with self.subTest(clip=name):
                cut = compute_signals(REPS[name][:5])
                self.assertTrue(cut["enough_reps"])
                self.assertEqual(labels(cut) & {"work_on:chest_lean", "went_well:chest_lean"}, labels(compute_signals(REPS[name])) & {"work_on:chest_lean", "went_well:chest_lean"})

    def test_four_reps_is_not_enough_and_gives_at_most_one_item_per_list(self):
        for name in ("v5_torso_fault", "amrita_side_12.5"):
            with self.subTest(clip=name):
                sig = compute_signals(REPS[name][:4])
                self.assertFalse(sig["enough_reps"])
                out = apply_signals({"feedback_items": {}}, copy.deepcopy(sig))
                self.assertLessEqual(len(out["feedback_items"]["work_on"]), 1)
                self.assertLessEqual(len(out["feedback_items"]["went_well"]), 1)

    def test_the_minimum_in_the_spec_is_five(self):
        self.assertEqual(SPEC["rules"]["min_reps"], 5)
        self.assertEqual(SPEC["screen"]["frontend_min_reps"], SPEC["rules"]["min_reps"])


if __name__ == "__main__":
    unittest.main()
