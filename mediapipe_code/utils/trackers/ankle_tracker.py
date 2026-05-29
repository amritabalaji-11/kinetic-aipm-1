from utils.landmark_quality_methods import foot_turnout_relative
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP
    

class AnkleTracker:
    __slots__ = (
        "hip_angle_threshold_up",
        "hip_angle_threshold_down",
        "deep_angle",
        "min_bottom_hold",
        "state",
        "bottom_hold_frames",
        "dorsiflexion_at_bottom",
        "min_hip_angle",
        "foot_turnout_left",
        "foot_turnout_right",
        "dorsiflexion_status"
    )

    def __init__(self):
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN

        self.deep_angle = THRESHOLD_DEEP
        self.min_bottom_hold = MIN_BOTTOM_HOLD

        self.reset()

    def reset(self):
        self.state = 0  # 0=STANDING, 1=DESCENDING, 2=BOTTOM, 3=ASCENDING

        self.bottom_hold_frames = 0

        self.dorsiflexion_at_bottom = 0.0
        self.min_hip_angle = 999.0

        self.foot_turnout_left = None
        self.foot_turnout_right = None
        self.dorsiflexion_status = None

    def update(
        self,
        hip_angle,
        knee_angle,
        camera_view,
        dorsiflexion,
        pose_world,
        debug=False,
    ):
        """Update the ankle tracker state based on the current angles, camera view, and pose. Returns ankle data when a rep is completed."""
        if hip_angle is None:
            return None

        target_angle = knee_angle if "side" in camera_view else hip_angle

        state = self.state

        # =========================
        # STANDING
        # =========================
        if state == 0:

            # Capture turnout at top
            if target_angle >= self.hip_angle_threshold_up:

                left_turnout = foot_turnout_relative(
                    pose_world[29],
                    pose_world[31],
                    pose_world[24],
                    pose_world[23],
                )

                right_turnout = foot_turnout_relative(
                    pose_world[30],
                    pose_world[32],
                    pose_world[24],
                    pose_world[23],
                )

                if left_turnout is not None:
                    self.foot_turnout_left = left_turnout

                if right_turnout is not None:
                    self.foot_turnout_right = right_turnout

            # Start rep
            if target_angle < self.hip_angle_threshold_down:
                self.state = 1

                self.bottom_hold_frames = 0

                self.min_hip_angle = hip_angle
                self.dorsiflexion_at_bottom = dorsiflexion

            return None

        # =========================
        # Track deepest frame
        # =========================
        if hip_angle < self.min_hip_angle:
            self.min_hip_angle = hip_angle
            self.dorsiflexion_at_bottom = dorsiflexion

        # =========================
        # DESCENDING
        # =========================
        if state == 1:

            if hip_angle < self.deep_angle:
                self.state = 2

            return None

        # =========================
        # BOTTOM
        # =========================
        if state == 2:

            self.bottom_hold_frames += 1

            if target_angle > self.hip_angle_threshold_down:

                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = 3
                else:
                    self.reset()

            return None

        # =========================
        # ASCENDING
        # =========================
        if target_angle <= self.hip_angle_threshold_up:
            return None

        dorsiflexion_at_bottom = self.dorsiflexion_at_bottom

        if "side" in camera_view:
            if dorsiflexion_at_bottom >= 30:
                status = "good"
            elif  29 >= dorsiflexion_at_bottom >= 20:
                status = "mild_restriction"
            elif 19 >= dorsiflexion_at_bottom >= 10:
                status = "moderate_restriction"
            else:
                status = "severe_restriction"
        else:
            if dorsiflexion_at_bottom >= 25:
                status = "good"
            else:
                status = "restricted"
            
        
        self.dorsiflexion_status = status 

        ankle_data = {
            "dorsiflexion_at_bottom": dorsiflexion_at_bottom,
            "dorsiflexion_status": self.dorsiflexion_status,
            "foot_turnout_left": (
                round(self.foot_turnout_left, 2)
                if self.foot_turnout_left is not None
                else None
            ),
            "foot_turnout_right": (
                round(self.foot_turnout_right, 2)
                if self.foot_turnout_right is not None
                else None
            ),
        }

        if debug:
            print(ankle_data)

        self.reset()

        return ankle_data