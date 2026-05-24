import json
import math
import os

import cv2
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from utils.pose_landmarks import LEFT_ANKLE, LEFT_HIP, LEFT_KNEE, LEFT_SHOULDER, RIGHT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_SHOULDER
from utils.landmark_quality_methods import safe_get_landmark
from utils.landmark_quality_configuration import LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, RIGHT_SIDE

FONT_PATH = "segoeui.ttf"
FONT_SIZE = 30
BLUE = (255, 180, 30)
GREEN = (0, 255, 0)
ORANGE = (0, 140, 255)
DORSIFLEXION_COLOR = (255, 220, 0)  # celeste
DEPTH_COLOR = (0, 220, 0)            # verde
BACK_COLOR = (255, 0, 0)             # azul


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
    point_color=(0, 140, 255),
    ankle_knee_color=(255, 180, 0),   # naranja suave
    knee_hip_color=(0, 255, 0),       # verde
    hip_shoulder_color=(255, 0, 0),    # azul
    thickness=2,
):
    """Draw selected landmarks and connections with different colors per body segment."""

    circle = cv2.circle
    line = cv2.line
    pw = w
    ph = h
    threshold_val = threshold

    # -----------------------------
    # Draw points
    # -----------------------------
    for idx in points:
        lm = pose_landmarks[idx]
        if lm.visibility <= threshold_val:
            continue
        x = int(lm.x * pw)
        y = int(lm.y * ph)
        circle(image, (x, y), 5, point_color, -1)

    # -----------------------------
    # Helper to choose segment color
    # -----------------------------
    ankle_set = {LEFT_ANKLE, RIGHT_ANKLE}
    knee_set = {LEFT_KNEE, RIGHT_KNEE}
    hip_set = {LEFT_HIP, RIGHT_HIP}
    shoulder_set = {LEFT_SHOULDER, RIGHT_SHOULDER}

    def get_segment_color(start_idx, end_idx):
        pair = {start_idx, end_idx}

        # ankle -> knee
        if pair & ankle_set and pair & knee_set:
            return ankle_knee_color

        # knee -> hip
        if pair & knee_set and pair & hip_set:
            return knee_hip_color

        # hip -> shoulder
        if pair & hip_set and pair & shoulder_set:
            return hip_shoulder_color

        return point_color

    # -----------------------------
    # Draw connections
    # -----------------------------
    for start_idx, end_idx in connections:
        lm_start = pose_landmarks[start_idx]
        lm_end = pose_landmarks[end_idx]

        if lm_start.visibility <= threshold_val:
            continue
        if lm_end.visibility <= threshold_val:
            continue

        x1 = int(lm_start.x * pw)
        y1 = int(lm_start.y * ph)
        x2 = int(lm_end.x * pw)
        y2 = int(lm_end.y * ph)

        segment_color = get_segment_color(start_idx, end_idx)

        line(image, (x1, y1), (x2, y2), segment_color, thickness)


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
            (x_text + 1, y - 19),
            text,
            font=font,
            fill=(0, 0, 0),  # shadow
        )

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


