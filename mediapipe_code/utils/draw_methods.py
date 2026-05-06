import cv2
from utils.angle_methods import (
    LEFT_HIP,
    RIGHT_HIP,
    LEFT_KNEE,
    RIGHT_KNEE,
    LEFT_ANKLE,
    RIGHT_ANKLE,
    LEFT_SHOULDER,
    RIGHT_SHOULDER,
    calculate_hip_angle,
    calculate_knee_angle,
    calculate_back_angle,
    calculate_knee_valgus
)

def draw_points_and_lines(
    image,
    pose_landmarks,
    w,
    h,
    points,
    connections,
    threshold=0.0,
    color=(0, 255, 0),
    thickness=2,
):
    """Draw selected landmarks and connections."""
    # points
    for idx in points:
        lm = pose_landmarks[idx]
        if lm.visibility > threshold:
            x = int(lm.x * w)
            y = int(lm.y * h)
            cv2.circle(image, (x, y), 5, color, -1)

    # connections
    for start_idx, end_idx in connections:
        lm_start = pose_landmarks[start_idx]
        lm_end = pose_landmarks[end_idx]

        if lm_start.visibility > threshold and lm_end.visibility > threshold:
            x1, y1 = int(lm_start.x * w), int(lm_start.y * h)
            x2, y2 = int(lm_end.x * w), int(lm_end.y * h)
            cv2.line(image, (x1, y1), (x2, y2), color, thickness)


def add_text_lines(image, lines, start_x=10, start_y=30, dy=40):
    """Draw a list of strings on the frame."""
    y = start_y
    for text, color, scale in lines:
        cv2.putText(
            image,
            text,
            (start_x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            scale,
            color,
            2,
        )
        y += dy


def compute_view_metrics(pose_world, camera_view):
    """
    Compute only the metrics needed for the current camera view.
    Returns a dict with angles and valgus values.
    """
    metrics = {
        "hip_angle": None,
        "knee_angle": None,
        "back_angle": None,
        "left_knee_valgus": None,
        "right_knee_valgus": None,
    }

    if camera_view in ("front", "angled"):
        left_hip_angle = calculate_hip_angle(
            pose_world[LEFT_SHOULDER],
            pose_world[LEFT_HIP],
            pose_world[LEFT_KNEE],
        )
        right_hip_angle = calculate_hip_angle(
            pose_world[RIGHT_SHOULDER],
            pose_world[RIGHT_HIP],
            pose_world[RIGHT_KNEE],
        )
        metrics["hip_angle"] = (left_hip_angle + right_hip_angle) / 2

        left_knee_angle = calculate_knee_angle(
            pose_world[LEFT_HIP],
            pose_world[LEFT_KNEE],
            pose_world[LEFT_ANKLE],
        )
        right_knee_angle = calculate_knee_angle(
            pose_world[RIGHT_HIP],
            pose_world[RIGHT_KNEE],
            pose_world[RIGHT_ANKLE],
        )
        metrics["knee_angle"] = (left_knee_angle + right_knee_angle) / 2

        left_back_angle = calculate_back_angle(
            pose_world[LEFT_SHOULDER],
            pose_world[LEFT_HIP],
        )
        right_back_angle = calculate_back_angle(
            pose_world[RIGHT_SHOULDER],
            pose_world[RIGHT_HIP],
        )
        metrics["back_angle"] = (left_back_angle + right_back_angle) / 2

        metrics["left_knee_valgus"] = calculate_knee_valgus(
            pose_world[LEFT_HIP],
            pose_world[LEFT_KNEE],
            pose_world[LEFT_ANKLE],
        )
        metrics["right_knee_valgus"] = calculate_knee_valgus(
            pose_world[RIGHT_HIP],
            pose_world[RIGHT_KNEE],
            pose_world[RIGHT_ANKLE],
        )

    elif camera_view == "side_left":
        metrics["hip_angle"] = calculate_hip_angle(
            pose_world[LEFT_SHOULDER],
            pose_world[LEFT_HIP],
            pose_world[LEFT_KNEE],
        )
        metrics["knee_angle"] = calculate_knee_angle(
            pose_world[LEFT_HIP],
            pose_world[LEFT_KNEE],
            pose_world[LEFT_ANKLE],
        )
        metrics["back_angle"] = calculate_back_angle(
            pose_world[LEFT_SHOULDER],
            pose_world[LEFT_HIP],
        )

    elif camera_view == "side_right":
        metrics["hip_angle"] = calculate_hip_angle(
            pose_world[RIGHT_SHOULDER],
            pose_world[RIGHT_HIP],
            pose_world[RIGHT_KNEE],
        )
        metrics["knee_angle"] = calculate_knee_angle(
            pose_world[RIGHT_HIP],
            pose_world[RIGHT_KNEE],
            pose_world[RIGHT_ANKLE],
        )
        metrics["back_angle"] = calculate_back_angle(
            pose_world[RIGHT_SHOULDER],
            pose_world[RIGHT_HIP],
        )

    return metrics