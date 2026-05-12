import time
from typing import Any, Dict, Optional
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, MIN_BOTTOM_HOLD, THRESHOLD_DEEP

class DepthTracker:
    def __init__(self):
        # Same rep phase thresholds you already use
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.min_bottom_hold = MIN_BOTTOM_HOLD

        # Depth classification thresholds
        # Lower angle = deeper squat
        self.deep_knee_threshold = THRESHOLD_DEEP

        self.parallel_hip_threshold = THRESHOLD_DOWN
        self.parallel_knee_threshold = THRESHOLD_DOWN

        self.reset()

    def reset(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.phase_start_time = None
        self.last_timestamp = None

        self.hip_angle_start = None
        self.knee_angle_start = None

        self.hip_angle_at_bottom = None
        self.knee_angle_at_bottom = None

        self.hip_angle_min = float("inf")
        self.knee_angle_min = float("inf")

        self.bottom_hold_frames = 0

    def update(
        self,
        hip_angle: Optional[float],
        knee_angle: Optional[float],
        camera_view,
        timestamp: Optional[float] = None,
        debug: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Tracks squat depth through a repetition.

        Returns:
            {
                "depth_data": {
                    "hip_angle_start": ...,
                    "hip_angle_at_bottom": ...,
                    "hip_angle_min": ...,
                    "knee_angle_start": ...,
                    "knee_angle_at_bottom": ...,
                    "knee_angle_min": ...,
                    "depth_classification": ...,
                    "depth_insufficient_flag": ...
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

        # -------------------------
        # STANDING
        # -------------------------
        if self.state == "STANDING":
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp

                self.hip_angle_start = hip_angle
                self.knee_angle_start = knee_angle

                self.hip_angle_at_bottom = hip_angle
                self.knee_angle_at_bottom = knee_angle

                self.hip_angle_min = hip_angle
                self.knee_angle_min = knee_angle

                self.bottom_hold_frames = 0

            return None

        # -------------------------
        # Track minima while rep is active
        # -------------------------
        if hip_angle < self.hip_angle_min:
            self.hip_angle_min = hip_angle
            self.hip_angle_at_bottom = hip_angle

        if knee_angle < self.knee_angle_min:
            self.knee_angle_min = knee_angle
            self.knee_angle_at_bottom = knee_angle

        # -------------------------
        # State transitions
        # -------------------------
        if self.state == "DESCENDING":
            # entering bottom when hip is sufficiently flexed
            if target_angle < self.deep_knee_threshold:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0

        elif self.state == "BOTTOM":
            self.bottom_hold_frames += 1
            if target_angle > self.hip_angle_threshold_down:
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    # Not a valid rep
                    self.reset()
                    return None

        elif self.state == "ASCENDING":
            if target_angle > self.hip_angle_threshold_up:
                depth_classification = self._classify_depth()
                rep_data = {
                        "hip_angle_start": round(self.hip_angle_start, 2) if self.hip_angle_start is not None else None,
                        "hip_angle_at_bottom": round(self.hip_angle_at_bottom, 2) if self.hip_angle_at_bottom is not None else None,
                        "hip_angle_min": round(self.hip_angle_min, 2) if self.hip_angle_min != float("inf") else None,

                        "knee_angle_start": round(self.knee_angle_start, 2) if self.knee_angle_start is not None else None,
                        "knee_angle_at_bottom": round(self.knee_angle_at_bottom, 2) if self.knee_angle_at_bottom is not None else None,
                        "knee_angle_min": round(self.knee_angle_min, 2) if self.knee_angle_min != float("inf") else None,

                        "depth_classification": depth_classification,
                        "depth_insufficient_flag": depth_classification == "insufficient",
                }

                if debug:
                    print("hip_angle_start:", rep_data["hip_angle_start"])
                    print("hip_angle_at_bottom:", rep_data["hip_angle_at_bottom"])
                    print("hip_angle_min:", rep_data["hip_angle_min"])
                    print("knee_angle_start:", rep_data["knee_angle_start"])
                    print("knee_angle_at_bottom:", rep_data["knee_angle_at_bottom"])
                    print("knee_angle_min:", rep_data["knee_angle_min"])
                    print("depth_classification:", rep_data["depth_classification"])
                    print("depth_insufficient_flag:", rep_data["depth_insufficient_flag"])

                self.reset()
                return rep_data

        return None

    def _classify_depth(self) -> str:
        """
        Classifies squat depth using the minimum hip and knee angles seen in the rep.
        Lower angle means deeper squat.
        """
        knee_min = self.knee_angle_min

        if knee_min <= self.deep_knee_threshold:
            return "deep"

        if  knee_min <= self.parallel_knee_threshold:
            return "parallel"

        return "insufficient"