def add_side_faults_panel(
    annotated,
    faults_info,
    start_x=12,
    start_y=12,
    padding=12,
    line_h=36,
):
    """
    Semi-transparent top-left panel.

    Ordering:
    1. Failing items
    2. Passing items
    3. Informational items

    Informational items may include:
        {
            "kind": "info",
            "label": "...",
            "text": "...",
            "color": (B, G, R),
            "style": "dashed" | "solid" | None
        }
    """

    def sort_key(fault):
        kind = fault.get("kind", "fault")
        if kind == "info":
            group = 2
        else:
            group = 0 if not fault.get("pass", True) else 1
        severity = -(fault.get("severity", 0.0) or 0.0)
        return (group, severity)

    ordered = sorted(faults_info, key=sort_key)

    # Measure text width
    dummy_img = Image.new("RGB", (10, 10))
    dummy_draw = ImageDraw.Draw(dummy_img)
    font = _load_font(24)

    max_text_w = 0
    for fault in ordered:
        preview = f"{fault['label']} — {fault['text']}"
        bbox = dummy_draw.textbbox((0, 0), preview, font=font)
        text_w = bbox[2] - bbox[0]
        max_text_w = max(max_text_w, text_w)

    panel_w = max(420, max_text_w + padding * 2 + 80)
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

    # Draw text with optional line marker for info items
    pil_img = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    y = start_y + padding + 24

    for fault in ordered:
        kind = fault.get("kind", "fault")
        label = f"{fault['label']} — {fault['text']}"
        font = _load_font(22)

        if kind == "info":
            color_bgr = fault.get("color", BLUE)
            color_rgb = (color_bgr[2], color_bgr[1], color_bgr[0])
            style = fault.get("style", "solid")

            marker_x1 = start_x + padding
            marker_x2 = marker_x1 + 28
            marker_y = y - 8

            if style == "dashed":
                dash = 5
                gap = 3
                x = marker_x1
                while x < marker_x2:
                    x_end = min(x + dash, marker_x2)
                    draw.line((x, marker_y, x_end, marker_y), fill=color_rgb, width=3)
                    x += dash + gap
            else:
                draw.line((marker_x1, marker_y, marker_x2, marker_y), fill=color_rgb, width=3)

            draw.text(
                (marker_x2 + 10, y - 20),
                label,
                font=font,
                fill=color_rgb,
            )

        else:
            is_pass = fault.get("pass", True)
            color_bgr = (0, 220, 0) if is_pass else (0, 140, 255)
            color_rgb = (color_bgr[2], color_bgr[1], color_bgr[0])

            if is_pass:
                draw_check(draw, start_x + padding, y - 16, color_rgb)
            else:
                draw_cross(draw, start_x + padding, y - 16, color_rgb)

            draw.text(
                (start_x + padding + 40, y - 20),
                label,
                font=font,
                fill=color_rgb,
            )

        y += line_h

    annotated[:] = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _fmt_angle(value):
    return "N/A" if value is None else f"{value:.0f}°"


def annotate_frame_front(
    frame_bgr,
    frame_info,
    width,
    height,
):
    annotated = frame_bgr.copy()

    annotated = draw_dorsiflexion_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        dorsiflexion_status=frame_info["dorsiflexion_status"],
    )

    annotated = draw_depth_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        depth_classification=frame_info["depth_classification"],
    )

    annotated = draw_back_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        back_label=frame_info["back_label"],
        back_angle_value=frame_info["back_angle_value"],
    )

    annotated = draw_valgus_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        valgus_label=frame_info["valgus_label"],
    )

    return annotated


