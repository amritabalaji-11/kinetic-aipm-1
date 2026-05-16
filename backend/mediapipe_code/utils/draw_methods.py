import cv2


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