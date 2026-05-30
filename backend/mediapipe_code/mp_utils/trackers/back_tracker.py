import time
from mediapipe_code.mp_utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP


class BackAngleTracker:
    __slots__ = (
        "hip_angle_threshold_up",
        "hip_angle_threshold_down",
        "upright_threshold",
        "warning_threshold",
        "min_bottom_hold",
        "deep_angle",
        "baseline_window",
        "state",
        "max_back_angle",
        "back_angle_start",
        "back_angle_at_bottom",
        "min_hip_angle",
        "bottom_hold_frames",
        "time_upright",
        "time_warning",
        "time_excessive",
        "torso_samples",
        "torso_baseline",
        "max_torso_deviation",
        "last_timestamp",
    )

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
        self.state = 0  # 0=STANDING, 1=DESCENDING, 2=BOTTOM, 3=ASCENDING

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

        self.last_timestamp = None

    def update(
        self,
        back_angle,
        hip_angle,
        knee_angle,
        camera_view,
        timestamp=None,
        torso_angle=None,
        debug=False,
    ):
        """Update the back angle tracker state based on the current angles, camera view, and pose. Returns back angle data when a rep is completed."""
        if timestamp is None:
            timestamp = time.time()

        last_timestamp = self.last_timestamp

        if last_timestamp is None:
            dt = 0.0
        else:
            dt = timestamp - last_timestamp
            if dt < 0:
                dt = 0.0

        self.last_timestamp = timestamp

        target_angle = knee_angle if "side" in camera_view else hip_angle

        state = self.state

        # -------------------------
        # STANDING
        # -------------------------
        if state == 0:

            # Baseline torso
            if (
                torso_angle is not None
                and target_angle >= self.hip_angle_threshold_up
            ):
                samples = self.torso_samples

                samples.append(torso_angle)

                if len(samples) > self.baseline_window:
                    samples.pop(0)

                self.torso_baseline = sum(samples) / len(samples)

            # Start rep
            if target_angle < self.hip_angle_threshold_down:
                self.state = 1

                self.back_angle_start = back_angle
                self.back_angle_at_bottom = back_angle

                self.max_back_angle = back_angle

                self.min_hip_angle = target_angle

                self.bottom_hold_frames = 0
                self.max_torso_deviation = 0.0

            return None

        # -------------------------
        # Accumulate posture time
        # -------------------------
        if dt > 0:
            if back_angle <= self.upright_threshold:
                self.time_upright += dt
            elif back_angle <= self.warning_threshold:
                self.time_warning += dt
            else:
                self.time_excessive += dt

        # -------------------------
        # Track metrics
        # -------------------------
        if back_angle > self.max_back_angle:
            self.max_back_angle = back_angle

        if target_angle < self.min_hip_angle:
            self.min_hip_angle = target_angle
            self.back_angle_at_bottom = back_angle

        baseline = self.torso_baseline

        if (
            torso_angle is not None
            and baseline is not None
            and target_angle <= self.hip_angle_threshold_down
        ):
            deviation = baseline - torso_angle

            if deviation > self.max_torso_deviation:
                self.max_torso_deviation = deviation

        # -------------------------
        # DESCENDING
        # -------------------------
        if state == 1:
            if target_angle < self.deep_angle:
                self.state = 2

            return None

        # -------------------------
        # BOTTOM
        # -------------------------
        if state == 2:
            self.bottom_hold_frames += 1

            if target_angle > self.hip_angle_threshold_down:

                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = 3
                else:
                    self.reset()

            return None

        # -------------------------
        # ASCENDING
        # -------------------------
        if target_angle <= self.hip_angle_threshold_up:
            return None

        max_back_angle = self.max_back_angle

        if "side" in camera_view:
            if self.back_angle_at_bottom <= 18:
                status = "Excellent"
            elif self.back_angle_at_bottom <= 28:
                status = "Good"
            else:
                status = "Warning"
        else:
            if self.back_angle_at_bottom <= 20:
                status = "Excellent"
            elif self.back_angle_at_bottom <= 30:
                status = "Good"
            else:
                status = "Warning"

        rep_data = {
            "back_angle_start": round(self.back_angle_start, 2),
            "back_angle_max": round(max_back_angle, 2),
            "back_angle_at_bottom": round(self.back_angle_at_bottom, 2),
            "time_upright": round(self.time_upright, 2),
            "time_warning": round(self.time_warning, 2),
            "time_excessive": round(self.time_excessive, 2),
            "back_label": status,
        }

        if debug:
            print(rep_data)

        self.reset()

        return rep_data