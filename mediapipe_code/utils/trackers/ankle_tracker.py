import time
from typing import Any, Dict, Optional
from utils.landmark_quality_methods import foot_turnout_relative
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP
    

class AnkleTracker:

    def __init__(self):

        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.deep_angle = THRESHOLD_DEEP
        self.min_bottom_hold = MIN_BOTTOM_HOLD

        self.reset()

    def reset(self):

        self.state = "STANDING"

        self.last_timestamp = None

        self.bottom_hold_frames = 0

        # Bottom metrics
        self.dorsiflexion_at_bottom = None
        self.min_hip_angle = float("inf")

        # Top frame turnout
        self.foot_turnout_left = None
        self.foot_turnout_right = None

    def update(
        self,
        hip_angle,
        knee_angle,
        camera_view,
        dorsiflexion,
        pose_world,
        timestamp=None,
        debug=False,
    ) -> Optional[Dict[str, Any]]:

        if hip_angle is None:
            return None
        
        target_angle = hip_angle if "side" not in camera_view else knee_angle

        if timestamp is None:
            timestamp = time.time()

        self.last_timestamp = timestamp

        # =========================
        # STANDING
        # =========================
        if self.state == "STANDING":

            # Capture turnout at top
            if target_angle >= self.hip_angle_threshold_up:

                left_turnout = foot_turnout_relative(
                    pose_world[29],  # LEFT_HEEL
                    pose_world[31],  # LEFT_FOOT_INDEX
                    pose_world[24],  # LEFT_HIP
                    pose_world[23],  # RIGHT_HIP
                )

                right_turnout = foot_turnout_relative(
                    pose_world[30],  # RIGHT_HEEL
                    pose_world[32],  # RIGHT_FOOT_INDEX
                    pose_world[24],  
                    pose_world[23],  
                )

                if left_turnout is not None:
                    self.foot_turnout_left = left_turnout

                if right_turnout is not None:
                    self.foot_turnout_right = right_turnout

            # Start rep
            if target_angle < self.hip_angle_threshold_down:

                self.state = "DESCENDING"

                self.bottom_hold_frames = 0

                self.min_hip_angle = hip_angle

                self.dorsiflexion_at_bottom = dorsiflexion

            return None

        # =========================
        # Track deepest frame
        # =========================
        if target_angle < self.min_hip_angle:

            self.min_hip_angle = hip_angle

            self.dorsiflexion_at_bottom = dorsiflexion

        # =========================
        # DESCENDING
        # =========================
        if self.state == "DESCENDING":

            if hip_angle < self.deep_angle:

                self.state = "BOTTOM"

                self.bottom_hold_frames = 0

        # =========================
        # BOTTOM
        # =========================
        elif self.state == "BOTTOM":

            self.bottom_hold_frames += 1

            if target_angle > self.hip_angle_threshold_down:

                if self.bottom_hold_frames >= self.min_bottom_hold:

                    self.state = "ASCENDING"

                else:

                    self.reset()

                    return None

        # =========================
        # ASCENDING
        # =========================
        elif self.state == "ASCENDING":

            if target_angle > self.hip_angle_threshold_up:
                if self.dorsiflexion_at_bottom:
                    

                    ankle_data = {

                        "dorsiflexion_at_bottom":
                            "adecuate"
                            if self.dorsiflexion_at_bottom > 25
                            else "restricted",

                        "foot_turnout_left":
                            round(self.foot_turnout_left, 2)
                            if self.foot_turnout_left is not None
                            else None,

                        "foot_turnout_right":
                            round(self.foot_turnout_right, 2)
                            if self.foot_turnout_right is not None
                            else None,
                    }

                if debug:
                    print("dorsiflexion_at_bottom:" ,ankle_data["dorsiflexion_at_bottom"])
                    print("foot_turnout_left:", ankle_data["foot_turnout_left"])
                    print("foot_turnout_right:",ankle_data["foot_turnout_right"])

                self.reset()
                return ankle_data

        return None