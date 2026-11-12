"""The still picture: your own frame with one arrow and a label, drawn from the spec's rule. Built on a synthetic video and pose."""
import os
import tempfile
import unittest
from types import SimpleNamespace

import cv2
import numpy as np

from mediapipe_code.mp_utils.visualization.focus_overlay import OUT_H, OUT_W, build_focus_picture, choose_focus
from exercises.registry import get_spec

SPEC = get_spec("goblet-squat")
AMBER_BGR = (0, 150, 255)


def pose(**points):
    p = [SimpleNamespace(x=0.5, y=0.5) for _ in range(33)]
    for key, (x, y) in points.items():
        p[int(key.lstrip("p"))] = SimpleNamespace(x=x, y=y)
    return p


# facing right, seen from the right: nose 0, right shoulder 12, right hip 24, right knee 26, right ankle 28; left knee 25 for the front view
SIDE = pose(p0=(0.7, 0.3), p12=(0.55, 0.4), p24=(0.45, 0.6), p26=(0.65, 0.65), p28=(0.5, 0.9))
FRONT = pose(p25=(0.35, 0.7), p26=(0.62, 0.7))


def reps(n, view, lean=None):
    return {"reps": [{"rep_number": i + 1, "camera_view": view, "back_data": {"back_angle_at_bottom": (lean or [40] * n)[i]},
                      "depth_data": {"hip_below_knee_ratio": 0.0}, "ankle_data": {"dorsiflexion_at_bottom": 20}, "tempo_data": {"eccentric": 1.2}} for i in range(n)]}


def frames(n, pose_, view):
    return [{"rep_number": r, "frame_index": 10 * (r - 1) + k, "knee_angle": abs(k - 3) + 60, "norm_pose": pose_, "camera_view": view} for r in range(1, n + 1) for k in range(7)]


def coaching(topic=None, rule=None):
    out = {"feedback_items": {"work_on": [{"topic": topic, "reps_flagged": []}] if topic else []}, "signals": {"rules": {f"work_on:{topic}": rule} if topic else {}, "fired_flags": []}}
    return out


def amber_pixels(image):
    return int(np.sum(np.all(np.abs(image.astype(int) - np.array(AMBER_BGR)) < 12, axis=2)))


class FocusPicture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cwd = os.getcwd()
        os.chdir(self.tmp.name)               # the picture is saved under ./worst_frames
        self.video = os.path.join(self.tmp.name, "clip.mp4")
        writer = cv2.VideoWriter(self.video, cv2.VideoWriter_fourcc(*"mp4v"), 30, (360, 640))
        for _ in range(60):
            writer.write(np.full((640, 360, 3), 90, np.uint8))
        writer.release()

    def tearDown(self):
        os.chdir(self.cwd)
        self.tmp.cleanup()

    def picture(self, view, pose_, topic, rule, n=8, lean=None):
        data = reps(n, view, lean)
        return build_focus_picture(self.video, frames(n, pose_, view), data, coaching(topic, rule), "a1")

    def test_a_torso_lean_gets_one_amber_arrow_and_the_file_is_saved(self):
        image, path = self.picture("side_right", SIDE, "chest_lean", "lean_high", lean=[30, 48, 50, 39, 51, 56, 44, 52])
        self.assertEqual(image.shape[:2], (OUT_H, OUT_W))
        self.assertTrue(os.path.exists(path))
        self.assertGreater(amber_pixels(image), 2000)

    def test_the_arrow_stays_inside_the_picture_and_away_from_its_edges(self):
        image, _ = self.picture("side_right", SIDE, "chest_lean", "lean_high", lean=[30, 48, 50, 39, 51, 56, 44, 52])
        ys, xs = np.where(np.all(np.abs(image.astype(int) - np.array(AMBER_BGR)) < 12, axis=2))
        self.assertTrue(0.05 * OUT_H < ys.mean() < 0.8 * OUT_H)
        self.assertTrue(xs.min() >= 0 and xs.max() < OUT_W)

    def test_a_front_view_knee_issue_gets_an_arrow_too(self):
        image, _ = self.picture("front", FRONT, "knee_tracking", "knee_tracking")
        self.assertGreater(amber_pixels(image), 2000)

    def test_a_timing_issue_has_no_body_part_so_no_arrow(self):
        image, _ = self.picture("side_right", SIDE, "lowering_speed", "lowering_quick")
        self.assertEqual(amber_pixels(image), 0)

    def test_nothing_to_fix_gives_a_plain_frame(self):
        image, _ = self.picture("side_right", SIDE, None, None)
        self.assertEqual(amber_pixels(image), 0)

    def test_the_arrow_never_appears_from_a_view_the_rule_does_not_allow(self):
        image, _ = self.picture("front", SIDE, "chest_lean", "lean_high", lean=[30, 48, 50, 39, 51, 56, 44, 52])
        self.assertEqual(amber_pixels(image), 0)

    def test_the_picture_shows_the_rep_the_rule_names(self):
        rule, rep = choose_focus(coaching("chest_lean", "lean_high"), reps(8, "side_right", [30, 48, 50, 39, 51, 56, 44, 52])["reps"], SPEC)
        self.assertEqual((rule["id"], rep["rep_number"]), ("lean_high", 6))      # the most-leaned rep (56)

    def test_no_reps_is_a_clear_error_not_a_crash_somewhere_else(self):
        with self.assertRaises(ValueError):
            build_focus_picture(self.video, [], {"reps": []}, coaching(), "a2")


if __name__ == "__main__":
    unittest.main()
