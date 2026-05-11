from collections import Counter, defaultdict
from statistics import median
import numpy as np
from typing import Any, Dict, List, Optional
from utils.angle_methods import calculate_hip_angle, calculate_knee_angle, calculate_torso_pelvis_angle, femur_vertical_angle
from utils.landmark_quality_configuration import (
    ACCEPTABLE_THRESHOLD, CRITICAL_HARD_FLOOR, GOOD_THRESHOLD, PRESENCE_THRESHOLD, VISIBILITY_THRESHOLD, BackAngleRepMetrics, FrameAssessment, FrameLandmarkData)


CRITICAL_SIDE_JOINTS = ["HIP", "KNEE", "ANKLE", "FOOT", "SHOULDER", "ANKLE"]


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


def get_dominant_camera_view(frames: List[FrameAssessment]) -> str:
    views = [
        frame.camera_view
        for frame in frames
        if frame.camera_view not in (None, "unknown")
    ]
    if not views:
        return "unknown"
    return Counter(views).most_common(1)[0][0]


def compute_landmark_medians(
    frames: List[FrameAssessment],
    landmark_names: List[str],
) -> Dict[str, Dict[str, float]]:
    values: Dict[str, Dict[str, List[float]]] = {
        name: {"visibility": [], "presence": []}
        for name in landmark_names
    }

    for frame in frames:
        for name in landmark_names:
            lm = frame.tracked_landmarks.get(name)
            if lm is None:
                continue
            values[name]["visibility"].append(lm.visibility)
            values[name]["presence"].append(lm.presence)

    return {
        name: {
            "median_visibility": median(vals["visibility"]) if vals["visibility"] else 0.0,
            "median_presence": median(vals["presence"]) if vals["presence"] else 0.0,
        }
        for name, vals in values.items()
    }


