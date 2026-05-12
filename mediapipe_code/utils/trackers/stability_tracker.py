import time
from typing import Any, Dict, List, Optional
import numpy as np
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP


class StabilityTracker:
    def __init__(self):
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.min_bottom_hold = MIN_BOTTOM_HOLD
        self.deep_angle = THRESHOLD_DEEP

        self.valgus_distance_threshold = 0.08
        self.baseline_window = 5

        self.reset()

    def reset(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.phase_start_time = None
        self.last_timestamp = None

        self.bottom_hold_frames = 0

        # Rep buffers
        self.rep_frames = []

        # Optional extra info if you want it later
        self.top_frame_index = None
        self.bottom_frame_index = None
        self.concentric_start_index = None

    def _safe_mean(self, values: List[float]) -> Optional[float]:
        vals = [v for v in values if v is not None]
        return sum(vals) / len(vals) if vals else None

    def _extract_frame_data(self, pose_landmarks):
        """
        Uses:
          - screen coords for knee valgus distance
          - screen y for hip/bottom detection
        """
        left_hip = pose_landmarks[23]
        right_hip = pose_landmarks[24]
        left_knee = pose_landmarks[25]
        right_knee = pose_landmarks[26]

        hip_y = self._safe_mean([left_hip.y, right_hip.y])
        knee_valgus_distance = abs(left_knee.x - right_knee.x)

        return {
            "hip_y": hip_y,
            "knee_valgus_distance": knee_valgus_distance,
        }

    def _classify_valgus_phase(self, rep_frames, concentric_start_idx, concentric_end_idx):
        """
        Finds the worst knee cave in the first 20% of concentric.
        Then classifies when it happened inside that window.
        """
        if not rep_frames:
            return None, None, False

        concentric_len = max(1, concentric_end_idx - concentric_start_idx)
        window_len = max(1, int(round(0.20 * concentric_len)))
        window_end_idx = min(concentric_end_idx, concentric_start_idx + window_len)

        early_window = rep_frames[concentric_start_idx:window_end_idx + 1]
        if not early_window:
            return None, None, False

        distances = [f["knee_valgus_distance"] for f in early_window if f["knee_valgus_distance"] is not None]
        if not distances:
            return None, None, False

        min_dist = min(distances)
        frame_of_min = next(
            i for i, f in enumerate(early_window)
            if f["knee_valgus_distance"] == min_dist
        )

        pct = frame_of_min / max(1, len(early_window) - 1)

        if pct < 0.33:
            phase = "EARLY"
        elif pct < 0.66:
            phase = "MID"
        else:
            phase = "LATE"

        valgus_flag = min_dist < self.valgus_distance_threshold
        return round(min_dist, 4), phase, valgus_flag

    def update(
        self,
        hip_angle: Optional[float],
        knee_angle: Optional[float],
        camera_view,
        pose_landmarks,
        timestamp: Optional[float] = None,
        debug: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Returns:
            {
                "stability_data": {
                    "knee_valgus_distance": ...,
                    "valgus_phase": ...,
                    "valgus_flag": ...,
                }
            }
            when the rep finishes.
        """
        if hip_angle is None or knee_angle is None:
            return None
        
        target_angle = hip_angle if "side" not in camera_view else knee_angle

        if timestamp is None:
            timestamp = time.time()

        if self.last_timestamp is None:
            self.last_timestamp = timestamp

        self.last_timestamp = timestamp

        frame_data = self._extract_frame_data(pose_landmarks)

        if self.state == "STANDING":
            
            # Start rep
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.bottom_hold_frames = 0
                self.rep_frames = []

                # Add current frame as part of the rep
                self.rep_frames.append(frame_data)

            return None

        # Add active rep frame
        self.rep_frames.append(frame_data)

        # DESCENDING -> BOTTOM
        if self.state == "DESCENDING":
            if target_angle < self.deep_angle:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0

        # BOTTOM -> ASCENDING
        elif self.state == "BOTTOM":
            self.bottom_hold_frames += 1
            if target_angle > self.hip_angle_threshold_down:
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    self.reset()
                    return None

        # Finish rep
        elif self.state == "ASCENDING":
            if target_angle > self.hip_angle_threshold_up:
                hip_y_values = [f["hip_y"] for f in self.rep_frames if f["hip_y"] is not None]
                if not hip_y_values:
                    self.reset()
                    return None

                # Bottom = lowest hip position in screen coords (largest y)
                self.bottom_frame_index = int(np.argmax(hip_y_values))
                self.top_frame_index = len(self.rep_frames) - 1

                # Concentric starts when hip_y begins to decrease after bottom
                self.concentric_start_index = None
                for i in range(self.bottom_frame_index + 1, len(self.rep_frames)):
                    prev_y = self.rep_frames[i - 1]["hip_y"]
                    curr_y = self.rep_frames[i]["hip_y"]
                    if prev_y is not None and curr_y is not None and curr_y < prev_y:
                        self.concentric_start_index = i
                        break

                if self.concentric_start_index is None:
                    self.concentric_start_index = self.bottom_frame_index

                knee_valgus_distance, valgus_phase, valgus_flag = self._classify_valgus_phase(
                    self.rep_frames,
                    self.concentric_start_index,
                    self.top_frame_index,
                )


                rep_data = {
                        "knee_valgus_distance": knee_valgus_distance,
                        "valgus_phase": valgus_phase,
                        "valgus_flag": valgus_flag,
                }

                if debug:
                    print("knee_valgus_distance:",rep_data["knee_valgus_distance"])
                    print("valgus_phase:",rep_data["valgus_phase"])
                    print("valgus_flag:",rep_data["valgus_flag"])

                self.reset()
                return rep_data

        return None