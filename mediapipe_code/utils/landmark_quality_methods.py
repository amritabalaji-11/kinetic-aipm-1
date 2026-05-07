from collections import defaultdict
from typing import Any, Dict, List, Optional
from utils.angle_methods import calculate_hip_angle, calculate_knee_angle, calculate_torso_pelvis_angle
from utils.landmark_quality_configuration import (
    ACCEPTABLE_THRESHOLD, CRITICAL_HARD_FLOOR, GOOD_THRESHOLD, PRESENCE_THRESHOLD, VISIBILITY_THRESHOLD, FrameAssessment, FrameLandmarkData)


def landmark_name(name: str) -> str:
    """
    Normalize the landmark name for use as a dictionary key.    
    """
    return name.lower()


def get_first_pose(result: Any):
    """
    Attempt to retrieve the first detected pose, tolerating different attribute names
    depending on the version/configuration.
    """
    world_list = (
        getattr(result, "pose_world_landmarks", None)
        or getattr(result, "world_landmarks", None)
    )
    norm_list = (
        getattr(result, "pose_landmarks", None)
        or getattr(result, "landmarks", None)
    )

    if world_list and norm_list:
        return world_list[0], norm_list[0]

    return None, None


def safe_get_landmark(lm_list: List[Any], idx: int) -> Optional[Any]:
    """
    Returns the landmark by index if it exists; otherwise, it returns None.    
    """
    if lm_list is None:
        return None
    if idx < 0 or idx >= len(lm_list):
        return None
    return lm_list[idx]


def extract_frame_landmark_data(world_lm: Any, norm_lm: Any) -> FrameLandmarkData:
    """
    x/y/z originate from the 3D world landmark.
    x/y originate from 2D landmark.
    Visibility/presence originate from the normalized landmark.   
    """
    return FrameLandmarkData(
        x=float(getattr(world_lm, "x", 0.0) or 0.0),
        y=float(getattr(world_lm, "y", 0.0) or 0.0),
        z=float(getattr(world_lm, "z", 0.0) or 0.0),
        screen_x=float(getattr(norm_lm, "x", 0.0) or 0.0),
        screen_y=float(getattr(norm_lm, "y", 0.0) or 0.0),
        visibility=float(getattr(norm_lm, "visibility", 0.0) or 0.0),
        presence=float(getattr(norm_lm, "presence", 0.0) or 0.0)
    )


def landmark_is_reliable(lm: Any) -> bool:
    """
    True if the landmark exceeds the visibility and presence gate.    
    """
    if lm is None:
        return False

    visibility = float(getattr(lm, "visibility", 0.0) or 0.0)
    presence = float(getattr(lm, "presence", 0.0) or 0.0)

    return visibility >= VISIBILITY_THRESHOLD and presence >= PRESENCE_THRESHOLD


def get_rep_angles(landmarks, world_pose, camera_view):
        sides = []

        if camera_view in ["front", "angled"]:
            sides = ["LEFT", "RIGHT"]
        elif camera_view == "side_left":
            sides = ["LEFT"]
        elif camera_view == "side_right":
            sides = ["RIGHT"]

        hip_angles = []
        knee_angles = []

        for side in sides:
            shoulder = safe_get_landmark(world_pose, landmarks[f"{side}_SHOULDER"]["id"])
            hip = safe_get_landmark(world_pose, landmarks[f"{side}_HIP"]["id"])
            knee = safe_get_landmark(world_pose, landmarks[f"{side}_KNEE"]["id"])
            ankle = safe_get_landmark(world_pose, landmarks[f"{side}_ANKLE"]["id"])

            if shoulder is not None and hip is not None and knee is not None:
                hip_angles.append(calculate_hip_angle(shoulder, hip, knee))

            if hip is not None and knee is not None and ankle is not None:
                knee_angles.append(calculate_knee_angle(hip, knee, ankle))

        if not hip_angles:
            return None, None

        hip_angle = sum(hip_angles) / len(hip_angles)
        knee_angle = sum(knee_angles) / len(knee_angles) if knee_angles else None

        return hip_angle, knee_angle
    

def select_landmarks_by_view(all_landmarks, critical_landmarks, camera_view: str):
        """
        Selects which landmarks should be evaluated
        depending on camera orientation.
        """

        # Front or angled:
        # evaluate everything
        if camera_view in ["front", "angled"]:
            return (
                all_landmarks,
                critical_landmarks
            )

        # Left side view:
        # only LEFT landmarks
        if camera_view == "side_left":

            active_landmarks = [
                name for name in all_landmarks
                if name.startswith("LEFT") or name == "NOSE"
            ]

            active_critical = [
                name for name in critical_landmarks
                if name.startswith("LEFT")
            ]

            return active_landmarks, active_critical

        # Right side view:
        # only RIGHT landmarks
        if camera_view == "side_right":

            active_landmarks = [
                name for name in all_landmarks
                if name.startswith("RIGHT") or name == "NOSE"
            ]

            active_critical = [
                name for name in critical_landmarks
                if name.startswith("RIGHT")
            ]

            return active_landmarks, active_critical

        # Fallback
        return [], []


