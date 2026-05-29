import json
import os

import cv2
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from mediapipe_code.utils.pose_landmarks import LEFT_ANKLE, LEFT_HIP, LEFT_KNEE, LEFT_SHOULDER, RIGHT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_SHOULDER
from mediapipe_code.utils.landmark_quality_methods import safe_get_landmark
from mediapipe_code.utils.landmark_quality_configuration import LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, RIGHT_SIDE

FONT_PATH = "segoeui.ttf"
FONT_SIZE = 25
LEFT_LABEL_X = 12
BLUE = (255, 180, 30)
GREEN = (0, 255, 0)
ORANGE = (0, 140, 255)
DORSIFLEXION_COLOR = (255, 220, 0)
DEPTH_COLOR = (0, 220, 0)
BACK_COLOR = (0, 255, 255)
KNEE_POINT_COLOR = (255, 0, 255)


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
        """
        Annotate the frame with pose landmarks and metrics.
        """
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
    ankle_knee_color=DORSIFLEXION_COLOR,  
    knee_hip_color=DEPTH_COLOR,       
    hip_shoulder_color=BACK_COLOR,
    thickness=4,
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

        if idx in (LEFT_KNEE, RIGHT_KNEE):
            current_color = KNEE_POINT_COLOR
        else:
            current_color = point_color

        circle(image, (x, y), 10, current_color, -1)

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

        # shoulder -> shoulder
        if pair == {LEFT_SHOULDER, RIGHT_SHOULDER}:
            return hip_shoulder_color

        # hip -> hip
        if pair == {LEFT_HIP, RIGHT_HIP}:
            return knee_hip_color

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
    """
    Get the (x, y) coordinates of the landmark at the given index, or None if it doesn't exist.
    """
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

    color = KNEE_POINT_COLOR

    # -----------------------------------------
    # Arrows pointing toward each other
    # -----------------------------------------
    arrow_len = 45

    # LEFT arrow points RIGHT
    cv2.arrowedLine(
        annotated,
        (rk_x, rk_y),
        (rk_x + arrow_len, rk_y),
        color,
        4,
        tipLength=0.35,
    )

    # RIGHT arrow points LEFT
    cv2.arrowedLine(
        annotated,
        (lk_x, lk_y),
        (lk_x - arrow_len, lk_y),
        color,
        4,
        tipLength=0.35,
    )

    return annotated


def _load_font(size=FONT_SIZE):
    """
    Load a TTF font, or fall back to the default PIL font if it fails.
    """
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

        font = _load_font(max(16, int(FONT_SIZE)))
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


def bgr_to_rgb(color_bgr):
    """
    Convert a color from BGR to RGB format.
    """
    return (color_bgr[2], color_bgr[1], color_bgr[0])


def draw_panel(image, x, y, w, h, color=(0, 0, 0)):
    """Draw a solid rectangle on a BGR image."""
    
    cv2.rectangle(
        image,
        (x, y),
        (x + w, y + h),
        color,
        -1,
    )


