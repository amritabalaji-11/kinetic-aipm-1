import base64
import os
import subprocess
import cv2
import numpy as np
from typing import Any, Dict, List
from mediapipe_code.utils.angle_methods import angle_between, ankle_dorsiflexion, back_angle, femur_vertical_angle
from mediapipe_code.utils.landmark_quality_configuration import (
    PRESENCE_THRESHOLD, VISIBILITY_THRESHOLD, FrameAssessment, FrameLandmarkData)

VIEW_SIDES = {
    "side_left": ("LEFT",),
    "side_right": ("RIGHT",),
    "front": ("LEFT", "RIGHT"),
    "angled": ("LEFT", "RIGHT"),
}
LEFT_PREFIX = "LEFT_"
RIGHT_PREFIX = "RIGHT_"
CRITICAL_SIDE_JOINTS = ["HIP", "KNEE", "ANKLE", "FOOT", "SHOULDER", "ANKLE"]

import shutil

import os
ffmpeg_sys = shutil.which("ffmpeg")
if not ffmpeg_sys:
    for path in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"]:
        if os.path.exists(path):
            ffmpeg_sys = path
            break
FFMPEG_PATH = ffmpeg_sys

def get_first_pose(result):
    """
    Attempt to retrieve the first detected pose, tolerating different attribute names
    depending on the version/configuration.
    """
    if result.pose_world_landmarks and result.pose_landmarks:
        return result.pose_world_landmarks[0], result.pose_landmarks[0]
    return None, None


def safe_get_landmark(lm_list, idx):
    """
    Returns the landmark by index if it exists; otherwise, it returns None.    
    """
    if lm_list is None or idx < 0 or idx >= len(lm_list):
        return None
    return lm_list[idx]


def extract_frame_landmark_data(world_lm, norm_lm):
    """
    x/y/z originate from the 3D world landmark.
    x/y originate from 2D landmark.
    Visibility/presence originate from the normalized landmark.   
    """
    return FrameLandmarkData(
        x=world_lm.x,
        y=world_lm.y,
        z=world_lm.z,
        screen_x=norm_lm.x,
        screen_y=norm_lm.y,
        visibility=norm_lm.visibility,
        presence=norm_lm.presence,
    )
    

def select_landmarks_by_view(camera_view: str, view_config: dict):
    config = view_config.get(camera_view)
    if config is None:
        return [], []
    return config["active_landmarks"], config["critical_landmarks"]


def compute_reliability(frames):
    """
    Returns reliability only for landmarks that were actually expected
    according to camera_view / frame configuration.
    """
    counts = {}
    expected_counts = {}

    for frame in frames:
        for name in frame.expected_landmarks:
            expected_counts[name] = expected_counts.get(name, 0) + 1

            lm = frame.tracked_landmarks.get(name)
            if (
                lm is not None
                and lm.visibility >= VISIBILITY_THRESHOLD
                and lm.presence >= PRESENCE_THRESHOLD
            ):
                counts[name] = counts.get(name, 0) + 1

    return {
        name: counts.get(name, 0) / total
        for name, total in expected_counts.items()
        if total > 0
    }


def compute_composite_score(weights, reliability_by_landmark, expected_landmarks):
    """
    For each landmark returns reliability x biomechanical weight
    Output: 0 - 1 (e.g 0.82 = acceptable)
    """
    total_weight = 0.0
    weighted_score = 0.0

    for name in expected_landmarks:
        weight = weights.get(name, 0.0)
        reliability = reliability_by_landmark.get(name, 0.0)
        weighted_score += weight * reliability
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return round(weighted_score / total_weight, 4)


def compute_frame_reliability(
    tracked_landmarks,
    critical_landmarks,
):
    """
    every critical landmark must pass visibility + presence in this frame.
    frame_reliability = lowest critical landmark confidence in this frame
    """
    critical_failures = []
    min_score = 1.0

    for name in critical_landmarks:
        lm = tracked_landmarks.get(name)

        if lm is None:
            critical_failures.append(f"{name}:missing")
            return False, 0.0, critical_failures

        visibility = lm.visibility
        presence = lm.presence

        score = visibility if visibility < presence else presence

        if score < min_score:
            min_score = score

        if (
            visibility < VISIBILITY_THRESHOLD
            or presence < PRESENCE_THRESHOLD
        ):
            critical_failures.append(
                f"{name}:visibility={visibility:.2f},presence={presence:.2f}"
            )

    return (
        len(critical_failures) == 0,
        min_score,
        critical_failures,
    )


