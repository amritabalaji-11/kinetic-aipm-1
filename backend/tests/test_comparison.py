"""Which two reps the before/after video shows, and where the arrow goes. Built from synthetic reps so the rules are pinned exactly."""
import unittest
from types import SimpleNamespace

from exercises.registry import get_spec
from services.comparison import FPS, choose_comparison
from services.rep_picking import anchor_point

SPEC = get_spec("goblet-squat")
PAD = SPEC["visuals"]["pad_seconds"]


def make_pose(**points):
    """33 landmarks; the ones named by index in `points` are set, the rest sit at the centre."""
    pose = [SimpleNamespace(x=0.5, y=0.5) for _ in range(33)]
    for idx, (x, y) in points.items():
        pose[int(idx.lstrip("p"))] = SimpleNamespace(x=x, y=y)
    return pose


def make_reps(n, lean=None, lowering=None, travel=None, knee_ratio=None, ankle=None, depth=None, view="side_right", partial_last=False):
    reps = []
    for i in range(n):
        reps.append({
            "rep_number": i + 1, "camera_view": view, "partial": partial_last and i == n - 1,
            "back_data": {"back_angle_at_bottom": (lean or [40] * n)[i]},
            "tempo_data": {"eccentric": (lowering or [1.2] * n)[i]},
            "ankle_data": {"dorsiflexion_at_bottom": (ankle or [28] * n)[i]},
            "depth_data": {"hip_below_knee_ratio": (depth or [0.05] * n)[i]},
            "stability_data": {"knee_ankle_ratio_at_bottom": (knee_ratio or [1.0] * n)[i], "knee_travel": (travel or [0.6] * n)[i]},
        })
    return {"reps": reps}


def make_frames(n, pose=None):
    frames = []
    for r in range(1, n + 1):
        for k in range(61):
            frames.append({"rep_number": r, "frame_index": 100 * r + k, "knee_angle": abs(k - 30) + 60, "norm_pose": pose})
    return frames


def coaching(work_on=None, rule=None, flags=()):
    """What the pipeline stores after the rules ran: the first work-on item, which rule produced it, and the flags that fired."""
    out = {"feedback_items": {"work_on": [{"topic": work_on, "reps_flagged": []}] if work_on else []}, "signals": {"rules": {}, "fired_flags": list(flags)}}
    if work_on:
        out["signals"]["rules"][f"work_on:{work_on}"] = rule
    return out


