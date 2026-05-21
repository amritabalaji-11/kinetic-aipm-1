import json
import os

import cv2
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from utils.pose_landmarks import LEFT_HIP, LEFT_KNEE, LEFT_SHOULDER, RIGHT_HIP, RIGHT_KNEE, RIGHT_SHOULDER
from utils.landmark_quality_methods import safe_get_landmark
from utils.trackers.traker_configuration import THRESHOLD_DEEP
from utils.landmark_quality_configuration import LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, RIGHT_SIDE

FONT_PATH = "segoeui.ttf"
FONT_SIZE = 26


def annotate_frame(
        frame_bgr,
        camera_view,
        norm_pose,
        width,
        height,
        hip_angle,
        knee_angle,
        back_angle_value,
        left_knee_valgus,
        right_knee_valgus,
        rep_count,
        tempo_state,
    ):
        annotated = frame_bgr.copy()

        if camera_view == "side_left":
            draw_points_and_lines(
                annotated,
                norm_pose,
                width,
                height,
                LEFT_SIDE,
                LEG_CONNECTIONS_LEFT_SIDE,
                threshold=0.0,
            )
        elif camera_view == "side_right":
            draw_points_and_lines(
                annotated,
                norm_pose,
                width,
                height,
                RIGHT_SIDE,
                LEG_CONNECTIONS_RIGHT_SIDE,
                threshold=0.0,
            )
        else:
            draw_points_and_lines(
                annotated,
                norm_pose,
                width,
                height,
                LEG_TARGET_LANDMARKS,
                LEG_CONNECTIONS,
                threshold=0.0,
            )

        lines = [
            (
                f"Hip Angle: {hip_angle:.1f}" if hip_angle is not None else "Hip Angle: N/A",
                (0, 255, 0),
                1,
            ),
            (
                f"Knee Angle: {knee_angle:.1f}" if knee_angle is not None else "Knee Angle: N/A",
                (0, 255, 0),
                1,
            ),
            (
                f"Back Angle: {back_angle_value:.1f}" if back_angle_value is not None else "Back Angle: N/A",
                (0, 255, 0),
                1,
            ),
            (f"Reps: {rep_count}", (0, 0, 255), 1),
            (f"State: {tempo_state}", (255, 0, 0), 1),
            (f"Camera: {camera_view}", (0, 255, 0), 1),
        ]

        if left_knee_valgus is not None:
            lines.append((f"Left Valgus: {left_knee_valgus:.3f}", (0, 255, 0), 1))

        if right_knee_valgus is not None:
            lines.append((f"Right Valgus: {right_knee_valgus:.3f}", (0, 255, 0), 1))

        add_text_lines(
            annotated,
            lines,
            start_x=10,
            start_y=30,
            dy=40,
        )

        return annotated


def draw_points_and_lines(
    image,
    pose_landmarks,
    w,
    h,
    points,
    connections,
    threshold=0.0,
    color=(0, 140, 255),
    thickness=2,
):
    """Draw selected landmarks and connections."""
    circle = cv2.circle
    line = cv2.line
    pw = w
    ph = h
    threshold_val = threshold

    # Points
    for idx in points:
        lm = pose_landmarks[idx]
        if lm.visibility <= threshold_val:
            continue

        x = int(lm.x * pw)
        y = int(lm.y * ph)
        circle(image, (x, y), 5, color, -1)

    # Connections
    for start_idx, end_idx in connections:
        lm_start = pose_landmarks[start_idx]
        if lm_start.visibility <= threshold_val:
            continue

        lm_end = pose_landmarks[end_idx]
        if lm_end.visibility <= threshold_val:
            continue

        x1 = int(lm_start.x * pw)
        y1 = int(lm_start.y * ph)
        x2 = int(lm_end.x * pw)
        y2 = int(lm_end.y * ph)

        line(image, (x1, y1), (x2, y2), color, thickness)


def get_xy(norm_pose, idx, width, height):
    lm = safe_get_landmark(norm_pose, idx)
    if lm is None:
        return None
    return int(lm.x * width), int(lm.y * height)


