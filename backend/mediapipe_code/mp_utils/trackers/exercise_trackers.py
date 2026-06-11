import math
import time
from mediapipe_code.mp_utils.quality.landmark_quality_methods import foot_turnout_relative


class PassiveAnkleTracker:
    """
    Passive Ankle & Turnout Tracker.
    Calculates foot turnout at the top and ankle dorsiflexion at the bottom of the squat,
    without running a duplicate state machine.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.dorsiflexion_at_bottom = 0.0
        self.min_hip_angle = 999.0
        self.foot_turnout_left = None
        self.foot_turnout_right = None

    def update_frame(self, hip_angle, dorsiflexion, pose_world, is_standing):
        if is_standing:
            if hip_angle >= 150:
                left_turnout = foot_turnout_relative(
                    pose_world[29], pose_world[31], pose_world[24], pose_world[23]
                )
                right_turnout = foot_turnout_relative(
                    pose_world[30], pose_world[32], pose_world[24], pose_world[23]
                )
                if left_turnout is not None:
                    self.foot_turnout_left = left_turnout
                if right_turnout is not None:
                    self.foot_turnout_right = right_turnout
        else:
            if hip_angle < self.min_hip_angle:
                self.min_hip_angle = hip_angle
                self.dorsiflexion_at_bottom = dorsiflexion

    def on_descending(self, hip_angle, dorsiflexion):
        self.min_hip_angle = hip_angle
        self.dorsiflexion_at_bottom = dorsiflexion

    def on_rep_completed(self, camera_view):
        dorsiflexion_at_bottom = self.dorsiflexion_at_bottom
        if "side" in camera_view:
            if dorsiflexion_at_bottom >= 30:
                status = "good"
            elif dorsiflexion_at_bottom >= 20:
                status = "mild_restriction"
            elif dorsiflexion_at_bottom >= 10:
                status = "moderate_restriction"
            else:
                status = "severe_restriction"
        else:
            status = (
                "good"
                if dorsiflexion_at_bottom >= 25
                else "restricted"
            )
            
        
        self.dorsiflexion_status = status 

        ankle_data = {
            "dorsiflexion_at_bottom": dorsiflexion_at_bottom,
            "dorsiflexion_status": status,
            "foot_turnout_left": round(self.foot_turnout_left, 2) if self.foot_turnout_left is not None else None,
            "foot_turnout_right": round(self.foot_turnout_right, 2) if self.foot_turnout_right is not None else None,
        }
        self.reset()
        return ankle_data

    def on_reset(self):
        self.reset()


class PassiveBackAngleTracker:
    """
    Passive Back Angle & Posture Tracker.
    Calculates torso alignment, maximum back angle, and forward lean times.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.max_back_angle = 0.0
        self.back_angle_start = None
        self.back_angle_at_bottom = None
        self.min_hip_angle = float("inf")
        self.time_upright = 0.0
        self.time_warning = 0.0
        self.time_excessive = 0.0
        self.torso_samples = []
        self.torso_baseline = None
        self.max_torso_deviation = 0.0
        self.last_timestamp = None

    def update_frame(self, back_angle, hip_angle, torso_angle, timestamp, is_standing):
        if timestamp is None:
            timestamp = time.time()
        
        dt = timestamp - self.last_timestamp if self.last_timestamp is not None else 0.0
        self.last_timestamp = timestamp

        if is_standing:
            if torso_angle is not None and hip_angle >= 150:
                self.torso_samples.append(torso_angle)
                if len(self.torso_samples) > 5:
                    self.torso_samples.pop(0)
                self.torso_baseline = sum(self.torso_samples) / len(self.torso_samples)
        else:
            if dt > 0:
                if back_angle <= 20:
                    self.time_upright += dt
                elif back_angle <= 40:
                    self.time_warning += dt
                else:
                    self.time_excessive += dt

            if back_angle > self.max_back_angle:
                self.max_back_angle = back_angle

            if hip_angle < self.min_hip_angle:
                self.min_hip_angle = hip_angle
                self.back_angle_at_bottom = back_angle

            if torso_angle is not None and self.torso_baseline is not None and hip_angle <= 110:
                deviation = self.torso_baseline - torso_angle
                if deviation > self.max_torso_deviation:
                    self.max_torso_deviation = deviation

    def on_descending(self, back_angle, hip_angle, timestamp):
        self.back_angle_start = back_angle
        self.back_angle_at_bottom = back_angle
        self.max_back_angle = back_angle
        self.min_hip_angle = hip_angle
        self.last_timestamp = timestamp
        self.max_torso_deviation = 0.0

    def on_rep_completed(self, camera_view):
        if self.back_angle_at_bottom is None:
            self.back_angle_at_bottom = 0.0
            
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
            "back_angle_start": round(self.back_angle_start, 2) if self.back_angle_start is not None else 0.0,
            "back_angle_max": round(self.max_back_angle, 2),
            "back_angle_at_bottom": round(self.back_angle_at_bottom, 2),
            "time_upright": round(self.time_upright, 2),
            "time_warning": round(self.time_warning, 2),
            "time_excessive": round(self.time_excessive, 2),
            "back_label": status,
        }
        self.reset()
        return rep_data

    def on_reset(self):
        self.reset()