class ChooseComparison(unittest.TestCase):
    def test_nothing_to_fix_means_no_comparison(self):
        self.assertIsNone(choose_comparison(coaching(), make_reps(8), make_frames(8)))

    def test_too_few_counted_reps_means_no_comparison_and_partial_reps_do_not_count(self):
        self.assertIsNone(choose_comparison(coaching("chest_lean", "lean_high"), make_reps(3), make_frames(3)))
        self.assertIsNone(choose_comparison(coaching("chest_lean", "lean_high"), make_reps(4, partial_last=True), make_frames(4)))

    def test_lean_that_grows_shows_a_typical_early_rep_against_the_most_leaned(self):
        lean = [38, 40, 40, 41, 44, 48, 52, 55]
        out = choose_comparison(coaching("chest_lean", "lean_growth"), make_reps(8, lean=lean), make_frames(8))
        self.assertEqual((out["mode"], out["label_left"], out["label_right"], out["rule"]), ("pair", "How it was", "How it is now", "lean_growth"))
        self.assertIn(out["left"]["rep"], (2, 3, 4))       # early reps; the first is skipped as a warm-up
        self.assertEqual(out["right"]["rep"], 8)           # the most-leaned rep
        self.assertEqual(out["arrow_label"], "Torso lean")

    def test_a_lean_that_is_high_from_the_start_shows_least_against_most_leaned(self):
        lean = [30, 48, 50, 39, 51, 56, 44, 52]
        out = choose_comparison(coaching("chest_lean", "lean_high"), make_reps(8, lean=lean), make_frames(8))
        self.assertEqual((out["label_left"], out["label_right"]), ("Your best rep", "Leaning furthest"))
        self.assertEqual(out["left"]["rep"], 4)            # 39: the least-leaned rep after rep 1 (rep 1 at 30 is skipped)
        self.assertEqual(out["right"]["rep"], 6)           # 56

    def test_dropping_into_the_squat_shows_the_same_rep_at_real_speed_and_slowed(self):
        out = choose_comparison(coaching("lowering_speed", "lowering_quick"), make_reps(8, lowering=[0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5]), make_frames(8))
        self.assertEqual(out["mode"], "slow")
        self.assertEqual(out["left"]["rep"], out["right"]["rep"])
        self.assertEqual(out["slow"]["target_s"], 2.0)
        self.assertIsNone(out["arrow_label"])

    def test_rushing_shows_an_early_rep_against_the_fastest_late_one(self):
        out = choose_comparison(coaching("pace_drift", "pace_drift"), make_reps(9, lowering=[1.4, 1.4, 1.3, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6]), make_frames(9))
        self.assertEqual(out["mode"], "pair")
        self.assertIn(out["left"]["rep"], (1, 2, 3))
        self.assertEqual(out["right"]["rep"], 9)

    def test_knees_pair_needs_one_rep_to_move_the_knees_at_least_one_and_a_half_times_as_much(self):
        calm = choose_comparison(coaching("knee_tracking", "knee_tracking"), make_reps(6, view="front", travel=[0.6, 0.5, 0.6, 0.65, 0.6, 0.7]), make_frames(6))
        self.assertEqual(calm["mode"], "single")           # 0.7 / 0.5 = 1.4: nothing clearly steadier to compare with
        shaky = choose_comparison(coaching("knee_tracking", "knee_tracking"), make_reps(6, view="front", travel=[0.6, 0.4, 0.6, 0.65, 0.6, 0.8]), make_frames(6))
        self.assertEqual(shaky["mode"], "pair")
        self.assertEqual((shaky["left"]["rep"], shaky["right"]["rep"]), (2, 6))
        self.assertEqual(shaky["arrow_label"], "Knees in")

    def test_ankle_pair_needs_a_clear_gap_otherwise_one_picture_of_the_best_rep(self):
        close = choose_comparison(coaching("ankle_mobility", "ankle_limited"), make_reps(7, ankle=[20, 21, 22, 20, 21, 22, 23]), make_frames(7))
        self.assertEqual((close["mode"], close["left"]["rep"]), ("single", 7))      # best rep is rep 7; 23 against the median 21 is under 5 apart
        wide = choose_comparison(coaching("ankle_mobility", "ankle_limited"), make_reps(7, ankle=[15, 16, 15, 16, 15, 16, 30]), make_frames(7))
        self.assertEqual((wide["mode"], wide["left"]["rep"]), ("pair", 7))

    def test_a_short_depth_with_nothing_to_work_on_still_gets_a_picture(self):
        depth = [-0.2, -0.3, -0.25, -0.24, -0.26, -0.27, -0.1]
        out = choose_comparison(coaching(flags=["depth_short"]), make_reps(7, depth=depth), make_frames(7))
        self.assertEqual((out["topic"], out["rule"], out["mode"]), ("depth", "depth_short", "pair"))
        self.assertEqual(out["left"]["rep"], 7)            # the deepest rep (-0.1)
        self.assertEqual(out["arrow_label"], "Depth")

    def test_a_work_on_item_beats_a_depth_flag(self):
        out = choose_comparison(coaching("chest_lean", "lean_high", flags=["depth_short"]), make_reps(8, lean=[30, 48, 50, 39, 51, 56, 44, 52]), make_frames(8))
        self.assertEqual(out["rule"], "lean_high")

    def test_times_are_seconds_on_the_videos_own_timeline(self):
        out = choose_comparison(coaching("lowering_speed", "lowering_quick"), make_reps(8, lowering=[0.4] * 8), make_frames(8))
        rep = out["left"]["rep"]
        first, last = 100 * rep, 100 * rep + 60
        self.assertAlmostEqual(out["left"]["start_s"], round(first / FPS - PAD, 2), places=2)
        self.assertAlmostEqual(out["left"]["end_s"], round(last / FPS + PAD, 2), places=2)
        self.assertAlmostEqual(out["left"]["bottom_s"], round((first + 30) / FPS, 2), places=2)

    def test_an_unknown_rule_id_or_a_rule_without_a_comparison_gives_nothing_not_a_crash(self):
        self.assertIsNone(choose_comparison(coaching("chest_lean", "no_such_rule"), make_reps(8), make_frames(8)))
        self.assertIsNone(choose_comparison(coaching("chest_lean", "lean_steady"), make_reps(8), make_frames(8)))


