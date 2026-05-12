from typing import Optional
import numpy as np
from utils.pose_landmarks import (
    LEFT_SHOULDER, RIGHT_SHOULDER
)


def calculate_hip_angle(shoulder, hip, knee):
    """
    Calculate hip flexion angle
    
    Args:
        shoulder: (x, y, z) coordinates of shoulder landmark
        hip: (x, y, z) coordinates of hip landmark
        knee: (x, y, z) coordinates of knee landmark
    
    Returns:
        angle: Hip angle in degrees (0-180)
    """
    
    # Convert to numpy arrays
    shoulder = np.array([shoulder.x, shoulder.y, shoulder.z])
    hip = np.array([hip.x, hip.y, hip.z])
    knee = np.array([knee.x, knee.y, knee.z])
    
    # Calculate vectors
    vector_shoulder_hip = shoulder - hip
    vector_knee_hip = knee - hip
    
    # Calculate angle using dot product
    cosine_angle = np.dot(vector_shoulder_hip, vector_knee_hip) / (
        np.linalg.norm(vector_shoulder_hip) * np.linalg.norm(vector_knee_hip)
    )
    
    # Clip to avoid numerical errors
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    # Convert to degrees
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle


def calculate_knee_angle(hip, knee, ankle):
    """
    Calculate knee flexion angle
    
    Returns:
        angle: Knee angle in degrees (0-180)
    """
    
    hip = np.array([hip.x, hip.y, hip.z])
    knee = np.array([knee.x, knee.y, knee.z])
    ankle = np.array([ankle.x, ankle.y, ankle.z])
    
    vector_hip_knee = hip - knee
    vector_ankle_knee = ankle - knee
    
    cosine_angle = np.dot(vector_hip_knee, vector_ankle_knee) / (
        np.linalg.norm(vector_hip_knee) * np.linalg.norm(vector_ankle_knee)
    )
    
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle


def calculate_knee_valgus(hip, knee, ankle):
    """
    Calculate knee valgus (inward cave) or varus (outward bow)
    
    Returns:
        valgus_distance: Distance of knee from hip-ankle line (pixels or normalized)
        Positive = valgus (knee caving in)
        Negative = varus (knee bowing out)
    """
    
    hip = np.array([hip.x, hip.y])  # Use only x, y (2D projection)
    knee = np.array([knee.x, knee.y])
    ankle = np.array([ankle.x, ankle.y])
    
    # Line from hip to ankle
    line_vector = ankle - hip
    point_vector = knee - hip
    
    # Project knee onto hip-ankle line
    line_length = np.linalg.norm(line_vector)
    line_unit = line_vector / line_length
    
    projection_length = np.dot(point_vector, line_unit)
    projection_point = hip + projection_length * line_unit
    
    # Distance from knee to the line (perpendicular distance)
    valgus_distance = knee - projection_point
    
    # Return x-component (lateral displacement)
    return valgus_distance[0]

def calculate_torso_pelvis_angle(
        shoulder_mid, hip_mid, knee_mid
    ) -> Optional[float]:
    """
    Computes torso-pelvis angle using world coordinates.
    """
    shoulder_vec = np.array([
        shoulder_mid.x,
        shoulder_mid.y,
        shoulder_mid.z,
    ])

    hip_vec = np.array([
        hip_mid.x,
        hip_mid.y,
        hip_mid.z,
    ])

    knee_vec = np.array([
        knee_mid.x,
        knee_mid.y,
        knee_mid.z,
    ])

    torso_vec = hip_vec - shoulder_vec
    pelvis_vec = knee_vec - hip_vec

        # -----------------------------------
        # Angle
        # -----------------------------------

    torso_norm = np.linalg.norm(torso_vec)
    pelvis_norm = np.linalg.norm(pelvis_vec)

    if torso_norm == 0 or pelvis_norm == 0:
        return None

    cosine_angle = np.dot(torso_vec, pelvis_vec) / (
        torso_norm * pelvis_norm
    )

    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)

    angle_deg = np.degrees(np.arccos(cosine_angle))

    return float(angle_deg)


def detect_camera_view(landmarks, world_landmarks):
    left = landmarks[LEFT_SHOULDER]
    right = landmarks[RIGHT_SHOULDER]

    left_w = world_landmarks[LEFT_SHOULDER]
    right_w = world_landmarks[RIGHT_SHOULDER]

    dx = abs(left.x - right.x)
    dz = abs(left_w.z - right_w.z)

    # ---------------------------
    # FRONT
    # ---------------------------
    if dx > 0.12 and dz < 0.1:
        return "front"

    # ---------------------------
    # SIDE
    # ---------------------------
    if dx < 0.08 and dz > 0.15:
        if left_w.z < right_w.z:
            return "side_left"
        else:
            return "side_right"

    # ---------------------------
    # ANGLED
    # ---------------------------
    return "angled"


def femur_vertical_angle(hip, knee):
    """
    Angle between femur (hip -> knee)
    and global vertical axis.

    Returns:
        0°   -> femur vertical
        90°  -> femur horizontal
    """

    femur_vec = np.array([
        knee.x - hip.x,
        knee.y - hip.y,
        knee.z - hip.z,
    ])

    norm = np.linalg.norm(femur_vec)

    if norm == 0:
        return None

    femur_vec = femur_vec / norm

    vertical = np.array([0, -1, 0])

    cos_theta = np.dot(femur_vec, vertical)

    angle = np.degrees(
        np.arccos(
            np.clip(cos_theta, -1.0, 1.0)
        )
    )

    return angle


def angle_between(a, b, c):
    """Angle at point b in the triangle a-b-c."""
    v1 = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    v2 = np.array([c.x - b.x, c.y - b.y, c.z - b.z])

    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    if denom == 0:
        return None

    cos_a = np.dot(v1, v2) / denom
    return np.degrees(np.arccos(np.clip(cos_a, -1.0, 1.0)))


def back_angle(shoulder, hip):
    """Torso lean from vertical."""
    torso = np.array([shoulder.x - hip.x, shoulder.y - hip.y, shoulder.z - hip.z])
    norm = np.linalg.norm(torso)
    if norm == 0:
        return None

    vertical = np.array([0, -1, 0])
    cos_a = np.dot(torso, vertical) / norm
    return np.degrees(np.arccos(np.clip(cos_a, -1.0, 1.0)))


def ankle_dorsiflexion(knee, ankle):
    """
    Tibia inclination from vertical.

    Returns:
        degrees of ankle dorsiflexion proxy
    """

    tibia = np.array([
        knee.x - ankle.x,
        knee.y - ankle.y,
        knee.z - ankle.z,
    ])

    norm = np.linalg.norm(tibia)

    if norm == 0:
        return None

    tibia = tibia / norm

    vertical = np.array([0, -1, 0])

    cos_theta = np.dot(tibia, vertical)

    angle = np.degrees(
        np.arccos(
            np.clip(cos_theta, -1.0, 1.0)
        )
    )

    return angle