def get_dominant_camera_view(frames):
    counts = {}

    for frame in frames:
        view = frame.camera_view

        if view is None or view == "unknown":
            continue

        counts[view] = counts.get(view, 0) + 1

    if not counts:
        return "unknown"

    return max(counts, key=counts.get)


def compute_landmark_medians(
    frames,
    landmark_names,
):
    values = {
        name: [[], []]
        for name in landmark_names
    }

    for frame in frames:
        tracked = frame.tracked_landmarks

        for name in landmark_names:
            lm = tracked.get(name)

            if lm is None:
                continue

            values[name][0].append(lm.visibility)
            values[name][1].append(lm.presence)

    result = {}

    for name, (vis_list, pres_list) in values.items():

        result[name] = {
            "median_visibility":
                np.median(vis_list) if vis_list else 0.0,

            "median_presence":
                np.median(pres_list) if pres_list else 0.0,
        }

    return result


def evaluate_quality_gate(
    frames: List[FrameAssessment],
    video_score: float,
    complete_reps: int
) -> Dict[str, Any]:

    dominant_view = get_dominant_camera_view(frames)
    sides = []
    # Determine which sides matter
    if dominant_view in ("front", "angled"):
        sides = ["LEFT", "RIGHT"]
    elif dominant_view == "side_left":
        side = "LEFT"
    elif dominant_view == "side_right":
        side = "RIGHT"
    else:
        sides = ()

    
    if sides:
        side_landmarks = [
            f"{side}_{joint}"
            for side in sides
            for joint in CRITICAL_SIDE_JOINTS
        ]
    else:
        side_landmarks = [
            f"{side}_{joint}"
            for joint in CRITICAL_SIDE_JOINTS
        ]

    landmark_medians = compute_landmark_medians(frames, side_landmarks)


    def side_metrics(side: str):
        min_vis = 1.0
        min_pres = 1.0
        worst_joint = None
        worst_vis = 1.0

        for joint in CRITICAL_SIDE_JOINTS:
            data = landmark_medians.get(f"{side}_{joint}", {})
            vis = data.get("median_visibility", 0.0)
            pres = data.get("median_presence", 0.0)

            if vis < min_vis:
                min_vis = vis

            if pres < min_pres:
                min_pres = pres

            if vis < worst_vis:
                worst_vis = vis
                worst_joint = joint

        return min_vis, min_pres, (worst_joint.lower() if worst_joint else "unknown")

    # ----------------------------
    # Gate 1 — Critical Occlusion
    # ----------------------------
    if dominant_view in ("front", "angled"):
        left_vis, left_pres, left_joint = side_metrics("LEFT")
        right_vis, right_pres, right_joint = side_metrics("RIGHT")

        if left_vis <= 0.60 and right_vis <= 0.60:
            return {
                "event": "error",
                "error_stage": "quality_gate",
                "retryable": False,
                "error_code": "occlusion_both_sides",
                "landmark_medians": landmark_medians,
                "message": "We couldn't see your lower body clearly",
            }

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
    # Gate 2 — Composite Score
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


