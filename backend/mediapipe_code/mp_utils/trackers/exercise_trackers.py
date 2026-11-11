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
                "knee_ankle_ratio_at_bottom": None,
                "knee_travel": None,
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
            "knee_ankle_ratio_at_bottom": self._knee_ankle_at_bottom(),
            "knee_travel": self._knee_travel(),
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

            ankle_width = abs(norm_pose[27].x - norm_pose[28].x)
            hip_y = (norm_pose[23].y + norm_pose[24].y) / 2
            return {
                "knee_distance": knee_width,
                "shoulder_width": shoulder_width,
                "knee_ratio": knee_width / shoulder_width,
                "ankle_distance": ankle_width,
                "hip_y": hip_y,
            }
        except Exception:
            return {"knee_distance": None, "shoulder_width": None, "knee_ratio": None}

    def _knee_travel(self):
        """How much the knees move in and out during the rep (front view): the summed change in knee gap / ankle gap from frame to frame.
        Compare reps of the SAME set only: it does not separate a good clip from a faulty one (the good test clip moves as much as the faulty one),
        but within a set the rep that looks shaky has about twice the travel of a steady one."""
        series = [f["knee_distance"] / f["ankle_distance"] for f in self.rep_frames if f.get("knee_distance") is not None and f.get("ankle_distance") and f["ankle_distance"] > 1e-6]
        if len(series) < 4:
            return None
        return round(sum(abs(b - a) for a, b in zip(series, series[1:])), 3)

    def _knee_ankle_at_bottom(self):
        """How wide the knees are compared with the feet, at the bottom of the rep (front view).
        Knees that stay about as close together as the feet (ratio near 1.0) are caving in; they normally travel out as you sit.
        The ratio depends on stance width, so it is only a rough cut until we have labelled front videos."""
        frames = [f for f in self.rep_frames if f.get("hip_y") is not None and f.get("ankle_distance")]
        if len(frames) < 3:
            return None
        lowest = max(f["hip_y"] for f in frames)
        top = min(f["hip_y"] for f in frames)
        near = [f for f in frames if f["hip_y"] >= lowest - 0.15 * (lowest - top)]
        vals = sorted(f["knee_distance"] / f["ankle_distance"] for f in near if f["ankle_distance"] > 1e-6)
        return round(vals[len(vals) // 2], 3) if vals else None

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
    Tempo tracker. Measures how long each rep takes to lower, how long it spends near the bottom, and how long
    it takes to come back up, from the shape of the hip angle over the rep.

    The earlier version timed the gaps between angle threshold crossings (150, 120, 155 degrees) and added a fixed
    0.3 s to each. Those gaps are only a slice of the real movement, so lowering time was badly under-reported and
    the bottom time over-reported. This version looks at the whole rep:
      - near the top    = within 15% of the rep's own range of its highest angle
      - near the bottom = within 15% of the rep's own range of its lowest angle
    (Replaced by movement versus stillness; see _phases.)
    """
    BAND = 0.15
    MIN_RANGE_DEG = 20.0

    def __init__(self):
        self.samples = []   # (timestamp seconds, hip angle) since the last completed rep
        self.reset()

    def reset(self):
        # kept for the older event calls; the timing no longer depends on them
        self.phase_start_time = None

    def update_frame(self, timestamp, hip_angle):
        if hip_angle is not None:
            self.samples.append((timestamp, float(hip_angle)))

    def on_descending(self, timestamp):
        pass

    def on_bottom_reached(self, timestamp):
        pass

    def on_ascending_started(self, timestamp):
        pass

    STILL = 0.15      # slower than this fraction of the rep's top speed counts as "still"
    ZONE = 0.25       # "near the top / bottom" = within this fraction of the rep's range

    def _phases(self):
        """Lowering, bottom and lifting times from movement versus stillness.
        Lowering = hips moving down. Bottom = hips still near the bottom. Lifting = hips moving up."""
        pts = self.samples
        if len(pts) < 5:
            return None
        t = [p[0] for p in pts]
        a = [p[1] for p in pts]
        top, bottom = max(a), min(a)
        rng = top - bottom
        if rng < self.MIN_RANGE_DEG:
            return None
        # speed from neighbouring samples (central difference)
        n = len(a)
        speed = [0.0] * n
        for i in range(1, n - 1):
            dt = t[i + 1] - t[i - 1]
            speed[i] = abs(a[i + 1] - a[i - 1]) / dt if dt > 0 else 0.0
        vmax = max(speed)
        if vmax <= 0:
            return None
        still = [v < self.STILL * vmax for v in speed]
        in_top = [v >= top - self.ZONE * rng for v in a]
        in_bottom = [v <= bottom + self.ZONE * rng for v in a]
        i_min = a.index(bottom)

        # lowering starts where the stillness at the top ends (or at the highest point if there is none)
        i0 = i_min
        while i0 > 0 and not (still[i0] and in_top[i0]):
            i0 -= 1
        if i0 == 0 and not (still[0] and in_top[0]):
            i0 = max(range(0, i_min + 1), key=lambda k: a[k])
        # the bottom starts when the hips stop moving near the bottom (or at the lowest point)
        i1 = i0
        while i1 < i_min and not (still[i1] and in_bottom[i1]):
            i1 += 1
        # ... and ends when they start moving up again
        i2 = max(i1, i_min)
        while i2 < n - 1 and in_bottom[i2 + 1] and still[i2 + 1]:
            i2 += 1
        # lifting ends when they are still near the top again (or at the highest point afterwards)
        i3 = i2
        while i3 < n - 1 and not (still[i3] and in_top[i3]):
            i3 += 1
        return t[i1] - t[i0], t[i2] - t[i1], t[i3] - t[i2]

    def on_rep_completed(self, timestamp):
        ph = self._phases()
        if ph is None:
            ecc = pause = conc = 0.0
        else:
            ecc, pause, conc = ph
        total_time = ecc + pause + conc
        # the next rep starts from the last sample of this one
        self.samples = self.samples[-1:] if self.samples else []
        return {
            "eccentric": round(ecc, 2),
            "pause": round(pause, 2),
            "concentric": round(conc, 2),
            "total_time": round(total_time, 2),
            "tempo_notation": f"{ecc:.0f}-{pause:.0f}-{conc:.0f}",
        }

    def on_reset(self):
        self.reset()