def compute_reliability(
        all_landmarks, critical_landmarks,
        frames: List[FrameAssessment]
    ) -> Dict[str, float]:
        """
        Returns reliability only for landmarks that were actually expected
        according to camera_view / frame configuration.
        """

        counts: Dict[str, int] = {}
        expected_counts: Dict[str, int] = {}

        for frame in frames:
            active_landmarks, _ = select_landmarks_by_view(all_landmarks, critical_landmarks, frame.camera_view)

            for name in active_landmarks:
                if name not in counts:
                    counts[name] = 0
                    expected_counts[name] = 0

                expected_counts[name] += 1

                lm = frame.tracked_landmarks.get(name)
                if (
                    lm is not None
                    and lm.visibility >= VISIBILITY_THRESHOLD
                    and lm.presence >= PRESENCE_THRESHOLD
                ):
                    counts[name] += 1

        return {
            name: counts[name] / expected_counts[name]
            for name in expected_counts
            if expected_counts[name] > 0
        }


def compute_composite_score(weights, reliability_by_landmark: Dict[str, float], frames: List[FrameAssessment]) -> float:
        """
        For each landmark returns reliability x biomechanical weight
        Output: 0 - 1 (e.g 0.82 = acceptable)
        """
        expected_landmarks = set()

        for frame in frames:
            expected_landmarks.update(frame.expected_landmarks)

        total_weight = 0.0
        weighted_score = 0.0

        for name in expected_landmarks:

            weight = weights.get(name, 0.0)
            reliability = reliability_by_landmark.get(name, 0.0)

            weighted_score += weight * reliability
            total_weight += weight

        if total_weight == 0:
            return 0.0

        normalized_score = weighted_score / total_weight

        return round(normalized_score, 4)


def apply_hard_floor(
        reliability_by_landmark: Dict[str, float],
        frames: List[FrameAssessment]
    ) -> List[str]:
        """
        Returns a list of critical occlusions only for landmarks
        that were actually expected by camera view.
        """
        flags = []

        expected_critical = set()
        for frame in frames:
            expected_critical.update(frame.expected_critical_landmarks)

        for name in expected_critical:
            r = reliability_by_landmark.get(name, 0.0)
            if r < CRITICAL_HARD_FLOOR:
                flags.append(
                    f"CRITICAL_OCCLUSION: {name} visible in only {r*100:.0f}% of frames"
                )

        return flags


def score_status(composite_score: float) -> str:
        if composite_score >= GOOD_THRESHOLD:
            return "GOOD"
        if composite_score >= ACCEPTABLE_THRESHOLD:
            return "ACCEPTABLE"
        return "POOR"


def view_sides(camera_view: str) -> List[str]:
        if camera_view == "side_left":
            return ["LEFT"]
        if camera_view == "side_right":
            return ["RIGHT"]
        return ["LEFT", "RIGHT"]
    

def get_landmark_for_side(
        frame: FrameAssessment,
        base_name: str,
        side: str
    ) -> Optional[FrameLandmarkData]:
        return frame.tracked_landmarks.get(f"{side}_{base_name}")


def get_midpoint_or_side(
        frame: FrameAssessment,
        base_name: str,
        camera_view: str
    ) -> Optional[FrameLandmarkData]:
        sides = view_sides(camera_view)

        if len(sides) == 1:
            return get_landmark_for_side(frame, base_name, sides[0])

        left = get_landmark_for_side(frame, base_name, "LEFT")
        right = get_landmark_for_side(frame, base_name, "RIGHT")

        return midpoint_landmark(left, right)


def annotate_points_of_max_error(frames: List[FrameAssessment]) -> None:
        rep_groups = defaultdict(list)

        for frame in frames:
            if frame.rep_index is not None:# and frame.passes_critical_gate:
                rep_groups[frame.rep_index].append(frame)

        for rep_idx, rep_frames in rep_groups.items():
            if not rep_frames:
                continue

            rep_frames = sorted(rep_frames, key=lambda f: f.frame_index)

            top_frame = next((f for f in rep_frames if f.position_tag == "top"), None)
            bottom_frame = next((f for f in rep_frames if f.position_tag == "bottom"), None)

            if top_frame is None or bottom_frame is None:
                continue

            # ---------------------------------------------------
            # 1) Max Depth Error -> only on bottom frame
            # ---------------------------------------------------
            flag_depth_insufficient(bottom_frame)

            # ---------------------------------------------------
            # 2) Max Knee Valgus -> first 10-20% of concentric phase
            # ---------------------------------------------------
            flag_max_knee_valgus(rep_frames, bottom_frame, top_frame)

            # ---------------------------------------------------
            # 3) Butt Wink -> around bottom, compared to top baseline
            # ---------------------------------------------------
            flag_butt_wink(rep_frames, top_frame, bottom_frame)