def compute_view_metrics(pose_world, camera_view):
    """
    Compute only the metrics needed for the current camera view.
    Returns a dict with angles and dorsiflexion.
    """
    lm = pose_world

    hip_angle = None
    knee_angle = None
    back_angle_value = None
    dorsiflexion = None
    left_knee_valgus = None
    right_knee_valgus = None

    if camera_view in ("front", "angled"):
        left_hip_angle = angle_between(lm[11], lm[23], lm[25])
        right_hip_angle = angle_between(lm[12], lm[24], lm[26])

        left_knee_angle = femur_vertical_angle(lm[23], lm[25])
        right_knee_angle = femur_vertical_angle(lm[24], lm[26])

        left_back = back_angle(lm[11], lm[23])
        right_back = back_angle(lm[12], lm[24])

        left_dorsiflexion = ankle_dorsiflexion(lm[25], lm[27])
        right_dorsiflexion = ankle_dorsiflexion(lm[26], lm[28])

        hip_sum = 0.0
        hip_count = 0
        if left_hip_angle is not None:
            hip_sum += left_hip_angle
            hip_count += 1
        if right_hip_angle is not None:
            hip_sum += right_hip_angle
            hip_count += 1
        if hip_count:
            hip_angle = hip_sum / hip_count

        knee_sum = 0.0
        knee_count = 0
        if left_knee_angle is not None:
            knee_sum += left_knee_angle
            knee_count += 1
        if right_knee_angle is not None:
            knee_sum += right_knee_angle
            knee_count += 1
        if knee_count:
            knee_angle = knee_sum / knee_count

        back_sum = 0.0
        back_count = 0
        if left_back is not None:
            back_sum += left_back
            back_count += 1
        if right_back is not None:
            back_sum += right_back
            back_count += 1
        if back_count:
            back_angle_value = back_sum / back_count

        dorsi_sum = 0.0
        dorsi_count = 0
        if left_dorsiflexion is not None:
            dorsi_sum += left_dorsiflexion
            dorsi_count += 1
        if right_dorsiflexion is not None:
            dorsi_sum += right_dorsiflexion
            dorsi_count += 1
        if dorsi_count:
            dorsiflexion = dorsi_sum / dorsi_count

    elif camera_view == "side_left":
        hip_angle = angle_between(lm[11], lm[23], lm[25])
        knee_angle = femur_vertical_angle(lm[23], lm[25])
        back_angle_value = back_angle(lm[11], lm[23])
        dorsiflexion = ankle_dorsiflexion(lm[25], lm[27])

    elif camera_view == "side_right":
        hip_angle = angle_between(lm[12], lm[24], lm[26])
        knee_angle = femur_vertical_angle(lm[24], lm[26])
        back_angle_value = back_angle(lm[12], lm[24])
        dorsiflexion = ankle_dorsiflexion(lm[26], lm[28])

    return {
        "hip_angle": hip_angle,
        "knee_angle": knee_angle,
        "back_angle": back_angle_value,
        "left_knee_valgus": left_knee_valgus,
        "right_knee_valgus": right_knee_valgus,
        "dorsiflexion": dorsiflexion,
    }


def format_rep_data(rep_count, tempo_data, back_data, depth_data, stability_data, ankle_data, camera_view):
    data = {
        "rep_number": rep_count,
        "tempo_data": {
            "tempo_notation": tempo_data["tempo_notation"],
            "eccentric": tempo_data["eccentric"],
            "pause": tempo_data["pause"],
            "concentric": tempo_data["concentric"],
            "total": tempo_data["total_time"],
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
            "hip_angle_start": depth_data["hip_angle_start"],
            "hip_angle_at_bottom": depth_data["hip_angle_at_bottom"],
            "hip_angle_min": depth_data["hip_angle_min"],
            "depth_classification": depth_data["depth_classification"],
            "depth_insufficient_flag": depth_data["depth_insufficient_flag"],
        },
        "ankle_data": {},
    }

    if camera_view in ("front", "angled"):
        data["stability_data"] = {
            "knee_valgus_distance": stability_data["knee_valgus_distance"],
            "valgus_flag": stability_data["valgus_flag"]
        }

        if stability_data["valgus_flag"]:
            data["stability_data"]["valgus_phase"] = stability_data["valgus_phase"]
    else:
        if ankle_data:
            data["ankle_data"] = {
                "dorsiflexion_at_bottom": ankle_data["dorsiflexion_at_bottom"],
            }

    if camera_view == "front":
        data["ankle_data"]["foot_turnout_left"] = ankle_data["foot_turnout_left"]
        data["ankle_data"]["foot_turnout_right"] = ankle_data["foot_turnout_right"]

    return data

import math