class PassiveDepthTracker:
    """
    Passive Squat Depth & Position Tracker.
    Measures depth class using camera view tables and confirms hip crease position relative to knee.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.hip_angle_start = 0.0
        self.knee_angle_start = 0.0
        self.hip_angle_at_bottom = 0.0
        self.knee_angle_at_bottom = 0.0
        self.hip_angle_min = 999.0
        self.knee_angle_min = 999.0
        self.hip_y_at_bottom = None
        self.knee_y_at_bottom = None

    def update_frame(self, hip_angle, knee_angle, hip_y, knee_y, is_standing):
        if not is_standing:
            if hip_angle < self.hip_angle_min:
                self.hip_angle_min = hip_angle
                self.hip_angle_at_bottom = hip_angle

            if knee_angle < self.knee_angle_min:
                self.knee_angle_min = knee_angle
                self.knee_angle_at_bottom = knee_angle
                self.hip_y_at_bottom = hip_y
                self.knee_y_at_bottom = knee_y

    def on_descending(self, hip_angle, knee_angle, hip_y, knee_y):
        self.hip_angle_start = hip_angle
        self.knee_angle_start = knee_angle
        self.hip_angle_at_bottom = hip_angle
        self.knee_angle_at_bottom = knee_angle
        self.hip_angle_min = hip_angle
        self.knee_angle_min = knee_angle
        self.hip_y_at_bottom = hip_y
        self.knee_y_at_bottom = knee_y

    def on_rep_completed(self, camera_view):
        # Step 1: positional check (hip y lower on screen/larger than knee y = achieved depth)
        if self.hip_y_at_bottom is not None and self.knee_y_at_bottom is not None:
            if self.hip_y_at_bottom <= self.knee_y_at_bottom:
                rep_data = self._make_data("Warning", True)
                self.reset()
                return rep_data

        # Step 2: grade depth by camera angle thresholds
        flag = False
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

        rep_data = self._make_data(depth_classification, flag)
        self.reset()
        return rep_data

    def _make_data(self, label, flag):
        return {
            "hip_angle_start": round(self.hip_angle_start, 2),
            "hip_angle_at_bottom": round(self.hip_angle_at_bottom, 2),
            "hip_angle_min": round(self.hip_angle_min, 2),
            "knee_angle_start": round(self.knee_angle_start, 2),
            "knee_angle_at_bottom": round(self.knee_angle_at_bottom, 2),
            "knee_angle_min": round(self.knee_angle_min, 2),
            "depth_classification": label,
            "depth_insufficient_flag": flag,
        }

    def on_reset(self):
        self.reset()


class PassiveStabilityTracker:
    """
    Passive Stability & Valgus Tracker.
    Analyzes horizontal knee tracking stability without running state loops.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.rep_frames = []
        self.valgus_limit_threshold = 0.22

    def update_frame(self, norm_pose, is_standing):
        if not is_standing:
            self.rep_frames.append(self._extract_frame_data(norm_pose))

    def on_descending(self, norm_pose):
        self.rep_frames = [self._extract_frame_data(norm_pose)]

    def on_rep_completed(self, camera_view):
        if camera_view.startswith("side") or not self.rep_frames:
            self.reset()
            return {
                "knee_valgus_distance": None,
                "knee_gap_hip_gap_ratio": None,
                "valgus_severity": None,
                "valgus_label": None,
                "valgus_phase": None,
                "valgus_flag": None,
            }

        knee_valgus_distance, valgus_phase, valgus_flag = self._classify_valgus_phase()

        if knee_valgus_distance is None:
            self.reset()
            return None

        ratio = 1 - knee_valgus_distance
        if ratio >= 0.95:
            valgus_severity = 'severe'
        elif ratio >= 0.90:
            valgus_severity = 'moderate'
        elif ratio >= 0.80:
            valgus_severity = 'mild'
        else:
            valgus_severity = 'none'


        stability_data = {
            "knee_valgus_distance": knee_valgus_distance,
            "knee_gap_hip_gap_ratio": ratio,
            "valgus_severity": valgus_severity,
            "valgus_label": "Warning" if valgus_flag else "Good",
            "valgus_phase": valgus_phase,
            "valgus_flag": valgus_flag,
        }
        self.reset()
        return stability_data

    def _extract_frame_data(self, norm_pose):
        try:
            left_shoulder = norm_pose[11]
            right_shoulder = norm_pose[12]
            left_knee = norm_pose[25]
            right_knee = norm_pose[26]

            shoulder_width = abs(left_shoulder.x - right_shoulder.x)
            knee_width = abs(left_knee.x - right_knee.x)

            if shoulder_width <= 1e-6:
                return {"knee_distance": None, "shoulder_width": None, "knee_ratio": None}

            return {
                "knee_distance": knee_width,
                "shoulder_width": shoulder_width,
                "knee_ratio": knee_width / shoulder_width,
            }
        except Exception:
            return {"knee_distance": None, "shoulder_width": None, "knee_ratio": None}

    def _classify_valgus_phase(self):
        """
        Find the minimum knee distance during the rep
        and classify where it occurred.
        """

        if not self.rep_frames:
            return None, None, False

        min_dist = None
        min_pos = None
        min_shoulder_width = None

        for i, frame in enumerate(self.rep_frames):
            dist = frame["knee_distance"]
            shoulder_width = frame["shoulder_width"]
            ratio = frame["knee_ratio"]

            if dist is None or shoulder_width is None or ratio is None:
                continue

            if min_dist is None or dist < min_dist:
                min_dist = dist
                min_pos = i
                min_shoulder_width = shoulder_width

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
            min_shoulder_width is not None
            and min_dist <= min_shoulder_width
        )

        return (
            round(min_dist, 4),
            phase,
            valgus_flag,
        )

    def on_reset(self):
        self.reset()