def evaluate_quality_gate(
    frames: List[FrameAssessment],
    video_score: float,
    complete_reps: int
) -> Dict[str, Any]:
    dominant_view = get_dominant_camera_view(frames)

    # Calculate the visibility and presence medians of each
    # critical landmark
    side_landmarks = []
    if dominant_view == "front" or dominant_view == "angled":
        for side in ["LEFT", "RIGHT"]:
            for joint in CRITICAL_SIDE_JOINTS:
                side_landmarks.append(f"{side}_{joint}")
    else:
        for joint in CRITICAL_SIDE_JOINTS:
            side_landmarks.append(f"{dominant_view.split("_")[1].upper()}_{joint}")
    
    landmark_medians = compute_landmark_medians(frames, side_landmarks)

    # ----------------------------
    # Gate 1 — Critical Occlusion
    # ----------------------------
    def side_metrics(side: str):
        vis = min(
            landmark_medians.get(f"{side}_{joint}", {}).get("median_visibility", 0.0)
            for joint in CRITICAL_SIDE_JOINTS
        )
        pres = min(
            landmark_medians.get(f"{side}_{joint}", {}).get("median_presence", 0.0)
            for joint in CRITICAL_SIDE_JOINTS
        )
        worst_joint = min(
            CRITICAL_SIDE_JOINTS,
            key=lambda j: landmark_medians.get(f"{side}_{j}", {}).get("median_visibility", 0.0)
        )
        return vis, pres, worst_joint.lower()

    if dominant_view in ("front", "angled"):
        left_vis, left_pres, left_joint = side_metrics("LEFT")
        right_vis, right_pres, right_joint = side_metrics("RIGHT")

        # Both sides visibility failure
        if left_vis <= 0.60 and right_vis <= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_both_sides",
                "landmark_medians": landmark_medians,
                "message": "We couldn't see your lower body clearly",
            }

        # One-side visibility failure
        if left_vis <= 0.60 and right_vis >= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_left_side",
                "landmark_medians": landmark_medians,
                "message": "Part of your left side was hidden from view",
                "detail": f"Your left {left_joint} wasn't clearly visible.",
            }

        if right_vis <= 0.60 and left_vis >= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_right_side",
                "landmark_medians": landmark_medians,
                "message": "Part of your right side was hidden from view",
                "detail": f"Your right {right_joint} wasn't clearly visible.",
            }

        # M3 — one-side presence failure
        if left_vis > 0.60 and left_pres <= 0.50:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "out_of_frame_left",
                "landmark_medians": landmark_medians,
                "message": "Your left side kept moving out of frame",
                "detail": f"Your left {left_joint} wasn't fully in frame throughout the video.",
            }

        if right_vis > 0.60 and right_pres <= 0.50:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "out_of_frame_right",
                "landmark_medians": landmark_medians,
                "message": "Your right side kept moving out of frame",
                "detail": f"Your right {right_joint} wasn't fully in frame throughout the video.",
            }

    elif dominant_view == "side_left":
        left_vis, left_pres, left_joint = side_metrics("LEFT")

        if left_vis <= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_left_side",
                "landmark_medians": landmark_medians,
                "message": "Part of your left side was hidden from view",
                "detail": f"Your left {left_joint} wasn't clearly visible.",
            }

        if left_vis > 0.60 and left_pres <= 0.50:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "out_of_frame_left",
                "landmark_medians": landmark_medians,
                "message": "Your left side kept moving out of frame",
                "detail": f"Your left {left_joint} wasn't fully in frame throughout the video.",
            }

    elif dominant_view == "side_right":
        right_vis, right_pres, right_joint = side_metrics("RIGHT")

        if right_vis <= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_right_side",
                "landmark_medians": landmark_medians,
                "message": "Part of your right side was hidden from view",
                "detail": f"Your right {right_joint} wasn't clearly visible.",
            }

        if right_vis > 0.60 and right_pres <= 0.50:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "out_of_frame_right",
                "landmark_medians": landmark_medians,
                "message": "Your right side kept moving out of frame",
                "detail": f"Your right {right_joint} wasn't fully in frame throughout the video.",
            }

    # ----------------------------
    # Gate 2 — Poor Composite Score
    # ----------------------------
    if video_score < 0.70:
        return {
            "event": "error",
            "error_stage": "quality_gate",
            "retryable": False,
            "error_code": "poor_video_quality",
            "message": "We couldn't read your body position clearly",
        }

    # ----------------------------
    # Gate 3 — Reps
    # ----------------------------
    if complete_reps == 0:
        return {
            "event": "error",
            "error_stage": "quality_gate",
            "retryable": False,
            "error_code": "no_reps_detected",
            "message": "We couldn't detect any squats in your video",
        }

    if complete_reps < 3:
        return {
            "event": "error",
            "error_stage": "quality_gate",
            "retryable": False,
            "error_code": "insufficient_reps",
            "message": "We need at least 3 complete reps to give you meaningful feedback",
        }

    quality_gate_status = "GOOD" if video_score >= 0.85 else "ACCEPTABLE"

    return {
        "event": "mediapipe_complete",
        "quality_gate_status": quality_gate_status,
        "video_score": round(video_score, 4),
        "rep_count": complete_reps,
    }


def angle_between(a, b, c):
    """Angle at point b in the triangle a-b-c."""
    v1 = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    v2 = np.array([c.x - b.x, c.y - b.y, c.z - b.z])

    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    if denom == 0:
        return None

    cos_a = np.dot(v1, v2) / denom
    return np.degrees(np.arccos(np.clip(cos_a, -1.0, 1.0)))


def back_angle(shoulder, hip):
    """Torso lean from vertical."""
    torso = np.array([shoulder.x - hip.x, shoulder.y - hip.y, shoulder.z - hip.z])
    norm = np.linalg.norm(torso)
    if norm == 0:
        return None

    vertical = np.array([0, -1, 0])
    cos_a = np.dot(torso, vertical) / norm
    return np.degrees(np.arccos(np.clip(cos_a, -1.0, 1.0)))


def ankle_dorsiflexion(knee, ankle):
    """
    Tibia inclination from vertical.

    Returns:
        degrees of ankle dorsiflexion proxy
    """

    tibia = np.array([
        knee.x - ankle.x,
        knee.y - ankle.y,
        knee.z - ankle.z,
    ])

    norm = np.linalg.norm(tibia)

    if norm == 0:
        return None

    tibia = tibia / norm

    vertical = np.array([0, -1, 0])

    cos_theta = np.dot(tibia, vertical)

    angle = np.degrees(
        np.arccos(
            np.clip(cos_theta, -1.0, 1.0)
        )
    )

    return angle


