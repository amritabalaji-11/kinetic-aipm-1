"""Golden tests: 17 real clips, replayed through the coaching rules.

Each clip's per-rep measurements (from the real pipeline, at ORIGINAL speed) are stored in `tests/golden/goblet-squat/reps/<clip>.json`;
`expected.json` says what the rules must say.

Three kinds of expectation, kept apart on purpose:
  - `labelled`: what a human said about the clip (a fault clip must be flagged, a good clip must not be). Always must hold.
  - `proof`: for every rule marked tested in the spec, a clip it fires on and a clip it stays silent on.
  - `snapshot`: what the code said on the day the spec was written. If this changes, either a bug crept in or the rules changed on
    purpose; in the second case update expected.json and the spec in the same commit.
Never use the old `processed_videos` v1-v6 files to make new golden data: they are saved at 3x speed.
"""
import copy
import json
import unittest
from pathlib import Path

from exercises.registry import get_spec
from services.coaching_signals import apply_signals, compute_signals

GOLDEN = Path(__file__).parent / "golden" / "goblet-squat"
EXPECTED = json.loads((GOLDEN / "expected.json").read_text())["clips"]
REPS = {name: json.loads((GOLDEN / "reps" / f"{name}.json").read_text()) for name in EXPECTED}
SPEC = get_spec("goblet-squat")
SEL = SPEC["selection"]


def labels(signals):
    out = {f"{s['kind']}:{s['topic']}" for s in signals["signals"]}
    out |= {f"flag:{name}" for name, on in signals["flags"].items() if on}
    return out


def fired_rule_ids(signals):
    ids = {s["rule"] for s in signals["signals"]}
    ids |= {r["id"] for r in SPEC["rules"] if r["kind"] == "flag" and signals["flags"].get(r["flag"])}
    return ids


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
                self.assertEqual(sig["flags"]["depth_short"], want["depth_short"])
                self.assertEqual(sig["flags"]["depth_very_shallow"], want["depth_very_shallow"])

    def test_true_rep_counts_match(self):
        for name, clip in EXPECTED.items():
            if "true_rep_count" in clip:
                with self.subTest(clip=name):
                    self.assertEqual(len(REPS[name]), clip["true_rep_count"])

    def test_every_clip_in_the_spec_is_in_the_golden_data_and_back(self):
        self.assertEqual({c["id"] for c in SPEC["evidence"]["clips"]}, set(EXPECTED))
        for clip in SPEC["evidence"]["clips"]:
            self.assertEqual(clip["reps"], len(REPS[clip["id"]]), clip["id"])


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


class ProofHolds(unittest.TestCase):
    """The spec marks a rule `tested` only with proof: a clip it fires on and a clip it stays silent on. Check every one."""

    def test_every_proof_entry_holds(self):
        proof = SPEC["evidence"]["proof"]
        self.assertGreaterEqual(len(proof), 5)
        for item in proof:
            with self.subTest(rule=item["rule"]):
                self.assertIn(item["rule"], fired_rule_ids(compute_signals(REPS[item["fires_on"]])), f"{item['rule']} must fire on {item['fires_on']}")
                self.assertNotIn(item["rule"], fired_rule_ids(compute_signals(REPS[item["silent_on"]])), f"{item['rule']} must stay silent on {item['silent_on']}")

    def test_every_tested_rule_has_proof_and_no_draft_rule_does(self):
        proven = {p["rule"] for p in SPEC["evidence"]["proof"]}
        for r in SPEC["rules"]:
            self.assertEqual(r["status"] != "draft", r["id"] in proven, r["id"])


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
        known = set(SEL["work_on_order"]) | set(SEL["went_well_order"])
        for name in EXPECTED:
            with self.subTest(clip=name):
                _, out = self.apply(name)
                for kind in ("went_well", "work_on"):
                    items = out["feedback_items"][kind]
                    self.assertLessEqual(len(items), SEL["max_items_per_list"])
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
        limit = SEL["max_words_per_line"]
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

    def test_what_the_app_reads_later_is_complete(self):
        for name in EXPECTED:
            with self.subTest(clip=name):
                sig, out = self.apply(name)
                s = out["signals"]
                self.assertEqual((s["exercise_id"], s["goal"], s["spec_version"]), ("goblet-squat", "strength", SPEC["identity"]["spec_version"]))
                self.assertIsInstance(s["depth_short"], bool)                       # the frontend reads these two by name
                self.assertIsInstance(s["depth_very_shallow"], bool)
                self.assertEqual(set(s["rules"]), {f"{x['kind']}:{x['topic']}" for x in sig["signals"]})


class FewRepsAndFiveRepSets(unittest.TestCase):
    def test_a_five_rep_cut_of_real_clips_is_enough_and_gives_sensible_results(self):
        for name in ("v5_torso_fault", "v6_torso_good", "amrita_side_12.5"):
            with self.subTest(clip=name):
                cut = compute_signals(REPS[name][:5])
                self.assertTrue(cut["enough_reps"])
                lean = {"work_on:chest_lean", "went_well:chest_lean"}
                self.assertEqual(labels(cut) & lean, labels(compute_signals(REPS[name])) & lean)

    def test_four_reps_is_not_enough_and_gives_at_most_one_item_per_list(self):
        for name in ("v5_torso_fault", "amrita_side_12.5"):
            with self.subTest(clip=name):
                sig = compute_signals(REPS[name][:4])
                self.assertFalse(sig["enough_reps"])
                out = apply_signals({"feedback_items": {}}, copy.deepcopy(sig))
                self.assertLessEqual(len(out["feedback_items"]["work_on"]), 1)
                self.assertLessEqual(len(out["feedback_items"]["went_well"]), 1)

    def test_the_minimum_in_the_spec_is_five(self):
        self.assertEqual(SEL["min_reps"], 5)


if __name__ == "__main__":
    unittest.main()