def flag_depth_insufficient(bottom_frame: FrameAssessment) -> None:
        camera_view = bottom_frame.camera_view
        sides = view_sides(camera_view)

        if len(sides) == 1:
            side = sides[0]

            hip = get_landmark_for_side(bottom_frame, "HIP", side)
            knee = get_landmark_for_side(bottom_frame, "KNEE", side)
            ankle = get_landmark_for_side(bottom_frame, "ANKLE", side)

            if hip is None or knee is None or ankle is None:
                return

            knee_angle_deg = calculate_knee_angle(hip, knee, ankle)

        else:
            left_hip = bottom_frame.tracked_landmarks.get("LEFT_HIP")
            right_hip = bottom_frame.tracked_landmarks.get("RIGHT_HIP")
            left_knee = bottom_frame.tracked_landmarks.get("LEFT_KNEE")
            right_knee = bottom_frame.tracked_landmarks.get("RIGHT_KNEE")
            left_ankle = bottom_frame.tracked_landmarks.get("LEFT_ANKLE")
            right_ankle = bottom_frame.tracked_landmarks.get("RIGHT_ANKLE")

            if not all([left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle]):
                return

            hip_mid = midpoint_landmark(left_hip, right_hip)
            knee_mid = midpoint_landmark(left_knee, right_knee)
            ankle_mid = midpoint_landmark(left_ankle, right_ankle)

            if hip_mid is None or knee_mid is None or ankle_mid is None:
                return

            knee_angle_deg = calculate_knee_angle(hip_mid, knee_mid, ankle_mid)


        if knee_angle_deg > 100:
            bottom_frame.error_flags.append("depth_insufficient")
            bottom_frame.error_values["knee_angle_at_depth"] = round(knee_angle_deg, 2)


def flag_max_knee_valgus(
        rep_frames: List[FrameAssessment],
        bottom_frame: FrameAssessment,
        top_frame: FrameAssessment,
    ) -> None:
        if bottom_frame.camera_view not in ["front", "angled"]:
            return

        if bottom_frame.frame_index >= top_frame.frame_index:
            return

        concentric_frames = [
            f for f in rep_frames
            if bottom_frame.frame_index <= f.frame_index <= top_frame.frame_index
        ]

        if not concentric_frames:
            return

        window_size = max(1, int(len(concentric_frames) * 0.20))
        window_frames = concentric_frames[:window_size]

        best_frame = None
        best_distance = None

        for frame in window_frames:
            left_knee = frame.tracked_landmarks.get("LEFT_KNEE")
            right_knee = frame.tracked_landmarks.get("RIGHT_KNEE")

            if left_knee is None or right_knee is None:
                continue

            knee_x_distance = abs(left_knee.screen_x - right_knee.screen_x)

            if best_distance is None or knee_x_distance < best_distance:
                best_distance = knee_x_distance
                best_frame = frame


        if best_frame is not None and best_distance is not None:
            best_frame.error_flags.append("max_knee_valgus")
            best_frame.error_values["knee_x_distance"] = round(best_distance, 4)


def flag_butt_wink(
        rep_frames: List[FrameAssessment],
        top_frame: FrameAssessment,
        bottom_frame: FrameAssessment,
    ) -> None:
        baseline_angle = torso_pelvis_angle_from_frame(top_frame)

        if baseline_angle is None:
            return

        search_window = [
            f for f in rep_frames
            if abs(f.frame_index - bottom_frame.frame_index) <= 10
        ]

        best_frame = None
        best_deviation = 0.0

        for frame in search_window:
            angle = torso_pelvis_angle_from_frame(frame)
            if angle is None:
                continue

            deviation = angle - baseline_angle
            if deviation > best_deviation:
                best_deviation = deviation
                best_frame = frame


        if best_frame is not None and best_deviation > 15:
            best_frame.error_flags.append("butt_wink")
            best_frame.error_values["pelvic_deviation_deg"] = round(best_deviation, 2)


