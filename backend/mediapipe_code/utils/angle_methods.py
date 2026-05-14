import math

import numpy as np
from mediapipe_code.utils.pose_landmarks import (
    LEFT_SHOULDER, RIGHT_SHOULDER
)


def detect_camera_view(landmarks, world_landmarks):
    left = landmarks[LEFT_SHOULDER]
    right = landmarks[RIGHT_SHOULDER]
    left_w = world_landmarks[LEFT_SHOULDER]
    right_w = world_landmarks[RIGHT_SHOULDER]

    dx = left.x - right.x
    if dx < 0:
        dx = -dx

    dz = left_w.z - right_w.z
    if dz < 0:
        dz = -dz

    if dx > 0.12 and dz < 0.1:
        return "front"

    if dx < 0.08 and dz > 0.15:
        return "side_left" if left_w.z < right_w.z else "side_right"

    return "angled"


def femur_vertical_angle(hip, knee):
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