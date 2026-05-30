import math
import time
from typing import Any, Dict, Optional
from mediapipe_code.mp_utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP


class StabilityTracker:
    __slots__ = (
        "hip_angle_threshold_up",
        "hip_angle_threshold_down",
        "deep_angle",
        "min_bottom_hold",
        "state",
        "bottom_hold_frames",
        "rep_frames",
        "valgus_limit_threshold",
        "current_stability_data",
    )

    def __init__(self):
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.deep_angle = THRESHOLD_DEEP
        self.min_bottom_hold = MIN_BOTTOM_HOLD

        # knees / shoulders
        # < 1.0 means knees narrower than shoulders
        self.valgus_limit_threshold = 0.22

        self.current_stability_data = None

        self.reset()

    def reset(self):
        self.state = "STANDING"
        self.bottom_hold_frames = 0
        self.rep_frames = []

    # ---------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------

    def _extract_frame_data(self, norm_pose):
        """
        Extract 2D frontal knee vs shoulder distance ratio.
        Uses only X axis because valgus is horizontal movement.
        """

        try:
            left_shoulder = norm_pose[11]
            right_shoulder = norm_pose[12]

            left_knee = norm_pose[25]
            right_knee = norm_pose[26]

            shoulder_width = abs(
                left_shoulder.x - right_shoulder.x
            )

            knee_width = abs(
                left_knee.x - right_knee.x
            )

            if shoulder_width <= 1e-6:
                return {
                    "knee_distance": None,
                    "shoulder_width": None,
                    "knee_ratio": None,
                }

            knee_ratio = knee_width / shoulder_width

            return {
                "knee_distance": knee_width,
                "shoulder_width": shoulder_width,
                "knee_ratio": knee_ratio,
            }

        except Exception:
            return {
                "knee_distance": None,
                "shoulder_width": None,
                "knee_ratio": None,
            }

    def _classify_valgus_phase(self):
        """
        Find the minimum knee distance during the rep
        and classify where it occurred.
        """

        if not self.rep_frames:
            return None, None, False

        min_dist = None
        min_pos = None

        for i, frame in enumerate(self.rep_frames):
            dist = frame["knee_distance"]
            ratio = frame["knee_ratio"]

            if dist is None or ratio is None:
                continue

            if min_dist is None or dist < min_dist:
                min_dist = dist
                min_pos = i

        if min_dist is None:
            return None, None, False

        rep_len = len(self.rep_frames)

        if rep_len <= 1:
            phase = "MID"
        else:
            pct = min_pos / (rep_len - 1)

            if pct < 0.33:
                phase = "EARLY"
            elif pct < 0.66:
                phase = "MID"
            else:
                phase = "LATE"

        valgus_flag = (
            min_dist < self.valgus_limit_threshold
        )

        return (
            round(min_dist, 4),
            phase,
            valgus_flag,
        )

    # ---------------------------------------------------------
    # Main update
    # ---------------------------------------------------------

    def update(
        self,
        hip_angle: Optional[float],
        knee_angle: Optional[float],
        camera_view,
        norm_pose,
        timestamp: Optional[float] = None,
        debug: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Update the stability tracker state based on the current angles, camera view, and pose. Returns stability data when a rep is completed."""
        if hip_angle is None or knee_angle is None:
            return None

        # Only analyze frontal / angled views
        if camera_view.startswith("side"):
            return None

        if timestamp is None:
            timestamp = time.time()

        target_angle = hip_angle

        frame_data = self._extract_frame_data(norm_pose)

        # ---------------------------------------------------------
        # STANDING
        # ---------------------------------------------------------

        if self.state == "STANDING":

            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.bottom_hold_frames = 0
                self.rep_frames = [frame_data]

            return None

        # Store all frames during rep
        self.rep_frames.append(frame_data)

        # ---------------------------------------------------------
        # DESCENDING
        # ---------------------------------------------------------

        if self.state == "DESCENDING":

            if target_angle < self.deep_angle:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0

            return None

        # ---------------------------------------------------------
        # BOTTOM
        # ---------------------------------------------------------

        if self.state == "BOTTOM":

            self.bottom_hold_frames += 1

            if target_angle > self.hip_angle_threshold_down:

                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    self.reset()

            return None

        # ---------------------------------------------------------
        # ASCENDING
        # ---------------------------------------------------------

        if self.state == "ASCENDING":

            if target_angle <= self.hip_angle_threshold_up:
                return None

            (
                knee_valgus_distance,
                valgus_phase,
                valgus_flag,
            ) = self._classify_valgus_phase()



            if "side" in camera_view:
                stability_data = {
                    "knee_valgus_distance": None,
                    "knee_gap_hip_gap_ratio": None,
                    "valgus_severity": None,
                    "valgus_label": None,
                    "valgus_phase": None,
                    "valgus_flag": None,
                }
            else:

                ratio = 1 - knee_valgus_distance

                if ratio >= 0.95:     valgus_severity = 'severe'
                elif ratio >= 0.90:   valgus_severity = 'moderate'
                elif ratio >= 0.80:   valgus_severity = 'mild'
                else:                 valgus_severity = 'none'

                knee_gap_hip_gap_ratio = ratio
                valgus_label           = 'Good' if valgus_severity == 'none' else 'Warning'

                stability_data = {
                    "knee_valgus_distance": knee_valgus_distance,
                    "knee_gap_hip_gap_ratio": knee_gap_hip_gap_ratio,
                    "valgus_severity": valgus_severity,
                    "valgus_label": valgus_label,
                    "valgus_phase": valgus_phase,
                    "valgus_flag": valgus_flag,
                }

            self.current_stability_data = stability_data

            if debug:
                print(stability_data)

            self.reset()

            return stability_data

        return None