def add_side_faults_panel(
    annotated,
    faults_info,
    start_x=12,
    start_y=12,
    padding=12,
    line_h=36,
):
    """Semi-transparent top-left panel."""

    def sort_key(fault):
        kind = fault.get("kind", "fault")
        if kind == "info":
            group = 2
        else:
            group = 0 if not fault.get("pass", True) else 1
        severity = -(fault.get("severity", 0.0) or 0.0)
        return (group, severity)

    ordered = sorted(faults_info, key=sort_key)

    dummy_img = Image.new("RGB", (10, 10))
    dummy_draw = ImageDraw.Draw(dummy_img)
    font = _load_font(FONT_SIZE)

    max_text_w = 0
    for fault in ordered:
        preview = f"{fault['label']} — {fault['text']}"
        bbox = dummy_draw.textbbox((0, 0), preview, font=font)
        text_w = bbox[2] - bbox[0]
        max_text_w = max(max_text_w, text_w)

    img_h, img_w = annotated.shape[:2]

    panel_w = max(420, max_text_w + padding * 2 + 200)

    # límite derecho con margen de 12 px
    max_allowed_w = img_w - start_x - 12

    # clamp del ancho
    panel_w = min(panel_w, max_allowed_w)

    panel_h = padding * 2 + line_h * len(ordered)

    draw_panel(
        annotated,
        start_x,
        start_y,
        panel_w,
        panel_h,
        color=(0, 0, 0),
    )

    pil_img = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)

    y = start_y + padding + 24

    for fault in ordered:
        kind = fault.get("kind", "fault")
        label = f"{fault['label']} - {fault['text']}"
        font = _load_font(FONT_SIZE)

        # Use the same vertical center for icon and text
        row_center_y = y
        icon_size = 20
        icon_x = start_x + padding
        icon_y = row_center_y - icon_size // 2

        if kind == "info":
            color_bgr = fault.get("color", BLUE)
            color_rgb = bgr_to_rgb(color_bgr)
            style = fault.get("style", "solid")

            marker_x1 = icon_x
            marker_x2 = marker_x1 + 28
            marker_y = row_center_y

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
                (marker_x2 + 10, row_center_y - 18),
                label,
                font=font,
                stroke_width=1,
                fill=color_rgb,
            )

        else:
            is_pass = fault.get("pass", True)
            color_bgr = (0, 255, 0) if is_pass else (0, 0, 255)
            color_rgb = bgr_to_rgb(color_bgr)

            if is_pass:
                draw_check(draw, icon_x, icon_y, color_rgb)
            else:
                draw_cross(draw, icon_x, icon_y, color_rgb)

            draw.text(
                (icon_x + 40, row_center_y - 18),
                label,
                font=font,
                stroke_width=1,
                fill=bgr_to_rgb(fault.get("color")),
            )

        y += line_h

    annotated[:] = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _fmt_angle(value):
    return "N/A" if value is None else f"{value:.0f}°"