def draw_knee_valgus_overlay(annotated, norm_pose, width, height):
    """
    Draw:
    - blue horizontal line between hips (target width)
    - orange inward/downward arrows starting at each knee
    """
    lk = get_xy(norm_pose, LEFT_KNEE, width, height)
    rk = get_xy(norm_pose, RIGHT_KNEE, width, height)
    lh = get_xy(norm_pose, LEFT_SHOULDER, width, height)
    rh = get_xy(norm_pose, RIGHT_SHOULDER, width, height)

    if None in (lk, rk, lh, rh):
        return annotated

    lk_x, lk_y = lk
    rk_x, rk_y = rk

    if None in (lk, rk, lh, rh):
        return annotated

    lk_x, lk_y = lk
    rk_x, rk_y = rk

    orange = (0, 140, 255)  # #FF8C00

    # -----------------------------------------
    # Arrows pointing toward each other
    # -----------------------------------------
    arrow_len = 45

    # LEFT arrow points RIGHT
    cv2.arrowedLine(
        annotated,
        (rk_x, rk_y),
        (rk_x + arrow_len, rk_y),
        orange,
        4,
        tipLength=0.35,
    )

    # RIGHT arrow points LEFT
    cv2.arrowedLine(
        annotated,
        (lk_x, lk_y),
        (lk_x - arrow_len, lk_y),
        orange,
        4,
        tipLength=0.35,
    )

    return annotated


def _load_font(size=FONT_SIZE):
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except OSError:
        return ImageFont.load_default()


def draw_check(draw, x, y, color, width=4):
    """Draw a check mark using PIL."""
    draw.line((x, y + 10, x + 10, y + 20), fill=color, width=width)
    draw.line((x + 10, y + 20, x + 25, y), fill=color, width=width)


def draw_cross(draw, x, y, color, width=4):
    """Draw a cross using PIL."""
    draw.line((x, y, x + 20, y + 20), fill=color, width=width)
    draw.line((x + 20, y, x, y + 20), fill=color, width=width)


def add_text_lines(image, lines, start_x=10, start_y=30, dy=40):
    """
    Draw lines on the frame using PIL.
    Each line can be either:
      - dict: {"text": str, "color": (B,G,R), "pass": True/False/None, "scale": float}
      - tuple: (text, color_bgr, scale)
    """
    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)

    y = start_y

    for line in lines:
        if isinstance(line, dict):
            text = line.get("text", "")
            color_bgr = line.get("color", (255, 255, 255))
            is_pass = line.get("pass", None)
            scale = line.get("scale", 0.7)
        else:
            text, color_bgr, scale = line
            is_pass = None

        font = _load_font(max(16, int(FONT_SIZE * scale)))
        color_rgb = (color_bgr[2], color_bgr[1], color_bgr[0])

        x_text = start_x

        if is_pass is True:
            draw_check(draw, start_x, y - 16, color_rgb)
            x_text += 40
        elif is_pass is False:
            draw_cross(draw, start_x, y - 16, color_rgb)
            x_text += 40

        draw.text(
            (x_text, y - 20),
            text,
            font=font,
            fill=color_rgb,
        )

        y += dy

    image[:] = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def draw_transparent_panel(image, x, y, w, h, alpha=0.45, color=(0, 0, 0)):
    """Draw a semi-transparent rectangle on a BGR image."""
    overlay = image.copy()
    cv2.rectangle(overlay, (x, y), (x + w, y + h), color, -1)
    cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0, image)


