from collections import Counter
import time
from typing import Any, Dict, List, Optional
import numpy as np
from utils.landmark_quality_methods import foot_turnout_relative


class RepCounter:
    def __init__(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.rep_count = 0
        self.hip_angle_threshold_down = 105  # Below this = in squat
        self.knee_angle_threshold_down = 105
        self.knee_angle_threshold_up = 160
        self.hip_angle_threshold_up = 160   # Above this = standing
        self.bottom_hold_frames = 0
        self.min_bottom_hold = 3  # Must hold bottom for 3 frames
    
    def update(self, hip_angle, knee_angle, camera_view, debug = False):
        """
        Update state machine with current angles
        
        Returns:
            rep_completed: Boolean (True if a rep just finished)
        """
        rep_completed = False
        target_angle = hip_angle if "side" not in camera_view else knee_angle
        
        if self.state == "STANDING":
            # Waiting for descent
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                if debug:
                    print("Descending...")
        
        elif self.state == "DESCENDING":
            # Going down, check if reached bottom
            # Bottom = hip angle reaches minimum
            if target_angle < 95:  # Deep enough
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
        
        elif self.state == "BOTTOM":
            # At bottom, waiting to ascend
            self.bottom_hold_frames += 1
            
            if target_angle > self.hip_angle_threshold_down:
                # Started ascending
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                    if debug:
                        print("Ascending...")
                else:
                    # Didn't hold bottom long enough - partial rep
                    self.state = "STANDING"
                    if debug:
                        print("Partial rep - didn't reach full depth")
        
        elif self.state == "ASCENDING":
            # Coming up, check if reached top
            if target_angle > self.hip_angle_threshold_up:
                # Rep completed!
                self.rep_count += 1
                self.state = "STANDING"
                rep_completed = True
                if debug:
                    print(f"Rep {self.rep_count} completed!")
        
        return rep_completed, self.rep_count


class TempoTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None
        self.eccentric_time = 0  # Time lowering
        self.pause_time = 0      # Time at bottom
        self.concentric_time = 0 # Time rising
        
        # Thresholds
        self.hip_angle_threshold_down = 105
        self.hip_angle_threshold_up = 160
        self.bottom_angle = 95  # What counts as "bottom"
        
        # Current rep data
        self.current_rep_tempo = None
    
    def update(self, hip_angle, knee_angle, camera_view, timestamp=None, debug = False):
        """
        Track tempo through squat phases
        
        Args:
            hip_angle: Current hip angle in degrees
            timestamp: Current time (if None, uses time.time())
        
        Returns:
            tempo_data: Dict with phase times (or None if rep not complete)
        """
        if timestamp is None:
            timestamp = time.time()
        
        tempo_data = None
        target_angle = hip_angle if "side" not in camera_view else knee_angle
        
        # State: STANDING → DESCENDING
        if self.state == "STANDING":
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.eccentric_time = 0
                if debug:
                    print("Started eccentric phase (lowering)")
        
        # State: DESCENDING (Eccentric Phase)
        elif self.state == "DESCENDING":
            self.eccentric_time = timestamp - self.phase_start_time
            
            # Check if reached bottom
            if target_angle < self.bottom_angle:
                self.state = "BOTTOM"
                self.phase_start_time = timestamp
                self.pause_time = 0
                if debug:
                    print(f"Reached bottom. Eccentric time: {self.eccentric_time:.2f}s")
        
        # State: BOTTOM (Pause Phase)
        elif self.state == "BOTTOM":
            self.pause_time = timestamp - self.phase_start_time
            
            # Check if started ascending
            if target_angle > self.bottom_angle + 10:  # Small buffer
                self.state = "ASCENDING"
                self.phase_start_time = timestamp
                self.concentric_time = 0
                if debug:
                    print(f"Started concentric phase (rising). Pause time: {self.pause_time:.2f}s")
        
        # State: ASCENDING (Concentric Phase)
        elif self.state == "ASCENDING":
            self.concentric_time = timestamp - self.phase_start_time
            
            # Check if reached top
            if target_angle > self.hip_angle_threshold_up:
                    
                # Rep completed!
                tempo_data = {
                    'eccentric': round(self.eccentric_time, 2),
                    'pause': round(self.pause_time, 2),
                    'concentric': round(self.concentric_time, 2),
                    'total_time': round(
                        self.eccentric_time + self.pause_time + self.concentric_time, 
                        2
                    ),
                    'tempo_notation': f"{self.eccentric_time:.0f}-{self.pause_time:.0f}-{self.concentric_time:.0f}",
                }
                
                self.state = "STANDING"
                self.current_rep_tempo = tempo_data
                
                if debug:
                    print(f"Rep completed! Tempo: {tempo_data['tempo_notation']}")
                    print(f"  Eccentric: {tempo_data['eccentric']}s")
                    print(f"  Pause: {tempo_data['pause']}s")
                    print(f"  Concentric: {tempo_data['concentric']}s")
                    print(f"  Total: {tempo_data['total_time']}s")
        
        return tempo_data


class BackAngleTracker:
    def __init__(self):
        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 105
        self.upright_threshold = 20
        self.warning_threshold = 40
        self.min_bottom_hold = 3

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
            if target_angle < 95:
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


class DepthTracker:
    def __init__(self):
        # Same rep phase thresholds you already use
        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 105
        self.min_bottom_hold = 3

        # Depth classification thresholds
        # Lower angle = deeper squat
        self.deep_knee_threshold = 95.0

        self.parallel_hip_threshold = 105.0
        self.parallel_knee_threshold = 105.0

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
            if target_angle < 95:
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


class StabilityTracker:
    def __init__(self):
        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 105
        self.min_bottom_hold = 3

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
            if target_angle < 95:
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
    

class AnkleTracker:

    def __init__(self):

        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 105

        self.min_bottom_hold = 3

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

            if hip_angle < 95:

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
    

class TrendAnalyzer:

    def safe_values(self,values):
        return [v for v in values if v is not None]


    def safe_mean(self,values):
        vals = self.safe_values(values)
        return round(float(np.mean(vals)), 4) if vals else None


    def safe_median(self,values):
        vals = self.safe_values(values)
        return round(float(np.median(vals)), 4) if vals else None


    def trend_slope(self,values):
        """
        Linear slope across reps.
        Positive = increasing over reps.
        """
        clean = [(i, v) for i, v in enumerate(values) if v is not None]
        if len(clean) < 2:
            return None

        x = np.array([i for i, _ in clean], dtype=np.float32)
        y = np.array([v for _, v in clean], dtype=np.float32)

        slope, _ = np.polyfit(x, y, 1)
        return round(float(slope), 4)


    def count_true(self,values):
        return sum(1 for v in values if v is True)


    def distribution(self,values):
        vals = [v for v in values if v is not None]
        return dict(Counter(vals))


    def mode_value(self,values):
        vals = [v for v in values if v is not None]
        if not vals:
            return None
        return Counter(vals).most_common(1)[0][0]


    def build_consolidated_summary(self,reps, camera_view):
        """
        Builds the consolidated block for the final JSON.
        Expects reps to be a list of rep dictionaries.
        """

        total_reps = len(reps)

        back_angle_max_values = [
            r.get("back_data", {}).get("back_angle_max")
            for r in reps
        ]

        back_angle_bottom_values = [
            r.get("back_data", {}).get("back_angle_at_bottom")
            for r in reps
        ]

        butt_wink_values = [
            r.get("back_data", {}).get("butt_wink_detected")
            for r in reps
        ]

        back_status_values = [
            r.get("back_data", {}).get("status")
            for r in reps
        ]

        knee_valgus_values = [
            r.get("stability_data", {}).get("knee_valgus_distance")
            for r in reps
        ]

        valgus_flag_values = [
            r.get("stability_data", {}).get("valgus_flag")
            for r in reps
        ]

        valgus_phase_values = [
            r.get("stability_data", {}).get("valgus_phase")
            for r in reps
        ]

        heel_lift_values = [
            r.get("stability_data", {}).get("heel_lift_detected")
            for r in reps
        ]

        depth_distribution_values = [
            r.get("depth_data", {}).get("depth_classification")
            for r in reps
        ]

        knee_angle_min_values = [
            r.get("depth_data", {}).get("knee_angle_min")
            for r in reps
        ]

        depth_insufficient_values = [
            r.get("depth_data", {}).get("depth_insufficient_flag")
            for r in reps
        ]

        ankle_dorsiflexion_values = [
            r.get("ankle_data", {}).get("dorsiflexion_at_bottom")
            for r in reps
        ]

        foot_turnout_left_values = [
            r.get("ankle_data", {}).get("foot_turnout_left")
            for r in reps
        ]

        foot_turnout_right_values = [
            r.get("ankle_data", {}).get("foot_turnout_right")
            for r in reps
        ]

        eccentric_values = [
            r.get("tempo_data", {}).get("eccentric")
            for r in reps
        ]

        pause_values = [
            r.get("tempo_data", {}).get("pause")
            for r in reps
        ]

        concentric_values = [
            r.get("tempo_data", {}).get("concentric")
            for r in reps
        ]

        total_values = [
            r.get("tempo_data", {}).get("total")
            for r in reps
        ]

        tempo_notation_values = [
            r.get("tempo_data", {}).get("tempo_notation")
            for r in reps
        ]

        if camera_view in ("front", "angled"):

            consolidated = {
                "total_reps": total_reps,

                "posture": {
                    "back_angle_max_mean": self.safe_mean(back_angle_max_values),
                    "back_angle_at_bottom_mean": self.safe_mean(back_angle_bottom_values),
                    "back_angle_trend": self.trend_slope(back_angle_max_values),
                    "status_distribution": self.distribution(back_status_values),
                },

                "stability": {
                    "knee_valgus_mean": self.safe_mean(knee_valgus_values),
                    "knee_valgus_trend": self.trend_slope(knee_valgus_values),
                    "valgus_flag_reps": self.count_true(valgus_flag_values),
                    "valgus_phase_distribution": self.distribution(valgus_phase_values),
                    "heel_lift_reps": self.count_true(heel_lift_values),
                },

                "movement_quality": {
                    "depth_distribution": self.distribution(depth_distribution_values),
                    "knee_angle_min_mean": self.safe_mean(knee_angle_min_values),
                    "depth_trend": self.trend_slope(knee_angle_min_values),
                    "depth_insufficient_reps": self.count_true(depth_insufficient_values),
                    "foot_turnout_left_mean": self.safe_mean(foot_turnout_left_values),
                    "foot_turnout_right_mean": self.safe_mean(foot_turnout_right_values),
                },

                "tempo": {
                    "eccentric_mean": self.safe_mean(eccentric_values),
                    "pause_mean": self.safe_mean(pause_values),
                    "concentric_mean": self.safe_mean(concentric_values),
                    "total_mean": self.safe_mean(total_values),
                    "total_trend": self.trend_slope(total_values),
                    "tempo_notation_mode": self.mode_value(tempo_notation_values),
                }
            }

        if "side" in camera_view:
            consolidated = {
                "total_reps": total_reps,

                "posture": {
                    "back_angle_max_mean": self.safe_mean(back_angle_max_values),
                    "back_angle_at_bottom_mean": self.safe_mean(back_angle_bottom_values),
                    "back_angle_trend": self.trend_slope(back_angle_max_values),
                    "status_distribution": self.distribution(back_status_values),
                },
                "movement_quality": {
                    "depth_distribution": self.distribution(depth_distribution_values),
                    "knee_angle_min_mean": self.safe_mean(knee_angle_min_values),
                    "depth_trend": self.trend_slope(knee_angle_min_values),
                    "depth_insufficient_reps": self.count_true(depth_insufficient_values),
                    "ankle_dorsiflexion_trend": self.mode_value(ankle_dorsiflexion_values),
                },

                "tempo": {
                    "eccentric_mean": self.safe_mean(eccentric_values),
                    "pause_mean": self.safe_mean(pause_values),
                    "concentric_mean": self.safe_mean(concentric_values),
                    "total_mean": self.safe_mean(total_values),
                    "total_trend": self.trend_slope(total_values),
                    "tempo_notation_mode": self.mode_value(tempo_notation_values),
                }
            }

        return consolidated