def compute_view_metrics(pose_world, camera_view):
    """
    Compute only the metrics needed for the current camera view.
    Returns a dict with angles and dorsiflexion.
    """
    lm = pose_world

    metrics = {
        "hip_angle": None,
        "knee_angle": None,
        "back_angle": None,
        "left_knee_valgus": None,
        "right_knee_valgus": None,
        "dorsiflexion": None,
    }

    if camera_view in ("front", "angled"):
        left_hip_angle = angle_between(lm[11], lm[23], lm[25])
        right_hip_angle = angle_between(lm[12], lm[24], lm[26])

        left_knee_angle = femur_vertical_angle(lm[23], lm[25])
        right_knee_angle = femur_vertical_angle(lm[24], lm[26])

        left_back = back_angle(lm[11], lm[23])
        right_back = back_angle(lm[12], lm[24])

        left_dorsiflexion = ankle_dorsiflexion(
            lm[25],  # knee
            lm[27],  # ankle
        )

        right_dorsiflexion = ankle_dorsiflexion(
            lm[26],
            lm[28],
        )

        hip_vals = [v for v in [left_hip_angle, right_hip_angle] if v is not None]
        knee_vals = [v for v in [left_knee_angle, right_knee_angle] if v is not None]
        back_vals = [v for v in [left_back, right_back] if v is not None]
        dorsiflexion_vals = [
            v for v in [
                left_dorsiflexion,
                right_dorsiflexion
            ]
            if v is not None
        ]

        if hip_vals:
            metrics["hip_angle"] = sum(hip_vals) / len(hip_vals)
        if knee_vals:
            metrics["knee_angle"] = sum(knee_vals) / len(knee_vals)
        if back_vals:
            metrics["back_angle"] = sum(back_vals) / len(back_vals)
        if dorsiflexion_vals:
            metrics["dorsiflexion"] = (
                sum(dorsiflexion_vals) /
                len(dorsiflexion_vals)
            )

    elif camera_view == "side_left":
        metrics["hip_angle"] = angle_between(lm[11], lm[23], lm[25])
        metrics["knee_angle"] = femur_vertical_angle(lm[23], lm[25])
        metrics["back_angle"] = back_angle(lm[11], lm[23])
        metrics["dorsiflexion"] = ankle_dorsiflexion(
            lm[25],  # knee
            lm[27],  # ankle
        )

    elif camera_view == "side_right":
        metrics["hip_angle"] = angle_between(lm[12], lm[24], lm[26])
        metrics["knee_angle"] = femur_vertical_angle(lm[24], lm[26])
        metrics["back_angle"] = back_angle(lm[12], lm[24])
        metrics["dorsiflexion"] = ankle_dorsiflexion(
            lm[26],
            lm[28],
        )

    return metrics


