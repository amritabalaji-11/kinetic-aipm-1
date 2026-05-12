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