def torso_vertical_angle(pose_world):
    """
    Returns torso inclination relative to global vertical axis.
    Smaller = more upright.
    """
    left_shoulder = pose_world[11]
    right_shoulder = pose_world[12]
    left_hip = pose_world[23]
    right_hip = pose_world[24]

    shoulder_mid_x = (left_shoulder.x + right_shoulder.x) * 0.5
    shoulder_mid_y = (left_shoulder.y + right_shoulder.y) * 0.5
    shoulder_mid_z = (left_shoulder.z + right_shoulder.z) * 0.5

    hip_mid_x = (left_hip.x + right_hip.x) * 0.5
    hip_mid_y = (left_hip.y + right_hip.y) * 0.5
    hip_mid_z = (left_hip.z + right_hip.z) * 0.5

    vx = shoulder_mid_x - hip_mid_x
    vy = shoulder_mid_y - hip_mid_y
    vz = shoulder_mid_z - hip_mid_z

    norm = math.sqrt(vx * vx + vy * vy + vz * vz)
    if norm == 0:
        return None

    vx /= norm
    vy /= norm
    vz /= norm

    # vertical = (0, -1, 0)
    cos_theta = -vy

    if cos_theta > 1.0:
        cos_theta = 1.0
    elif cos_theta < -1.0:
        cos_theta = -1.0

    return math.degrees(math.acos(cos_theta))


def foot_turnout_relative(heel, foot_index, left_hip, right_hip):
    """
    Foot turnout relative to pelvis orientation.

    Returns:
        positive -> toe-out
        negative -> toe-in
    """
    # Pelvis axis on ground plane
    px = right_hip.x - left_hip.x
    pz = right_hip.z - left_hip.z

    pelvis_norm = math.sqrt(px * px + pz * pz)
    if pelvis_norm == 0:
        return None

    px /= pelvis_norm
    pz /= pelvis_norm

    # Perpendicular body forward vector
    fx = -pz
    fz = px

    # Foot vector
    vx = foot_index.x - heel.x
    vz = foot_index.z - heel.z

    foot_norm = math.sqrt(vx * vx + vz * vz)
    if foot_norm == 0:
        return None

    vx /= foot_norm
    vz /= foot_norm

    # Signed angle between vectors
    cross = fx * vz - fz * vx
    dot = fx * vx + fz * vz

    angle = math.degrees(math.atan2(cross, dot))
    angle = abs(angle)

    if angle > 90:
        angle = 180 - angle

    return angle


def build_composite_from_frames(frames_b64, cols=4):
    frames = []
    for b64 in frames_b64:
        arr = cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8), cv2.IMREAD_COLOR)
        if arr is not None:
            frames.append(arr)
    rows = math.ceil(len(frames) / cols)
    h, w = frames[0].shape[:2]
    tw, th = min(w, 320), min(h, 240)
    grid_rows = []
    for r in range(rows):
        row_frames = frames[r*cols:(r+1)*cols]
        while len(row_frames) < cols:
            row_frames.append(np.zeros((th, tw, 3), dtype=np.uint8))
        grid_rows.append(np.hstack([cv2.resize(f, (tw, th)) for f in row_frames]))
    grid = np.vstack(grid_rows)
    _, buf = cv2.imencode(".jpg", grid, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buf).decode()


def extract_frames_from_memory(
    frames: list[np.ndarray],
    n: int = 8,
) -> list[str]:

    if not frames:
        return []

    total = len(frames)

    frames_b64 = []

    for i in range(n):
        idx = int(i * total / n)

        if idx >= total:
            idx = total - 1

        frame = frames[idx]

        _, buf = cv2.imencode(
            ".jpg",
            frame,
            [cv2.IMWRITE_JPEG_QUALITY, 85],
        )

        frames_b64.append(
            base64.b64encode(buf).decode("utf-8")
        )

    return frames_b64


def resize_video(video_path: str):

        name = video_path.split("/")[-1]
        full_name = name.split(".")[0]
        os.makedirs("./mediapipe_code/video_results", exist_ok=True)
        output_path = f"./mediapipe_code/video_results/{full_name}_resized.mp4"

        command = [
            str(FFMPEG_PATH),

            "-y",
            "-i", video_path,
            "-loglevel", "quiet",
            "-vf",
            "fps=30,"
            "scale=720:1280",
            "-threads", "0",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",

            output_path
        ]

        subprocess.run(command)

        return output_path