def format_rep_data(
          rep_count, tempo_data, back_data, depth_data, 
          stability_data, ankle_data, camera_view):
    
    if camera_view in ("front", "angled"):
        data = {
            "rep_number": rep_count,
            "tempo_data": {
                "tempo_notation": tempo_data['tempo_notation'],
                "eccentric": tempo_data['eccentric'],
                "pause": tempo_data['pause'],
                "concentric": tempo_data['concentric'],
                "total": tempo_data['total_time']
            },
            "back_data": {
                "back_angle_start": back_data["back_angle_start"],
                "back_angle_max": back_data["back_angle_max"],
                "back_angle_at_bottom": back_data["back_angle_at_bottom"],
                "time_warning": back_data["time_warning"],
                "time_excessive": back_data["time_excessive"],
                "status": back_data["status"],
            },
            "depth_data": {
                "hip_angle_start": depth_data["hip_angle_start"],
                "hip_angle_at_bottom": depth_data["hip_angle_at_bottom"],
                "hip_angle_min": depth_data["hip_angle_min"],
                "knee_angle_start": depth_data["knee_angle_start"],
                "knee_angle_at_bottom": depth_data["knee_angle_at_bottom"],
                "knee_angle_min": depth_data["knee_angle_min"],
                "depth_classification": depth_data["depth_classification"],
                "depth_insufficient_flag": depth_data["depth_insufficient_flag"]
            },
            "stability_data": {
                "knee_valgus_distance": stability_data["knee_valgus_distance"],
                "valgus_phase": stability_data["valgus_phase"],
                "valgus_flag": stability_data["valgus_flag"]
            },
            "ankle_data": {
                "foot_turnout_left": ankle_data["foot_turnout_left"],
                "foot_turnout_right": ankle_data["foot_turnout_right"]
            }
        }

    else:
         data = {
            "rep_number": rep_count,
            "tempo_data": {
                "tempo_notation": tempo_data['tempo_notation'],
                "eccentric": tempo_data['eccentric'],
                "pause": tempo_data['pause'],
                "concentric": tempo_data['concentric'],
                "total": tempo_data['total_time']
            },
            "back_data": {
                "back_angle_start": back_data["back_angle_start"],
                "back_angle_max": back_data["back_angle_max"],
                "back_angle_at_bottom": back_data["back_angle_at_bottom"],
                "time_warning": back_data["time_warning"],
                "time_excessive": back_data["time_excessive"],
                "status": back_data["status"],
            },
            "depth_data": {
                "knee_angle_start": depth_data["knee_angle_start"],
                "knee_angle_at_bottom": depth_data["knee_angle_at_bottom"],
                "knee_angle_min": depth_data["knee_angle_min"],
                "depth_classification": depth_data["depth_classification"],
                "depth_insufficient_flag": depth_data["depth_insufficient_flag"]
            },
            "ankle_data": {
                "dorsiflexion_at_bottom": ankle_data["dorsiflexion_at_bottom"]
            }
        }

    return data


def torso_vertical_angle(pose_world):
    """
    Returns torso inclination relative to global vertical axis.
    Smaller = more upright.
    """

    left_shoulder = pose_world[11]
    right_shoulder = pose_world[12]

    left_hip = pose_world[23]
    right_hip = pose_world[24]

    shoulder_mid = np.array([
        (left_shoulder.x + right_shoulder.x) / 2,
        (left_shoulder.y + right_shoulder.y) / 2,
        (left_shoulder.z + right_shoulder.z) / 2,
    ])

    hip_mid = np.array([
        (left_hip.x + right_hip.x) / 2,
        (left_hip.y + right_hip.y) / 2,
        (left_hip.z + right_hip.z) / 2,
    ])

    torso_vec = shoulder_mid - hip_mid

    norm = np.linalg.norm(torso_vec)
    if norm == 0:
        return None

    torso_vec = torso_vec / norm

    # MediaPipe world coordinates
    vertical = np.array([0, -1, 0])

    cos_theta = np.dot(torso_vec, vertical)

    angle = np.degrees(
        np.arccos(np.clip(cos_theta, -1.0, 1.0))
    )

    return angle


def foot_turnout_relative(
    heel,
    foot_index,
    left_hip,
    right_hip,
):
    """
    Foot turnout relative to pelvis orientation.

    Returns:
        positive -> toe-out
        negative -> toe-in
    """

    # =========================
    # Pelvis axis (ground plane)
    # =========================
    pelvis = np.array([
        right_hip.x - left_hip.x,
        right_hip.z - left_hip.z,
    ])

    pelvis_norm = np.linalg.norm(pelvis)

    if pelvis_norm == 0:
        return None

    pelvis = pelvis / pelvis_norm

    # =========================
    # Body forward vector
    # perpendicular to pelvis
    # =========================
    body_forward = np.array([
        -pelvis[1],
        pelvis[0],
    ])

    # =========================
    # Foot vector
    # =========================
    foot = np.array([
        foot_index.x - heel.x,
        foot_index.z - heel.z,
    ])

    foot_norm = np.linalg.norm(foot)

    if foot_norm == 0:
        return None

    foot = foot / foot_norm

    # =========================
    # Signed angle
    # =========================
    angle = np.degrees(
        np.arctan2(
            body_forward[0] * foot[1] -
            body_forward[1] * foot[0],

            np.dot(body_forward, foot)
        )
    )

    angle = abs(angle)

    if angle > 90:
        angle = 180 - angle

    return angle