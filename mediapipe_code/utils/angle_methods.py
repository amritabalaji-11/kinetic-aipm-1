import math

import numpy as np
from utils.pose_landmarks import (
    LEFT_SHOULDER, RIGHT_SHOULDER
)


def detect_camera_view(norm_pose, side_threshold=0.10, front_threshold=0.22):
    """
    Detect camera view: front, side_left, side_right, angled.

    Heuristics:
    - Front: shoulders far apart in x.
    - Side: shoulders close in x, then infer side using visibility/z.
    - Angled: intermediate case.
    """

    left_shoulder = norm_pose[LEFT_SHOULDER]
    right_shoulder = norm_pose[RIGHT_SHOULDER]

    # Safety checks
    if left_shoulder is None or right_shoulder is None:
        return "angled"

    shoulder_width = abs(left_shoulder.x - right_shoulder.x)

    # FRONT
    if shoulder_width >= front_threshold:
        return "front"

    # SIDE
    if shoulder_width <= side_threshold:
        # Prefer visibility if available
        left_vis = getattr(left_shoulder, "visibility", None)
        right_vis = getattr(right_shoulder, "visibility", None)

        left_z = getattr(left_shoulder, "z", None)
        right_z = getattr(right_shoulder, "z", None)

        # 1) If z exists, use the shoulder closer to camera
        if left_z is not None and right_z is not None:
            # In many pose systems, the shoulder closer to the camera has a "smaller"
            # depth value. If your model behaves differently, invert this comparison.
            if left_z < right_z:
                return "side_left"
            elif right_z < left_z:
                return "side_right"

        # 2) Fallback: use visibility
        if left_vis is not None and right_vis is not None:
            if left_vis > right_vis:
                return "side_left"
            elif right_vis > left_vis:
                return "side_right"

        # 3) Final fallback: use x-position
        # If the left shoulder appears to the right in the image, it usually means
        # the person is turned to their left side.
        if left_shoulder.x > right_shoulder.x:
            return "side_left"
        return "side_right"

    # ANGLED
    return "angled"


def femur_vertical_angle(hip, knee):
    """Femur inclination from vertical."""
    dx = knee.x - hip.x
    dy = knee.y - hip.y
    dz = knee.z - hip.z

    norm = math.sqrt(dx * dx + dy * dy + dz * dz)
    if norm == 0:
        return None

    # dot with vertical (0, -1, 0)
    cos_theta = (-dy) / norm

    if cos_theta > 1.0:
        cos_theta = 1.0
    elif cos_theta < -1.0:
        cos_theta = -1.0

    return math.degrees(math.acos(cos_theta))

def angle_between(a, b, c):
    """Angle at point b in the triangle a-b-c."""

    v1x = a.x - b.x
    v1y = a.y - b.y
    v1z = a.z - b.z

    v2x = c.x - b.x
    v2y = c.y - b.y
    v2z = c.z - b.z

    n1 = math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z)
    n2 = math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z)

    if n1 == 0 or n2 == 0:
        return None

    cos_a = (v1x * v2x + v1y * v2y + v1z * v2z) / (n1 * n2)

    if cos_a > 1.0:
        cos_a = 1.0
    elif cos_a < -1.0:
        cos_a = -1.0

    return math.degrees(math.acos(cos_a))


def back_angle(shoulder, hip):
    """Torso lean from vertical."""
    dx = shoulder.x - hip.x
    dy = shoulder.y - hip.y
    dz = shoulder.z - hip.z

    norm = math.sqrt(dx * dx + dy * dy + dz * dz)
    if norm == 0:
        return None

    # dot(torso, vertical[0, -1, 0]) = -dy
    cos_a = (-dy) / norm

    if cos_a > 1.0:
        cos_a = 1.0
    elif cos_a < -1.0:
        cos_a = -1.0

    return math.degrees(math.acos(cos_a))


def ankle_dorsiflexion(knee, ankle):
    """
    Tibia inclination from vertical.
    Returns:
        degrees of ankle dorsiflexion proxy
    """
    dx = knee.x - ankle.x
    dy = knee.y - ankle.y
    dz = knee.z - ankle.z

    norm = math.sqrt(dx * dx + dy * dy + dz * dz)
    if norm == 0:
        return None

    # normalize tibia vector, then dot with vertical [0, -1, 0]
    cos_theta = (-dy) / norm

    if cos_theta > 1.0:
        cos_theta = 1.0
    elif cos_theta < -1.0:
        cos_theta = -1.0

    return math.degrees(math.acos(cos_theta))