def add_side_faults_panel(annotated, faults_info, start_x=12, start_y=12, padding=12, line_h=36):
    """
    Semi-transparent top-left panel.
    Failing items first, then passing items.
    """
    ordered = sorted(
        faults_info,
        key=lambda f: (
            f.get("pass", True),                 # False first
            -(f.get("severity", 0.0) or 0.0),    # worse score first among fails
        ),
    )

    # Measure text width with PIL
    dummy_img = Image.new("RGB", (10, 10))
    dummy_draw = ImageDraw.Draw(dummy_img)
    font = _load_font(24)

    max_text_w = 0
    for fault in ordered:
        preview = f"{fault['label']} — {fault['text']}"
        bbox = dummy_draw.textbbox((0, 0), preview, font=font)
        text_w = bbox[2] - bbox[0]
        max_text_w = max(max_text_w, text_w)

    panel_w = max(420, max_text_w + padding * 2 + 60)
    panel_h = padding * 2 + line_h * len(ordered)

    draw_transparent_panel(
        annotated,
        start_x,
        start_y,
        panel_w,
        panel_h,
        alpha=0.45,
        color=(0, 0, 0),
    )

    lines = []
    for fault in ordered:
        is_pass = fault.get("pass", True)
        color = (0, 220, 0) if is_pass else (0, 140, 255)

        lines.append({
            "text": f"{fault['label']} — {fault['text']}",
            "color": color,
            "pass": is_pass,   # esto dibuja el check/cross manualmente
            "scale": 0.7,
        })

    add_text_lines(
        annotated,
        lines,
        start_x=start_x + padding,
        start_y=start_y + padding + 24,
        dy=line_h,
    )


def annotate_frame_front(
    frame_bgr,
    camera_view,
    norm_pose,
    width,
    height,
    hip_angle,
    knee_valgus_distance=None,
):
    annotated = frame_bgr.copy()

    if camera_view == "side_left":
        draw_points_and_lines(
            annotated,
            norm_pose,
            width,
            height,
            LEFT_SIDE,
            LEG_CONNECTIONS_LEFT_SIDE,
            threshold=0.0,
        )
    elif camera_view == "side_right":
        draw_points_and_lines(
            annotated,
            norm_pose,
            width,
            height,
            RIGHT_SIDE,
            LEG_CONNECTIONS_RIGHT_SIDE,
            threshold=0.0,
        )
    else:
        draw_points_and_lines(
            annotated,
            norm_pose,
            width,
            height,
            LEG_TARGET_LANDMARKS,
            LEG_CONNECTIONS,
            threshold=0.0,
        )

    
    depth_fail = hip_angle is not None and hip_angle < THRESHOLD_DEEP
    valgus_fail = knee_valgus_distance is not None and knee_valgus_distance < 0.22

    faults_info = [
            {
                "label": "Squat_depth",
                "pass": not depth_fail,
                "text": (
                    "ok"
                    if not depth_fail
                    else f"insufficient — {hip_angle:.1f}° (target ≤90°)"
                ),
                "severity": max(0.0, THRESHOLD_DEEP - (hip_angle or 0.0)),
            },
            {
                "label": "Knee_valgus",
                "pass": not valgus_fail,
                "text": (
                    "ok"
                    if not valgus_fail
                    else f"excessive — {knee_valgus_distance:.3f}"
                ),
                "severity": max(0.0, 0.22 - (knee_valgus_distance or 0.0)),
            },
        ]

    if valgus_fail:
            annotated = draw_knee_valgus_overlay(
                annotated,
                norm_pose,
                width,
                height,
            )

    add_side_faults_panel(
        annotated,
        faults_info,
        start_x=12,
        start_y=12,
        padding=12,
        line_h=36,
    )

    return annotated