class PassiveTempoTracker:
    """
    Passive Tempo & Eccentric/Concentric Duration Tracker.
    Precisely measures repetition phase intervals without parallel state processing.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.phase_start_time = None
        self.eccentric_time = 0.0
        self.pause_time = 0.0
        self.concentric_time = 0.0

    def on_descending(self, timestamp):
        self.phase_start_time = timestamp
        self.eccentric_time = 0.0
        self.pause_time = 0.0
        self.concentric_time = 0.0

    def on_bottom_reached(self, timestamp):
        if self.phase_start_time is not None:
            self.eccentric_time = timestamp - self.phase_start_time
        self.phase_start_time = timestamp

    def on_ascending_started(self, timestamp):
        if self.phase_start_time is not None:
            self.pause_time = timestamp - self.phase_start_time
        self.phase_start_time = timestamp

    def on_rep_completed(self, timestamp):
        if self.phase_start_time is not None:
            self.concentric_time = timestamp - self.phase_start_time

        # Processing compensation for downsampled/skipped video frames (0.3s per transition)
        self.eccentric_time += 0.3
        self.concentric_time += 0.3
        self.pause_time += 0.3
        total_time = self.eccentric_time + self.pause_time + self.concentric_time

        tempo_data = {
            "eccentric": round(self.eccentric_time, 2),
            "pause": round(self.pause_time, 2),
            "concentric": round(self.concentric_time, 2),
            "total_time": round(total_time, 2),
            "tempo_notation": f"{self.eccentric_time:.0f}-{self.pause_time:.0f}-{self.concentric_time:.0f}",
        }
        self.reset()
        return tempo_data

    def on_reset(self):
        self.reset()