def annotate_frame_side(
    frame_bgr,
    frame_info,
    width,
    height,
):
    annotated = frame_bgr.copy()

    if frame_info["camera_view"] == "side_left":
        draw_points_and_lines(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            LEFT_SIDE,
            LEG_CONNECTIONS_LEFT_SIDE,
            threshold=0.0,
        )
    elif frame_info["camera_view"] == "side_right":
        draw_points_and_lines(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            RIGHT_SIDE,
            LEG_CONNECTIONS_RIGHT_SIDE,
            threshold=0.0,
        )

    dorsiflexion_status = str(frame_info.get("dorsiflexion_status", "Warning")).strip()
    depth_classification = str(frame_info.get("depth_classification", "Warning")).strip()
    back_label = str(frame_info.get("back_label", "Warning")).strip()


    dorsiflexion_angle = frame_info.get("dorsiflexion_at_bottom")
    depth_angle = frame_info.get("knee_angle")
    back_angle_value = frame_info.get("back_angle_value")

    if back_label is None and back_angle_value:
        if "side" in frame_info["camera_view"]:
            if back_angle_value is not None and back_angle_value <= 18:
                dorsiflexion_status = "Excellent"
            elif back_angle_value is not None and back_angle_value <= 28:
                dorsiflexion_status = "Good"
            else:
                dorsiflexion_status = "Warning"
    else:
        dorsiflexion_status = str(back_label).strip()

    if "side" in frame_info["camera_view"] and depth_angle:
            if depth_angle <= 70:
                depth_classification = "Excellent"
            elif depth_angle <= 90:
                depth_classification = "Good"
            else:
                depth_classification = "Warning"
    else:
        depth_classification = depth_classification

    if back_label is None and back_angle_value:
        if back_angle_value is not None and back_angle_value <= 18:
                back_label = "Excellent"
        elif back_angle_value is not None and back_angle_value <= 28:
                back_label = "Good"
        else:
                back_label = "Warning"
    

    faults_info = [
        {
            "label": "Dorsiflexion",
            "pass": dorsiflexion_status.lower() in ("good", "excellent"),
            "text": f"{dorsiflexion_status} — {_fmt_angle(dorsiflexion_angle)}",
            "severity": 0.0 if dorsiflexion_status.lower() in ("good", "excellent") else 1.0,
        },
        {
            "label": "Depth",
            "pass": depth_classification.lower() in ("good", "excellent"),
            "text": f"{depth_classification} — {_fmt_angle(depth_angle)}",
            "severity": 0.0 if depth_classification.lower() in ("good", "excellent") else 1.0,
        },
        {
            "label": "Back",
            "pass": back_label.lower() in ("good", "excellent"),
            "text": f"{back_label} — {_fmt_angle(back_angle_value)}",
            "severity": 0.0 if back_label.lower() in ("good", "excellent") else 1.0,
        },
    ]

    
    annotated = draw_dorsiflexion_status_label(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            frame_info["camera_view"],
            dorsiflexion_status=frame_info["dorsiflexion_status"],
            dorsiflexion_angle= frame_info["dorsiflexion_at_bottom"]
        )

    annotated = draw_depth_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        depth_classification=frame_info["depth_classification"],
        depth_angle = depth_angle
    )

    annotated = draw_back_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        back_label=frame_info["back_label"],
        back_angle_value=frame_info["back_angle_value"],
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

    filtered_frames_worse_rep = [
        frame
        for frame in rep_frames
        if frame["rep_number"] == worse_rep
    ]

    if "side" in get_dominant_camera_view_worst_frame(filtered_frames_worse_rep):
        filtered_frame_critical = min(
            filtered_frames_worse_rep,
            key=lambda x: x.get("knee_angle", float("inf"))
        )
    else:
        filtered_frame_critical = min(
            filtered_frames_worse_rep,
            key=lambda x: x.get("hip_angle", float("inf"))
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

    if get_dominant_camera_view_worst_frame(rep_frames) in ("front", "angled"):

        annotated_worst_frame = annotate_frame_front(
            resized,
            filtered_frame_critical,
            width,
            height
        )
    else:
        annotated_worst_frame = annotate_frame_side(
        resized,
        filtered_frame_critical,
        width,
        height
    )

    output_dir = "./worst_frames"
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(
        output_dir,
        f"{output_filename}.jpg"
    )

    cv2.imwrite(output_path, annotated_worst_frame)

    return annotated_worst_frame


def get_dominant_camera_view_worst_frame(frames):
    counts = {}

    for frame in frames:
        view = frame["camera_view"]

        if view is None or view == "unknown":
            continue

        counts[view] = counts.get(view, 0) + 1

    if not counts:
        return "unknown"

    return max(counts, key=counts.get)


def draw_dorsiflexion_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    dorsiflexion_status=None,
    dorsiflexion_angle = None
):
    """Draw a small dorsiflexion label near the ankle/shin annotation."""
    if camera_view == "side_left":
        ankle = get_xy(norm_pose, LEFT_ANKLE, width, height)
        knee = get_xy(norm_pose, LEFT_KNEE, width, height)
        side_sign = 1
    else:
        ankle = get_xy(norm_pose, RIGHT_ANKLE, width, height)
        knee = get_xy(norm_pose, RIGHT_KNEE, width, height)
        side_sign = -1

    if ankle is None or knee is None:
        return annotated

    if "side" in camera_view and dorsiflexion_angle:
            if dorsiflexion_angle >= 30:
                status = "good"
            elif  29 >= dorsiflexion_angle >= 20:
                status = "mild_restriction"
            elif 19 >= dorsiflexion_angle >= 10:
                status = "moderate_restriction"
            else:
                status = "severe_restriction"
            
    elif dorsiflexion_angle:
            if dorsiflexion_angle >= 25:
                status = "good"
            else:
                status = "restricted"
    else:
        status = dorsiflexion_status
    ax, ay = ankle
    kx, ky = knee

    text_x = int((ax + kx) / 2 + side_sign * 30)
    text_y = int((ay + ky) / 2)

    text_x = max(10, min(text_x, width - 280))
    text_y = max(30, min(text_y, height - 30))

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Dorsiflexion",
        status=status or "Warning",
        font_size=25,
        color=(255, 220, 0),
    )