def annotate_frame_front(
    frame_bgr,
    frame_info,
    rep_data,
    width,
    height,
):
    """
    Annotate the frame with pose landmarks, metrics, and fault labels for front/angled view.
    """
    annotated = frame_bgr.copy()

    
    draw_points_and_lines(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            LEG_TARGET_LANDMARKS,
            LEG_CONNECTIONS,
            threshold=0.0,
    )
        

    dorsiflexion_status = rep_data["ankle_data"]["dorsiflexion_status"]
    depth_classification = rep_data["depth_data"]["depth_classification"]
    back_label = rep_data["back_data"]["back_label"]


    dorsiflexion_angle = rep_data["ankle_data"]["dorsiflexion_at_bottom"]
    depth_angle = rep_data["depth_data"]["hip_angle_at_bottom"]
    back_angle_value = rep_data["back_data"]["back_angle_at_bottom"]

    valgus_label = rep_data["stability_data"]["valgus_label"]

    valgus_distance = rep_data["stability_data"]["knee_valgus_distance"]
    

    faults_info = [
        {
            "label": "Dorsiflexion",
            "pass": dorsiflexion_status.lower() in ("good", "excellent"),
            "text": f"{dorsiflexion_status.replace("_", " ").title()} - {_fmt_angle(dorsiflexion_angle)}" if dorsiflexion_status.lower() in ("good", "excellent") 
            else f"{dorsiflexion_status.replace("_", " ").title()} - {_fmt_angle(dorsiflexion_angle)} (target >= 25°)",
            "severity": 0.0 if dorsiflexion_status.lower() in ("good", "excellent") else 1.0,
            "color": (255, 220, 0),
        },
        {
            "label": "Depth",
            "pass": depth_classification.lower() in ("good", "excellent"),
            "text": f"{depth_classification.title()} - {_fmt_angle(depth_angle)}" if depth_classification.lower() in ("good", "excellent") 
            else f"{depth_classification.title()} - {_fmt_angle(depth_angle)} (target <= 105°)",
            "severity": 0.0 if depth_classification.lower() in ("good", "excellent") else 1.0,
            "color": (0, 255, 0),
        },
        {
            "label": "Back",
            "pass": back_label.lower() in ("good", "excellent"),
            "text": f"{back_label.title()} - {_fmt_angle(back_angle_value)}" if back_label.lower() in ("good", "excellent") 
            else f"{back_label.title()} - {_fmt_angle(back_angle_value)} (target <= 30°)",
            "severity": 0.0 if back_label.lower() in ("good", "excellent") else 1.0,
            "color": (0, 255, 255),
        },
        {
            "label": "Knee Tracking",
            "pass": valgus_label.lower() == "good",
            "text": f"{valgus_label.title()} - {int(valgus_distance*100)}%" if valgus_label.lower() == "good" 
            else f"{back_label.title()} - {int(valgus_distance*100)}% (target > 20%)",
            "severity": 0.0 if back_label.lower() in ("good", "excellent") else 1.0,
            "color": KNEE_POINT_COLOR,
        },
    ]

    
    annotated = draw_dorsiflexion_status_label(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            frame_info["camera_view"],
            dorsiflexion_status=dorsiflexion_status,
        )

    annotated = draw_depth_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        depth_classification=depth_classification,
    )

    annotated = draw_back_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        back_label=back_label,
    )

    annotated = draw_valgus_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        valgus_label=valgus_label,
    )

    if valgus_label == "Warning":
        annotated = draw_knee_valgus_overlay(annotated, frame_info["norm_pose"], width, height)

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
    frame_info,
    rep_data,
    width,
    height,
):
    """
    Annotate the frame with pose landmarks, metrics, and fault labels for side view.
    """
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

    dorsiflexion_status = rep_data["ankle_data"]["dorsiflexion_status"]
    depth_classification = rep_data["depth_data"]["depth_classification"]
    back_label = rep_data["back_data"]["back_label"]


    dorsiflexion_angle = rep_data["ankle_data"]["dorsiflexion_at_bottom"]
    depth_angle = rep_data["depth_data"]["knee_angle_at_bottom"]
    back_angle_value = rep_data["back_data"]["back_angle_at_bottom"]
    

    faults_info = [
        {
            "label": "Dorsiflexion",
            "pass": dorsiflexion_status.lower() in ("good", "excellent"),
            "text": f"{dorsiflexion_status.replace("_", " ").title()} - {_fmt_angle(dorsiflexion_angle)}" if dorsiflexion_status.lower() in ("good", "excellent") 
            else f"{dorsiflexion_status.replace("_", " ").title()} - {_fmt_angle(dorsiflexion_angle)} (target >= 30°)",
            "severity": 0.0 if dorsiflexion_status.lower() in ("good", "excellent") else 1.0,
            "color": (255, 220, 0),
        },
        {
            "label": "Depth",
            "pass": depth_classification.lower() in ("good", "excellent"),
            "text": f"{depth_classification.title()} - {_fmt_angle(depth_angle)}" if depth_classification.lower() in ("good", "excellent") 
            else f"{depth_classification.title()} - {_fmt_angle(depth_angle)} (target <= 90°)",
            "severity": 0.0 if depth_classification.lower() in ("good", "excellent") else 1.0,
            "color": (0, 255, 0),
        },
        {
            "label": "Back",
            "pass": back_label.lower() in ("good", "excellent"),
            "text": f"{back_label.title()} - {_fmt_angle(back_angle_value)}" if back_label.lower() in ("good", "excellent") 
            else f"{back_label.title()} - {_fmt_angle(back_angle_value)} (target <= 28°)",
            "severity": 0.0 if back_label.lower() in ("good", "excellent") else 1.0,
            "color": (0, 255, 255),
        },
    ]

    
    annotated = draw_dorsiflexion_status_label(
            annotated,
            frame_info["norm_pose"],
            width,
            height,
            frame_info["camera_view"],
            dorsiflexion_status=dorsiflexion_status,
        )

    annotated = draw_depth_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        depth_classification=depth_classification,
    )

    annotated = draw_back_status_label(
        annotated,
        frame_info["norm_pose"],
        width,
        height,
        frame_info["camera_view"],
        back_label=back_label,
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


def overlay_frame(frame, frame_info, camera_view, rep_data, output_filename):
    """Overlay the frame with annotations based on the camera view and rep data, then save it."""
    height, width = frame.shape[:2]

    if camera_view in ("front", "angled"):

        annotated_worst_frame = annotate_frame_front(
            frame,
            frame_info,
            rep_data,
            width,
            height
        )
    else:
        annotated_worst_frame = annotate_frame_side(
        frame,
        frame_info,
        rep_data,
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


def extract_worst_frame(video_url, analysis_path, rep_frames, bio_json):
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
        resized:
            The worst frame on 720p
        filtered_frame_critical:
            The worst frame data
        dominant_camera_view:
            The dominant camera view in all the frames of the worst rep
    """

    with open(analysis_path, "r") as f:
        json_analysis = json.load(f)

    
    worst_rep_index = json_analysis["db_output"]["worst_rep_index"]
    worse_rep = json_analysis["db_output"]["rep_scores"][worst_rep_index]["rep_number"]


    filtered_frames_worse_rep = [
        frame
        for frame in rep_frames
        if frame["rep_number"] == worse_rep
    ]

    dominant_camera_view = get_dominant_camera_view_worst_frame(filtered_frames_worse_rep)

    if "side" in dominant_camera_view:
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

    worse_rep_data = [
        rep
        for rep in bio_json["reps"]
        if rep["rep_number"] == worse_rep
    ]

    return resized, filtered_frame_critical, dominant_camera_view, worse_rep_data[0]


def get_dominant_camera_view_worst_frame(frames):
    """
    Get the dominant camera view among the frames of the worst rep, ignoring "unknown" or None values.
    """
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
):
    """Draw the dorsiflexion status label near the ankle/knee area, with a warning chip if not good/excellent."""
    if camera_view == "side_left":
        ankle = get_xy(norm_pose, LEFT_ANKLE, width, height)
        knee = get_xy(norm_pose, LEFT_KNEE, width, height)

    elif camera_view == "side_right":
        ankle = get_xy(norm_pose, RIGHT_ANKLE, width, height)
        knee = get_xy(norm_pose, RIGHT_KNEE, width, height)

    else:
        ankle = get_xy(norm_pose, LEFT_ANKLE, width, height)
        knee = get_xy(norm_pose, LEFT_KNEE, width, height)

    if ankle is None or knee is None:
        return annotated

    status = str(dorsiflexion_status or "").strip().lower()

    if status not in ("good", "excellent"):
        status = "Warning"
    else:
        status = status.title()


    _, ay = ankle
    _, ky = knee
    
    text_x = LEFT_LABEL_X
    text_y = int((ay + ky) / 2)

    if camera_view == "side_left":
        chip_width = 170
        right_padding = 12

        text_x = width - chip_width - right_padding

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Dorsiflexion",
        status=status,
        font_size=25,
        color=(255, 220, 0),
        camera_view=camera_view
    )


def draw_depth_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    depth_classification=None,
):
    """Draw the depth status label near the hip/knee area, with a warning chip if not good/excellent."""
    if camera_view == "side_left":
        hip = get_xy(norm_pose, LEFT_HIP, width, height)
        knee = get_xy(norm_pose, LEFT_KNEE, width, height)

    elif camera_view == "side_right":
        hip = get_xy(norm_pose, RIGHT_HIP, width, height)
        knee = get_xy(norm_pose, RIGHT_KNEE, width, height)

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


    if hip is None or knee is None:
        return annotated

    status = str(depth_classification or "").strip()

    _, ky = knee

    text_x = LEFT_LABEL_X
    text_y = ky - 35

    if camera_view == "side_left":
        chip_width = 170
        right_padding = 12

        text_x = width - chip_width - right_padding

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Depth",
        status=status or "Warning",
        font_size=25,
        color=(0, 220, 0),
        camera_view=camera_view
    )


def draw_back_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    back_label=None,
):
    """Draw the back status label near the shoulder/hip area, with a warning chip if not good/excellent."""
    if camera_view == "side_left":
        hip = get_xy(norm_pose, LEFT_HIP, width, height)
        shoulder = get_xy(norm_pose, LEFT_SHOULDER, width, height)

    elif camera_view == "side_right":
        hip = get_xy(norm_pose, RIGHT_HIP, width, height)
        shoulder = get_xy(norm_pose, RIGHT_SHOULDER, width, height)

    else:
        left_shoulder = get_xy(norm_pose, LEFT_SHOULDER, width, height)
        right_shoulder = get_xy(norm_pose, RIGHT_SHOULDER, width, height)

        left_hip = get_xy(norm_pose, LEFT_HIP, width, height)
        right_hip = get_xy(norm_pose, RIGHT_HIP, width, height)

        pts = [
            p for p in (
                left_shoulder,
                right_shoulder,
                left_hip,
                right_hip,
            )
            if p is not None
        ]

        if len(pts) < 2:
            return annotated

        x = int(sum(p[0] for p in pts) / len(pts))
        y = int(sum(p[1] for p in pts) / len(pts))

        hip = (x, y)
        shoulder = (x, y - 80)


    if hip is None or shoulder is None:
        return annotated

    status = str(back_label or "").strip()

    _, hy = hip
    _, sy = shoulder

    text_x = LEFT_LABEL_X
    text_y = int((hy + sy) / 2) - 100

    if camera_view == "side_left":
        chip_width = 170
        right_padding = 12

        text_x = width - chip_width - right_padding


    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Back",
        status=status,
        font_size=25,
        color=(0, 255, 255),
        camera_view=camera_view
    )


def draw_valgus_status_label(
    annotated,
    norm_pose,
    width,
    height,
    camera_view,
    valgus_label=None,
):
    """Draw the knee tracking status label near the knee area, with a warning chip if not good."""
    if camera_view not in ("front", "angled"):
        return annotated

    left_knee = get_xy(norm_pose, LEFT_KNEE, width, height)
    right_knee = get_xy(norm_pose, RIGHT_KNEE, width, height)

    knee_points = [
        p for p in (left_knee, right_knee)
        if p is not None
    ]

    if not knee_points:
        return annotated

    status = str(valgus_label or "").strip()

    chip_width = 170
    right_padding = 12

    text_x = width - chip_width - right_padding
    text_y = right_knee[1]

    return draw_label_with_warning_chip(
        annotated,
        text_x,
        text_y,
        prefix="Knee Tracking",
        status=status or "Warning",
        font_size=25,
        color=KNEE_POINT_COLOR,
        camera_view=camera_view
    )


def draw_label_with_warning_chip(
    annotated,
    text_x,
    text_y,
    prefix,
    status,
    font_size=25,
    color=None,
    camera_view=None
):
    """Draw a label with a warning chip if the status is not good/excellent."""
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

    def draw_chip(x, y, text, fill_color, text_color, outline_color, box_w=160, box_h=40):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

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
            stroke_width=1,
            fill=text_color,
        )
        return box_x2, box_y2

    prefix_text = prefix
    status_text = "Warning" if status_lower == "warning" else status_clean

    prefix_fill = black_rgb
    prefix_text_color = white_rgb
    status_fill = red_rgb if status_lower == "warning" else black_rgb
    status_text_color = white_rgb

    box_w = 170
    box_h = 40
    gap = 6

    prefix_text = prefix
    status_text = "Warning" if status_lower == "warning" else status_clean

    prefix_fill = black_rgb
    prefix_text_color = white_rgb
    status_fill = red_rgb if status_lower == "warning" else black_rgb
    status_text_color = white_rgb if status_lower == "warning" else (
        green_rgb if status_lower in ("good", "excellent") else white_rgb
    )

    box_w = 180
    box_h = 40
    gap = 6

        # prefix on top
    _, prefix_bottom = draw_chip(
            text_x,
            text_y,
            prefix_text,
            fill_color=prefix_fill,
            text_color=prefix_text_color,
            outline_color=border_rgb,
            box_w=box_w,
            box_h=box_h,
        )

        # status below
    draw_chip(
            text_x,
            prefix_bottom + gap,
            status_text,
            fill_color=status_fill,
            text_color=status_text_color,
            outline_color=red_rgb if status_lower == "warning" else border_rgb,
            box_w=box_w,
            box_h=box_h,
        )

    annotated[:] = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return annotated