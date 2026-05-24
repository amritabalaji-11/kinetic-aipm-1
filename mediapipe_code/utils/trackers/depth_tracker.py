from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP

class DepthTracker:
    __slots__ = (
        "hip_angle_threshold_up",
        "hip_angle_threshold_down",
        "min_bottom_hold",
        "deep_knee_threshold",
        "parallel_knee_threshold",
        "state",
        "hip_angle_start",
        "knee_angle_start",
        "hip_angle_at_bottom",
        "knee_angle_at_bottom",
        "hip_angle_min",
        "knee_angle_min",
        "bottom_hold_frames",
        "hip_y_at_bottom",
        "knee_y_at_bottom",
    )

    def __init__(self):
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.min_bottom_hold = MIN_BOTTOM_HOLD
        self.deep_knee_threshold = THRESHOLD_DEEP
        self.parallel_knee_threshold = THRESHOLD_DOWN
        self.reset()

    def reset(self):
        self.state = 0  # 0=STANDING, 1=DESCENDING, 2=BOTTOM, 3=ASCENDING
        self.hip_angle_start = 0.0
        self.knee_angle_start = 0.0
        self.hip_angle_at_bottom = 0.0
        self.knee_angle_at_bottom = 0.0
        self.hip_angle_min = 999.0
        self.knee_angle_min = 999.0
        self.bottom_hold_frames = 0
        self.hip_y_at_bottom = None
        self.knee_y_at_bottom = None

    def update(
        self,
        hip_angle,
        knee_angle,
        camera_view,
        hip_y,
        knee_y,
        debug=False,
    ):
        if hip_angle is None or knee_angle is None:
            return None

        target_angle = knee_angle if "side" in camera_view else hip_angle
        state = self.state

        # -------------------------
        # STANDING
        # -------------------------
        if state == 0:
            if target_angle < self.hip_angle_threshold_down:
                self.state = 1
                self.hip_angle_start = hip_angle
                self.knee_angle_start = knee_angle
                self.hip_angle_at_bottom = hip_angle
                self.knee_angle_at_bottom = knee_angle
                self.hip_angle_min = hip_angle
                self.knee_angle_min = knee_angle
                self.bottom_hold_frames = 0
                self.hip_y_at_bottom = hip_y
                self.knee_y_at_bottom = knee_y
            return None

        # Track minima
        if hip_angle < self.hip_angle_min:
            self.hip_angle_min = hip_angle
            self.hip_angle_at_bottom = hip_angle

        if knee_angle < self.knee_angle_min:
            self.knee_angle_min = knee_angle
            self.knee_angle_at_bottom = knee_angle

        # -------------------------
        # DESCENDING
        # -------------------------
        if state == 1:
            if target_angle < self.deep_knee_threshold:
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

        # Step 1 — positional check
        # Hip must be below knee (in image coordinates, lower on screen = larger y)
        if hip_y is not None and knee_y is not None:
            if hip_y >= knee_y:
                flag = True
                rep_data = {
                    "hip_angle_start": round(self.hip_angle_start, 2),
                    "hip_angle_at_bottom": round(self.hip_angle_at_bottom, 2),
                    "hip_angle_min": round(self.hip_angle_min, 2),
                    "knee_angle_start": round(self.knee_angle_start, 2),
                    "knee_angle_at_bottom": round(self.knee_angle_at_bottom, 2),
                    "knee_angle_min": round(self.knee_angle_min, 2),
                    "depth_classification": "Warning",
                    "depth_insufficient_flag": flag,
                }

                if debug:
                    print(rep_data)

                self.reset()
                return rep_data

        flag = False
        # Step 2 — grade depth by camera
        if "side" in camera_view:
            if self.knee_angle_at_bottom <= 70:
                depth_classification = "Excellent"
            elif self.knee_angle_at_bottom <= 90:
                depth_classification = "Good"
            else:
                depth_classification = "Warning"
                flag = True
        else:
            if self.hip_angle_at_bottom <= 90:
                depth_classification = "Excellent"
            elif self.hip_angle_at_bottom <= 105:
                depth_classification = "Good"
            else:
                depth_classification = "Warning"
                flag = True

        rep_data = {
            "hip_angle_start": round(self.hip_angle_start, 2),
            "hip_angle_at_bottom": round(self.hip_angle_at_bottom, 2),
            "hip_angle_min": round(self.hip_angle_min, 2),
            "knee_angle_start": round(self.knee_angle_start, 2),
            "knee_angle_at_bottom": round(self.knee_angle_at_bottom, 2),
            "knee_angle_min": round(self.knee_angle_min, 2),
            "depth_classification": depth_classification,
            "depth_insufficient_flag": flag,
        }

        if debug:
            print(rep_data)

        self.reset()
        return rep_data