def draw_depth_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    depth_classification=None,
    depth_angle=None
):
    if camera_view == "side_left":
        hip = get_xy(norm_pose, LEFT_HIP, width, height)
        knee = get_xy(norm_pose, LEFT_KNEE, width, height)
        side_sign = 1
    elif camera_view == "side_right":
        hip = get_xy(norm_pose, RIGHT_HIP, width, height)
        knee = get_xy(norm_pose, RIGHT_KNEE, width, height)
        side_sign = -1
    else:
        left_hip = get_xy(norm_pose, LEFT_HIP, width, height)
        right_hip = get_xy(norm_pose, RIGHT_HIP, width, height)
        left_knee = get_xy(norm_pose, LEFT_KNEE, width, height)
        right_knee = get_xy(norm_pose, RIGHT_KNEE, width, height)

        hip_vals = [p for p in (left_hip, right_hip) if p is not None]
        knee_vals = [p for p in (left_knee, right_knee) if p is not None]

        if not hip_vals or not knee_vals:
            return annotated

        hip = (
            int(sum(p[0] for p in hip_vals) / len(hip_vals)),
            int(sum(p[1] for p in hip_vals) / len(hip_vals)),
        )
        knee = (
            int(sum(p[0] for p in knee_vals) / len(knee_vals)),
            int(sum(p[1] for p in knee_vals) / len(knee_vals)),
        )
        side_sign = 0

    if hip is None or knee is None:
        return annotated

    if "side" in camera_view and depth_angle:
            if depth_angle <= 70:
                status = "Excellent"
            elif depth_angle <= 90:
                status = "Good"
            else:
                status = "Warning"
    elif depth_angle:
            if depth_angle <= 90:
                status = "Excellent"
            elif depth_angle <= 105:
                status = "Good"
            else:
                status = "Warning"
    else:
        status = depth_classification
    hx, hy = hip
    kx, ky = knee

    if side_sign != 0:
        text_x = int((hx + kx) / 2 + side_sign * 35)
        text_y = int((hy + ky) / 2)
    else:
        text_x = int((hx + kx) / 2 - 60)
        text_y = int((hy + ky) / 2)

    text_x = max(10, min(text_x, width - 280))
    text_y = max(30, min(text_y, height - 30))

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Depth",
        status=status or "Warning",
        font_size=25,
        color=(0, 220, 0),
    )

def draw_back_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    back_label=None,
    back_angle_value=None,
):
    if camera_view == "side_left":
        hip = get_xy(norm_pose, LEFT_HIP, width, height)
        shoulder = get_xy(norm_pose, LEFT_SHOULDER, width, height)
        side_sign = 1
    elif camera_view == "side_right":
        hip = get_xy(norm_pose, RIGHT_HIP, width, height)
        shoulder = get_xy(norm_pose, RIGHT_SHOULDER, width, height)
        side_sign = -1
    else:
        left_shoulder = get_xy(norm_pose, LEFT_SHOULDER, width, height)
        right_shoulder = get_xy(norm_pose, RIGHT_SHOULDER, width, height)
        left_hip = get_xy(norm_pose, LEFT_HIP, width, height)
        right_hip = get_xy(norm_pose, RIGHT_HIP, width, height)

        pts = [p for p in (left_shoulder, right_shoulder, left_hip, right_hip) if p is not None]
        if len(pts) < 2:
            return annotated

        x = int(sum(p[0] for p in pts) / len(pts))
        y = int(sum(p[1] for p in pts) / len(pts))
        hip = (x, y)
        shoulder = (x, y - 80)
        side_sign = 0

    if hip is None or shoulder is None:
        return annotated

    # Decide classification from angle if back_label is not already provided
    if back_label is None and back_angle_value:
        if "side" in camera_view:
            if back_angle_value is not None and back_angle_value <= 18:
                status = "Excellent"
            elif back_angle_value is not None and back_angle_value <= 28:
                status = "Good"
            else:
                status = "Warning"
        else:
            if back_angle_value is not None and back_angle_value <= 20:
                status = "Excellent"
            elif back_angle_value is not None and back_angle_value <= 30:
                status = "Good"
            else:
                status = "Warning"
    else:
        status = str(back_label).strip()

    label_prefix = "Back"
    label_status = status

    hx, hy = hip
    sx, sy = shoulder

    if side_sign != 0:
        text_x = int((hx + sx) / 2 + side_sign * 25)
        text_y = int((hy + sy) / 2) - 10
    else:
        text_x = int((hx + sx) / 2 - 90)
        text_y = int((hy + sy) / 2) - 10

    text_x = max(10, min(text_x, width - 280))
    text_y = max(30, min(text_y, height - 30))

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Back",
        status=label_status,
        font_size=25,
        color=(255, 0, 0),
    )