class ArrowPlacement(unittest.TestCase):
    """Where the arrow lands: on the shoulder-to-hip middle, the shin, the hip, the left knee."""

    # a person facing right (nose to the right of the hip), seen from the right side. Right-side landmarks: shoulder 12, hip 24, knee 26, ankle 28.
    POSE = make_pose(p0=(0.7, 0.3), p12=(0.55, 0.4), p24=(0.45, 0.6), p26=(0.65, 0.65), p28=(0.5, 0.9), p25=(0.3, 0.7))

    def arrow(self, rule_id):
        rule = next(r for r in SPEC["rules"] if r["id"] == rule_id)
        return anchor_point(self.POSE, rule["comparison"]["arrow"], "side_right", SPEC)

    def test_torso_lean_points_at_the_middle_of_the_torso_from_behind_the_person(self):
        a = self.arrow("lean_high")
        self.assertEqual(a["back"], -1.0)                                   # the nose is to the right, so the back is on the left
        self.assertAlmostEqual(a["x"], round((0.55 + 0.45) / 2 - 0.07, 3), places=3)
        self.assertAlmostEqual(a["y"], round((0.4 + 0.6) / 2, 3), places=3)

    def test_ankle_points_a_third_of_the_way_up_the_shin(self):
        a = self.arrow("ankle_limited")
        self.assertAlmostEqual(a["x"], round(0.5 + (0.65 - 0.5) * 0.35 - 0.05, 3), places=3)
        self.assertAlmostEqual(a["y"], round(0.9 + (0.65 - 0.9) * 0.35, 3), places=3)

    def test_depth_points_at_the_hip(self):
        a = self.arrow("depth_short")
        self.assertAlmostEqual(a["x"], round(0.45 - 0.06, 3), places=3)
        self.assertAlmostEqual(a["y"], 0.6, places=3)

    def test_knees_point_at_the_knee_on_the_left_of_the_picture_with_the_tail_from_the_left(self):
        rule = next(r for r in SPEC["rules"] if r["id"] == "knee_tracking")
        a = anchor_point(self.POSE, rule["comparison"]["arrow"], "front", SPEC)
        self.assertEqual(a["back"], -1.0)
        self.assertAlmostEqual(a["x"], round(0.3 - 0.02, 3), places=3)      # landmark 25 is the knee on the left of this picture
        self.assertAlmostEqual(a["y"], 0.7, places=3)

    def test_no_arrow_from_a_view_the_rule_does_not_allow_or_with_a_missing_landmark(self):
        rule = next(r for r in SPEC["rules"] if r["id"] == "lean_high")
        self.assertIsNone(anchor_point(self.POSE, rule["comparison"]["arrow"], "front", SPEC))
        self.assertIsNone(anchor_point(None, rule["comparison"]["arrow"], "side_right", SPEC))
        broken = list(self.POSE)
        broken[12] = None
        self.assertIsNone(anchor_point(broken, rule["comparison"]["arrow"], "side_right", SPEC))


if __name__ == "__main__":
    unittest.main()
