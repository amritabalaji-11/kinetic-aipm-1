"""Which two reps the before/after video shows, and which mode. Built from synthetic reps so the rules are pinned exactly."""
import unittest

from services.comparison import FPS, PAD_S, choose_comparison


def make_reps(n, lean=None, lowering=None, travel=None, knee_ratio=None, view="side_right", partial_last=False):
    reps = []
    for i in range(n):
        rep = {"rep_number": i + 1, "camera_view": view, "partial": partial_last and i == n - 1,
               "back_data": {"back_angle_at_bottom": (lean or [40] * n)[i]},
               "tempo_data": {"eccentric": (lowering or [1.2] * n)[i]},
               "ankle_data": {"dorsiflexion_at_bottom": 28},
               "depth_data": {"hip_below_knee_ratio": 0.05},
               "stability_data": {"knee_ankle_ratio_at_bottom": (knee_ratio or [1.0] * n)[i], "knee_travel": (travel or [0.6] * n)[i]}}
        reps.append(rep)
    return {"reps": reps}


def make_frames(n):
    frames = []
    for r in range(1, n + 1):
        start = 100 * r
        for k in range(61):
            frames.append({"rep_number": r, "frame_index": start + k, "knee_angle": abs(k - 30) + 60, "norm_pose": None})
    return frames


def coaching(topic=None, lean_mode=None):
    out = {"feedback_items": {"work_on": [{"topic": topic, "reps_flagged": []}] if topic else []}, "signals": {}}
    if lean_mode:
        out["signals"]["numbers"] = {"lean": {"mode": lean_mode}}
    return out


class ChooseComparison(unittest.TestCase):
    def test_nothing_to_fix_means_no_comparison(self):
        self.assertIsNone(choose_comparison(coaching(), make_reps(8), make_frames(8)))

    def test_too_few_counted_reps_means_no_comparison_and_partial_reps_do_not_count(self):
        self.assertIsNone(choose_comparison(coaching("chest_lean"), make_reps(3), make_frames(3)))
        self.assertIsNone(choose_comparison(coaching("chest_lean"), make_reps(4, partial_last=True), make_frames(4)))

    def test_lean_that_grows_shows_a_typical_early_rep_against_the_most_leaned(self):
        lean = [38, 40, 40, 41, 44, 48, 52, 55]
        out = choose_comparison(coaching("chest_lean", "growth"), make_reps(8, lean=lean), make_frames(8))
        self.assertEqual((out["mode"], out["label_left"], out["label_right"]), ("pair", "How it was", "How it is now"))
        self.assertIn(out["left"]["rep"], (2, 3, 4))       # early reps; the first is skipped as a warm-up
        self.assertEqual(out["right"]["rep"], 8)           # the most-leaned rep
        self.assertEqual(out["arrow_label"], "Torso lean")

    def test_a_lean_that_is_high_from_the_start_shows_least_against_most_leaned(self):
        lean = [30, 48, 50, 39, 51, 56, 44, 52]
        out = choose_comparison(coaching("chest_lean", "high"), make_reps(8, lean=lean), make_frames(8))
        self.assertEqual((out["label_left"], out["label_right"]), ("Your best rep", "Leaning furthest"))
        self.assertEqual(out["left"]["rep"], 4)            # 39: the least-leaned rep after rep 1 (rep 1 at 30 is skipped)
        self.assertEqual(out["right"]["rep"], 6)           # 56

    def test_dropping_into_the_squat_shows_the_same_rep_at_real_speed_and_slowed(self):
        out = choose_comparison(coaching("lowering_speed"), make_reps(8, lowering=[0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5]), make_frames(8))
        self.assertEqual(out["mode"], "slow")
        self.assertEqual(out["left"]["rep"], out["right"]["rep"])
        self.assertEqual(out["slow"]["target_s"], 2.0)

    def test_knees_pair_needs_one_rep_to_move_the_knees_at_least_one_and_a_half_times_as_much(self):
        calm = choose_comparison(coaching("knee_tracking"), make_reps(6, view="front", travel=[0.6, 0.5, 0.6, 0.65, 0.6, 0.7]), make_frames(6))
        self.assertEqual(calm["mode"], "single")           # 0.7 / 0.5 = 1.4: nothing clearly steadier to compare with
        shaky = choose_comparison(coaching("knee_tracking"), make_reps(6, view="front", travel=[0.6, 0.4, 0.6, 0.65, 0.6, 0.8]), make_frames(6))
        self.assertEqual(shaky["mode"], "pair")
        self.assertEqual((shaky["left"]["rep"], shaky["right"]["rep"]), (2, 6))
        self.assertEqual(shaky["arrow_label"], "Knees in")

    def test_times_are_seconds_on_the_videos_own_timeline(self):
        out = choose_comparison(coaching("lowering_speed"), make_reps(8), make_frames(8))
        rep = out["left"]["rep"]
        first, last = 100 * rep, 100 * rep + 60
        self.assertAlmostEqual(out["left"]["start_s"], round(first / FPS - PAD_S, 2), places=2)
        self.assertAlmostEqual(out["left"]["end_s"], round(last / FPS + PAD_S, 2), places=2)
        self.assertAlmostEqual(out["left"]["bottom_s"], round((first + 30) / FPS, 2), places=2)


if __name__ == "__main__":
    unittest.main()