def annotate_frame_side(
    frame_bgr,
    camera_view,
    norm_pose,
    width,
    height,
    knee_angle,
    back_angle_value,
    dorsiflexion
):
    annotated = frame_bgr.copy()

    if camera_view == "side_left":
        draw_points_and_lines(
            annotated,
            norm_pose,
            width,
            height,
            LEFT_SIDE,
            LEG_CONNECTIONS_LEFT_SIDE,
            threshold=0.0,
        )
    elif camera_view == "side_right":
        draw_points_and_lines(
            annotated,
            norm_pose,
            width,
            height,
            RIGHT_SIDE,
            LEG_CONNECTIONS_RIGHT_SIDE,
            threshold=0.0,
        )

    
    depth_fail = knee_angle is not None and knee_angle > THRESHOLD_DEEP
    forward_lean_fail = back_angle_value is not None and back_angle_value > 20
    dorsiflexion_fail = dorsiflexion is not None and dorsiflexion < 20

    faults_info = [
            {
                "label": "Squat_depth",
                "pass": not depth_fail,
                "text": (
                    "ok"
                    if not depth_fail
                    else f"insufficient — {knee_angle:.1f}° (target ≤90°)"
                ),
                "severity": max(0.0, (knee_angle or 0.0) - THRESHOLD_DEEP),
            },
            {
                "label": "Forward_lean",
                "pass": not forward_lean_fail,
                "text": (
                    "ok"
                    if not forward_lean_fail
                    else f"excessive — {back_angle_value:.1f}° (target ≤20°)"
                ),
                "severity": max(0.0, (back_angle_value or 0.0) - 20.0),
            },
            {
                "label": "Dorsiflexion",
                "pass": not dorsiflexion_fail,
                "text": (
                    "ok"
                    if not dorsiflexion_fail
                    else f"restricted — {dorsiflexion:.1f}° (target ≥20°)"
                ),
                "severity": max(0.0, 20.0 - (dorsiflexion or 0.0)),
            },
        ]

    add_side_faults_panel(
        annotated,
        faults_info,
        start_x=12,
        start_y=12,
        padding=12,
        line_h=36,
    )

    return annotated


def extract_worst_frame(video_url, analysis_path, rep_frames, output_filename):
    """
    Extract and visualize the most critical frame from the worst rep.

    Args:
        video_url (str):
            The URL of the video.

        analysis_path (str):
            Path to the JSON analysis file containing the
            detected worst rep and critical problem.

        rep_frames (list[dict]):
            List of stored frame dictionaries collected during
            video processing. Each frame contains pose landmarks,
            biomechanical metrics, and metadata.

        output_filename (str):
            The name of the file output.

    Raises:
        ValueError:
            Raised if the target frame cannot be read from the video.

    Returns:
        annotated_worst_frame:
            The worst frame of the worst rep
    """

    with open(analysis_path, "r") as f:
        json_analysis = json.load(f)

    
    worse_rep = json_analysis["worse_rep"]
    critical_problem = json_analysis["critical_problem"]

    filtered_frames_worse_rep = [
        frame
        for frame in rep_frames
        if (
            frame["rep_number"] == worse_rep
            and frame.get(critical_problem) is not None
        )
    ]

    lower_is_worse = {
            "hip_angle",
            "knee_angle",
            "knee_valgus_distance"
        }

    higher_is_worse = {
            "back_angle_value",
        }

    if critical_problem in lower_is_worse:
            filtered_frame_critical = min(
                filtered_frames_worse_rep,
                key=lambda x: x.get(critical_problem, float("inf"))
            )

    elif critical_problem in higher_is_worse:
            print("entre aca")
            
            filtered_frame_critical = max(
                filtered_frames_worse_rep,
                key=lambda x: x.get(critical_problem)
            )

    cap = cv2.VideoCapture(video_url)
    cap.set(cv2.CAP_PROP_POS_FRAMES, filtered_frame_critical["frame_index"])
    ok, frame = cap.read()
    cap.release()

    if not ok:
        raise ValueError("Could not read frame")

    # Resize
    resized = cv2.resize(
        frame,
        (720, 1280),  # (width, height)
        interpolation=cv2.INTER_AREA,
    )

    height, width = resized.shape[:2]

    if filtered_frame_critical["camera_view"] in ("front", "angled"):

        annotated_worst_frame = annotate_frame_front(
            resized,
            filtered_frame_critical["camera_view"],
            filtered_frame_critical["norm_pose"],
            width,
            height,
            filtered_frame_critical["hip_angle"],
            filtered_frame_critical["knee_valgus_distance"]
        )
    else:
        annotated_worst_frame = annotate_frame_side(
            resized,
            filtered_frame_critical["camera_view"],
            filtered_frame_critical["norm_pose"],
            width,
            height,
            filtered_frame_critical["knee_angle"],
            filtered_frame_critical["back_angle_value"],
            filtered_frame_critical["dorsiflexion"]
        )

    output_dir = "./worst_frames"
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(
        output_dir,
        f"{output_filename}.jpg"
    )

    cv2.imwrite(output_path, annotated_worst_frame)

    return annotated_worst_frame