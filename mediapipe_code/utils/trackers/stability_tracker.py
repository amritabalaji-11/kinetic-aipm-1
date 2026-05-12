import time
from typing import Any, Dict, Optional
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
        self.state = "STANDING"
        self.phase_start_time = None
        self.last_timestamp = None
        self.bottom_hold_frames = 0

        self.rep_frames = []
        self.top_frame_index = None
        self.bottom_frame_index = None
        self.concentric_start_index = None

    @staticmethod
    def _mean2(a: float, b: float) -> float:
        return (a + b) * 0.5

    def _extract_frame_data(self, pose_landmarks):
        left_hip = pose_landmarks[23]
        right_hip = pose_landmarks[24]
        left_knee = pose_landmarks[25]
        right_knee = pose_landmarks[26]

        return {
            "hip_y": self._mean2(left_hip.y, right_hip.y),
            "knee_valgus_distance": abs(left_knee.x - right_knee.x),
        }

    def _classify_valgus_phase(
        self,
        rep_frames,
        concentric_start_idx,
        concentric_end_idx,
    ):
        if not rep_frames:
            return None, None, False

        concentric_len = concentric_end_idx - concentric_start_idx + 1
        if concentric_len <= 0:
            return None, None, False

        window_len = max(1, int(round(0.20 * concentric_len)))
        window_end_idx = min(concentric_end_idx, concentric_start_idx + window_len - 1)

        min_dist = None
        min_pos = None

        for pos in range(concentric_start_idx, window_end_idx + 1):
            dist = rep_frames[pos]["knee_valgus_distance"]
            if dist is None:
                continue
            if min_dist is None or dist < min_dist:
                min_dist = dist
                min_pos = pos

        if min_dist is None:
            return None, None, False

        rel_pos = min_pos - concentric_start_idx
        denom = max(1, window_end_idx - concentric_start_idx)

        pct = rel_pos / denom
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
        if hip_angle is None or knee_angle is None:
            return None

        target_angle = knee_angle if camera_view.startswith("side") else hip_angle

        if timestamp is None:
            timestamp = time.time()

        self.last_timestamp = timestamp
        frame_data = self._extract_frame_data(pose_landmarks)

        if self.state == "STANDING":
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.bottom_hold_frames = 0
                self.rep_frames = [frame_data]
            return None

        self.rep_frames.append(frame_data)

        if self.state == "DESCENDING":
            if target_angle < self.deep_angle:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
            return None

        if self.state == "BOTTOM":
            self.bottom_hold_frames += 1
            if target_angle > self.hip_angle_threshold_down:
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    self.reset()
            return None

        if self.state == "ASCENDING":
            if target_angle > self.hip_angle_threshold_up:
                hip_y_min = None
                bottom_idx = None

                for i, f in enumerate(self.rep_frames):
                    hip_y = f["hip_y"]
                    if hip_y is None:
                        continue
                    if hip_y_min is None or hip_y > hip_y_min:
                        hip_y_min = hip_y
                        bottom_idx = i

                if bottom_idx is None:
                    self.reset()
                    return None

                self.bottom_frame_index = bottom_idx
                self.top_frame_index = len(self.rep_frames) - 1

                concentric_start = None
                for i in range(bottom_idx + 1, len(self.rep_frames)):
                    prev_y = self.rep_frames[i - 1]["hip_y"]
                    curr_y = self.rep_frames[i]["hip_y"]
                    if prev_y is not None and curr_y is not None and curr_y < prev_y:
                        concentric_start = i
                        break

                if concentric_start is None:
                    concentric_start = bottom_idx

                self.concentric_start_index = concentric_start

                knee_valgus_distance, valgus_phase, valgus_flag = self._classify_valgus_phase(
                    self.rep_frames,
                    concentric_start,
                    self.top_frame_index,
                )

                rep_data = {
                    "knee_valgus_distance": knee_valgus_distance,
                    "valgus_phase": valgus_phase,
                    "valgus_flag": valgus_flag,
                }

                if debug:
                    print("knee_valgus_distance:", rep_data["knee_valgus_distance"])
                    print("valgus_phase:", rep_data["valgus_phase"])
                    print("valgus_flag:", rep_data["valgus_flag"])

                self.reset()
                return rep_data

        return None