def draw_valgus_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    valgus_label=None,
):
    if camera_view not in ("front", "angled"):
        return annotated

    left_knee = get_xy(norm_pose, LEFT_KNEE, width, height)
    right_knee = get_xy(norm_pose, RIGHT_KNEE, width, height)

    knee_points = [p for p in (left_knee, right_knee) if p is not None]
    if not knee_points:
        return annotated

    kx = int(sum(p[0] for p in knee_points) / len(knee_points))
    ky = int(sum(p[1] for p in knee_points) / len(knee_points))

    status = str(valgus_label or "").strip()

    text_x = max(10, min(text_x, width - 280))
    text_y = max(30, min(text_y, height - 30))

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Knee Tracking",
        status=status or "Warning",
        font_size=25,
        color=(0, 220, 0),
    )


def draw_label_with_warning_chip(
    annotated,
    text_x,
    text_y,
    prefix,
    status,
    font_size=25,
    color=None,
):
    pil_img = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    font = _load_font(font_size)

    red_rgb = (255, 0, 0)
    white_rgb = (255, 255, 255)
    black_rgb = (0, 0, 0)
    green_rgb = (0, 220, 0)

    status_clean = str(status or "").strip()
    status_lower = status_clean.lower()

    border_bgr = color or (0, 220, 0)
    border_rgb = (border_bgr[2], border_bgr[1], border_bgr[0])

    def draw_chip(x, y, text, fill_color, text_color, outline_color):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        box_w = 160
        box_h = 40

        box_x1 = x
        box_y1 = y
        box_x2 = x + box_w
        box_y2 = y + box_h

        draw.rounded_rectangle(
            (box_x1, box_y1, box_x2, box_y2),
            fill=fill_color,
            outline=outline_color,
            width=2,
        )

        text_draw_x = box_x1 + (box_w - tw) / 2 - bbox[0]
        text_draw_y = box_y1 + (box_h - th) / 2 - bbox[1]

        draw.text(
            (text_draw_x, text_draw_y),
            text,
            font=font,
            fill=text_color,
        )
        return box_x2

    prefix_text = f"{prefix} · "
    cursor_x = draw_chip(
        text_x,
        text_y,
        prefix_text,
        fill_color=black_rgb,
        text_color=green_rgb if status_lower in ("good", "excellent") else white_rgb,
        outline_color=border_rgb,
    )

    if status_clean:
        status_text = "Warning" if status_lower == "warning" else status_clean

        if status_lower == "warning":
            fill_color = red_rgb
            text_color = white_rgb
            outline_color = red_rgb
        else:
            fill_color = black_rgb
            text_color = green_rgb if status_lower in ("good", "excellent") else white_rgb
            outline_color = border_rgb

        draw_chip(
            cursor_x + 4,
            text_y,
            status_text,
            fill_color=fill_color,
            text_color=text_color,
            outline_color=outline_color,
        )

    annotated[:] = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return annotated