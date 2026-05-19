import cv2

from utils.landmark_quality_configuration import LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, RIGHT_SIDE


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


def add_text_lines(image, lines, start_x=10, start_y=30, dy=40):
    """Draw a list of strings on the frame."""
    put_text = cv2.putText
    font = cv2.FONT_HERSHEY_SIMPLEX

    y = start_y
    for text, color, scale in lines:
        put_text(
            image,
            text,
            (start_x, y),
            font,
            scale,
            color,
            2,
        )
        y += dy


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