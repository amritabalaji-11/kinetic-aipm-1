from typing import Optional
import numpy as np
import cv2

# Lower Body (Squat Mechanics)
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
LEFT_HEEL = 29
RIGHT_HEEL = 30
LEFT_FOOT_INDEX = 31
RIGHT_FOOT_INDEX = 32

# Upper Body (Back/Torso Analysis)
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
NOSE = 0
LEFT_EAR = 7
RIGHT_EAR = 8

# Reference Points (Stability)
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16


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


def calculate_dorsiflexion_angle(knee, ankle, foot):
    foot = np.array([foot.x, foot.y, foot.z])
    knee = np.array([knee.x, knee.y, knee.z])
    ankle = np.array([ankle.x, ankle.y, ankle.z])
    
    vector_knee_ankle = knee - ankle
    vector_ankle_foot = ankle - foot
    
    cosine_angle = np.dot(vector_knee_ankle, vector_ankle_foot) / (
        np.linalg.norm(vector_knee_ankle) * np.linalg.norm(vector_ankle_foot)
    )
    
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle


def calculate_back_angle(shoulder, hip):
    """
    Calculate torso lean angle relative to vertical
    
    Returns:
        angle: Back angle in degrees from vertical (0-90)
    """
    
    shoulder = np.array([shoulder.x, shoulder.y, shoulder.z])
    hip = np.array([hip.x, hip.y, hip.z])
    
    # Vector from hip to shoulder
    torso_vector = shoulder - hip
    
    # Vertical reference vector (in image coordinates, y-axis is vertical)
    # Negative because y increases downward in image coordinates
    vertical_vector = np.array([0, -1, 0])
    
    # Calculate angle
    cosine_angle = np.dot(torso_vector, vertical_vector) / (
        np.linalg.norm(torso_vector) * np.linalg.norm(vertical_vector)
    )
    
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle


def calculate_ankle_angle(knee, ankle, foot_index):
    """
    Calculate ankle dorsiflexion angle
    """
    
    knee = np.array([knee.x, knee.y, knee.z])
    ankle = np.array([ankle.x, ankle.y, ankle.z])
    foot = np.array([foot_index.x, foot_index.y, foot_index.z])
    
    vector_knee_ankle = knee - ankle
    vector_foot_ankle = foot - ankle
    
    cosine_angle = np.dot(vector_knee_ankle, vector_foot_ankle) / (
        np.linalg.norm(vector_knee_ankle) * np.linalg.norm(vector_foot_ankle)
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


def check_landmark_visibility(landmarks):
    """
    Check if all required landmarks are visible
    """
    required_landmarks = [
        LEFT_HIP, RIGHT_HIP, 
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE
    ]
    
    for idx in required_landmarks:
        if landmarks.landmark[idx].visibility < 0.5:
            return False, f"Landmark {idx} not visible"
    
    return True, "All landmarks visible"


def validate_camera_setup(landmarks):
    """
    Check if user's camera is positioned correctly
    
    Returns:
        valid: Boolean
        feedback: String with instructions
    """
    # Check 1: Full body visible
    nose_y = landmarks.landmark[NOSE].y
    ankle_y = max(
        landmarks.landmark[LEFT_ANKLE].y,
        landmarks.landmark[RIGHT_ANKLE].y
    )
    
    if ankle_y - nose_y < 0.6:
        return False, "Move camera back - can't see full body"
    
    # Check 2: Not too far
    shoulder_width = abs(
        landmarks.landmark[LEFT_SHOULDER].x - 
        landmarks.landmark[RIGHT_SHOULDER].x
    )
    
    if shoulder_width < 0.1:
        return False, "Move camera closer - too far away"
    
    # Check 3: Good angle (45° front-side preferred)
    if shoulder_width > 0.3:
        return False, "Move to 45° angle - currently too frontal"
    
    return True, "Camera setup looks good!"


def calculate_back_angle(shoulder, hip, knee) -> Optional[float]:
    torso_vec = np.array([hip.x - shoulder.x, hip.y - shoulder.y, hip.z - shoulder.z], dtype=float)
    pelvis_vec = np.array([knee.x - hip.x, knee.y - hip.y, knee.z - hip.z], dtype=float)

    torso_norm = np.linalg.norm(torso_vec)
    pelvis_norm = np.linalg.norm(pelvis_vec)

    if torso_norm == 0 or pelvis_norm == 0:
        return None

    cosine_angle = np.dot(torso_vec, pelvis_vec) / (torso_norm * pelvis_norm)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)

    return float(np.degrees(np.arccos(cosine_angle)))


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