def torso_pelvis_angle_from_frame(frame: FrameAssessment) -> Optional[float]:
        camera_view = frame.camera_view
        sides = view_sides(camera_view)

        if len(sides) == 1:
            side = sides[0]

            shoulder = get_landmark_for_side(frame, "SHOULDER", side)
            hip = get_landmark_for_side(frame, "HIP", side)
            knee = get_landmark_for_side(frame, "KNEE", side)

            if shoulder is None or hip is None or knee is None:
                return None

            return calculate_torso_pelvis_angle(shoulder, hip, knee)

        left_shoulder = frame.tracked_landmarks.get("LEFT_SHOULDER")
        right_shoulder = frame.tracked_landmarks.get("RIGHT_SHOULDER")
        left_hip = frame.tracked_landmarks.get("LEFT_HIP")
        right_hip = frame.tracked_landmarks.get("RIGHT_HIP")
        left_knee = frame.tracked_landmarks.get("LEFT_KNEE")
        right_knee = frame.tracked_landmarks.get("RIGHT_KNEE")

        if not all([left_shoulder, right_shoulder, left_hip, right_hip, left_knee, right_knee]):
            return None

        shoulder_mid = midpoint_landmark(left_shoulder, right_shoulder)
        hip_mid = midpoint_landmark(left_hip, right_hip)
        knee_mid = midpoint_landmark(left_knee, right_knee)

        if shoulder_mid is None or hip_mid is None or knee_mid is None:
            return None

        return calculate_torso_pelvis_angle(shoulder_mid, hip_mid, knee_mid)


def midpoint_landmark(
        left: Optional[FrameLandmarkData],
        right: Optional[FrameLandmarkData],
    ) -> Optional[FrameLandmarkData]:
        if left is None and right is None:
            return None
        if left is None:
            return right
        if right is None:
            return left

        return FrameLandmarkData(
            x=(left.x + right.x) / 2.0,
            y=(left.y + right.y) / 2.0,
            z=(left.z + right.z) / 2.0,
            screen_x=(left.screen_x + right.screen_x) / 2.0,
            screen_y=(left.screen_y + right.screen_y) / 2.0,
            visibility=min(left.visibility, right.visibility),
            presence=min(left.presence, right.presence),
        )


def compute_frame_reliability(
        tracked_landmarks: Dict[str, FrameLandmarkData],
        critical_landmarks: List[str],
    ) -> tuple[bool, float, List[str]]:
        """
        every critical landmark must pass visibility + presence in this frame.
        frame_reliability = lowest critical landmark confidence in this frame
        """
        critical_failures = []
        scores = []

        for name in critical_landmarks:
            lm = tracked_landmarks.get(name)

            if lm is None:
                critical_failures.append(f"{name}:missing")
                return False, 0.0, critical_failures

            score = min(lm.visibility, lm.presence)
            scores.append(score)

            if lm.visibility < VISIBILITY_THRESHOLD or lm.presence < PRESENCE_THRESHOLD:
                critical_failures.append(
                    f"{name}:visibility={lm.visibility:.2f},presence={lm.presence:.2f}"
                )

        frame_reliability = min(scores) if scores else 0.0

        return frame_reliability

    
def find_rep(frame_index: int, rep_segments: List[tuple[int, int]]) -> Optional[int]:
        """
        Gate 2 — Rep membership
        """
        for rep_idx, (start_frame, end_frame) in enumerate(rep_segments):
            if start_frame <= frame_index <= end_frame:
                return rep_idx
        return None
    

def hip_center_y(frame: FrameAssessment) -> float:
        """
        Gate 3 — Top / bottom tagging per rep
        """
        left = frame.tracked_landmarks.get("LEFT_HIP")
        right = frame.tracked_landmarks.get("RIGHT_HIP")

        if left and right:
            return (left.y + right.y) / 2.0
        if left:
            return left.y
        if right:
            return right.y
        return 0.0
    

def passes_key_frame_gate(frame: FrameAssessment) -> bool:
        """
        Check if the frame has a visibility and presence greater than 0.85
        """
        for name in frame.expected_critical_landmarks + frame.expected_important_landmarks:
            lm = frame.tracked_landmarks.get(name)
            if lm is None:
                return False
            if lm.visibility < 0.85 or lm.presence < 0.85:
                return False
        return True


def tag_key_positions(frames: List[FrameAssessment]) -> None:
        rep_groups = defaultdict(list)

        for frame in frames:
            if frame.rep_index is not None:# and frame.passes_critical_gate:
                rep_groups[frame.rep_index].append(frame)

        for rep_idx, rep_frames in rep_groups.items():
            if not rep_frames:
                continue

            top_frame = min(rep_frames, key=hip_center_y)
            bottom_frame = max(rep_frames, key=hip_center_y)

            top_frame.position_tag = "top"
            bottom_frame.position_tag = "bottom"

            top_frame.key_frame_reliable = passes_key_frame_gate(top_frame)
            bottom_frame.key_frame_reliable = passes_key_frame_gate(bottom_frame)