import time
from typing import Any, Dict, Optional
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP


class BackAngleTracker:
    def __init__(self):
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.upright_threshold = 20
        self.warning_threshold = 40
        self.min_bottom_hold = MIN_BOTTOM_HOLD
        self.deep_angle = THRESHOLD_DEEP

        self.baseline_window = 5

        self.reset()

    def reset(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.phase_start_time = None
        self.last_timestamp = None

        self.max_back_angle = 0.0
        self.back_angle_start = None
        self.back_angle_at_bottom = None
        self.min_hip_angle = float("inf")
        self.bottom_hold_frames = 0

        self.time_upright = 0.0
        self.time_warning = 0.0
        self.time_excessive = 0.0

        self.torso_samples = []
        self.torso_baseline = None
        self.max_torso_deviation = 0.0

    def _accumulate_time(self, back_angle: float, dt: float) -> None:
        if dt <= 0:
            return
        if back_angle <= self.upright_threshold:
            self.time_upright += dt
        elif back_angle <= self.warning_threshold:
            self.time_warning += dt
        else:
            self.time_excessive += dt

    def update(
        self,
        back_angle: float,
        hip_angle: float,
        knee_angle,
        camera_view,
        timestamp: Optional[float] = None,
        torso_angle: Optional[float] = None,
        debug: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        back_angle: trunk/back lean metric from your biomechanics
        hip_angle: squat depth state metric
        """
        if timestamp is None:
            timestamp = time.time()

        if self.last_timestamp is None:
            self.last_timestamp = timestamp

        target_angle = hip_angle if "side" not in camera_view else knee_angle

        dt = max(0.0, timestamp - self.last_timestamp)
        self.last_timestamp = timestamp

        # Collect neutral baseline while standing
        if self.state == "STANDING":
            if torso_angle is not None and target_angle >= self.hip_angle_threshold_up:
                self.torso_samples.append(torso_angle)
                self.torso_samples = self.torso_samples[-self.baseline_window:]
                self.torso_baseline = sum(self.torso_samples) / len(self.torso_samples)

            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.back_angle_start = back_angle
                self.back_angle_at_bottom = back_angle
                self.max_back_angle = back_angle
                self.min_hip_angle = target_angle
                self.bottom_hold_frames = 0

                self.max_torso_deviation = 0.0

            return None

        # Track rep metrics
        self._accumulate_time(back_angle, dt)
        self.max_back_angle = max(self.max_back_angle, back_angle)

        if target_angle < self.min_hip_angle:
            self.min_hip_angle = target_angle
            self.back_angle_at_bottom = back_angle

        if (
            torso_angle is not None
            and self.torso_baseline is not None
            and target_angle <= self.hip_angle_threshold_down
        ):
            deviation = self.torso_baseline - torso_angle
            self.max_torso_deviation = max(self.max_torso_deviation, deviation)


        if self.state == "DESCENDING":
            if target_angle < self.deep_angle:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0

        elif self.state == "BOTTOM":
            self.bottom_hold_frames += 1
            if target_angle > self.hip_angle_threshold_down:
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    self.reset()
                    return None

        elif self.state == "ASCENDING":
            if target_angle > self.hip_angle_threshold_up:
                if self.max_back_angle <= self.upright_threshold:
                    status = "GOOD"
                elif self.max_back_angle <= self.warning_threshold:
                    status = "ACCEPTABLE"
                else:
                    status = "WARNING"

                rep_data = {
                    "back_angle_start": round(self.back_angle_start, 2) if self.back_angle_start is not None else None,
                    "back_angle_max": round(self.max_back_angle, 2),
                    "back_angle_at_bottom": round(self.back_angle_at_bottom, 2) if self.back_angle_at_bottom is not None else None,
                    "time_upright": round(self.time_upright, 2),
                    "time_warning": round(self.time_warning, 2),
                    "time_excessive": round(self.time_excessive, 2),
                    "status": status,

                }

                if debug:
                    print("back_angle_start:", rep_data["back_angle_start"])
                    print("back_angle_max:", rep_data["back_angle_max"])
                    print("back_angle_at_bottom:", rep_data["back_angle_at_bottom"])
                    print("time_upright:", rep_data["time_upright"])
                    print("time_warning:", rep_data["time_warning"])
                    print("time_excessive:", rep_data["time_excessive"])
                    print("status:", rep_data["status"])

                self.reset()
                return rep_data

        return None