from dataclasses import dataclass, field
from typing import Dict, List
from mp_utils.pose.pose_landmarks import (
    LEFT_SHOULDER, RIGHT_SHOULDER,
    LEFT_HIP, RIGHT_HIP,
    LEFT_KNEE, RIGHT_KNEE,
    LEFT_ANKLE, RIGHT_ANKLE,
    LEFT_HEEL, RIGHT_HEEL,
    LEFT_FOOT, RIGHT_FOOT,
    LEFT_EAR, RIGHT_EAR,
    LEFT_ELBOW, RIGHT_ELBOW,
    LEFT_EYE, RIGHT_EYE,
    NOSE
)

import os
MEDIAPIPE_MODEL = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../model/pose_landmarker_full.task"))

LANDMARKS = {
    # -------------------------
    # Critical
    # -------------------------
    "LEFT_HIP": {
        "id": LEFT_HIP,
        "weight": 0.083,
        "category": "critical"
    },
    "RIGHT_HIP": {
        "id": RIGHT_HIP,
        "weight": 0.083,
        "category": "critical"
    },
    "LEFT_KNEE": {
        "id": LEFT_KNEE,
        "weight": 0.083,
        "category": "critical"
    },
    "RIGHT_KNEE": {
        "id": RIGHT_KNEE,
        "weight": 0.083,
        "category": "critical"
    },
    "LEFT_HEEL": {
        "id": LEFT_HEEL,
        "weight": 0.083,
        "category": "critical"
    },
    "RIGHT_HEEL": {
        "id": RIGHT_HEEL,
        "weight": 0.083,
        "category": "critical"
    },

    # -------------------------
    # Important
    # -------------------------
    "LEFT_SHOULDER": {
        "id": LEFT_SHOULDER,
        "weight": 0.044,
        "category": "important"
    },
    "RIGHT_SHOULDER": {
        "id": RIGHT_SHOULDER,
        "weight": 0.044,
        "category": "important"
    },
    "LEFT_ANKLE": {
        "id": LEFT_ANKLE,
        "weight": 0.044,
        "category": "important"
    },
    "RIGHT_ANKLE": {
        "id": RIGHT_ANKLE,
        "weight": 0.044,
        "category": "important"
    },
    "LEFT_FOOT": {
        "id": LEFT_FOOT,
        "weight": 0.044,
        "category": "important"
    },
    "RIGHT_FOOT": {
        "id": RIGHT_FOOT,
        "weight": 0.044,
        "category": "important"
    },
    "LEFT_EAR": {
        "id": LEFT_EAR,
        "weight": 0.044,
        "category": "important"
    },
    "RIGHT_EAR": {
        "id": RIGHT_EAR,
        "weight": 0.044,
        "category": "important"
    },

    # -------------------------
    # Least impact
    # -------------------------
    "LEFT_ELBOW": {
        "id": LEFT_ELBOW,
        "weight": 0.030,
        "category": "least_impact"
    },
    "RIGHT_ELBOW": {
        "id": RIGHT_ELBOW,
        "weight": 0.030,
        "category": "least_impact"
    },
    "LEFT_EYE": {
        "id": LEFT_EYE,
        "weight": 0.030,
        "category": "least_impact"
    },
    "RIGHT_EYE": {
        "id": RIGHT_EYE,
        "weight": 0.030,
        "category": "least_impact"
    },
    "NOSE": {
        "id": NOSE,
        "weight": 0.030,
        "category": "least_impact"
    },
}

LEG_LANDMARK_NAMES = [
    "LEFT_SHOULDER", "RIGHT_SHOULDER",
    "LEFT_HIP", "RIGHT_HIP",
    "LEFT_KNEE", "RIGHT_KNEE",
    "LEFT_ANKLE", "RIGHT_ANKLE"
]

LEG_TARGET_LANDMARKS = [LANDMARKS[name]["id"] for name in LEG_LANDMARK_NAMES]

LEG_CONNECTIONS = frozenset([
    (LANDMARKS["LEFT_SHOULDER"]["id"], LANDMARKS["RIGHT_SHOULDER"]["id"]),
    (LANDMARKS["LEFT_SHOULDER"]["id"], LANDMARKS["LEFT_HIP"]["id"]),
    (LANDMARKS["RIGHT_SHOULDER"]["id"], LANDMARKS["RIGHT_HIP"]["id"]),
    (LANDMARKS["LEFT_HIP"]["id"], LANDMARKS["LEFT_KNEE"]["id"]),
    (LANDMARKS["RIGHT_HIP"]["id"], LANDMARKS["RIGHT_KNEE"]["id"]),
    (LANDMARKS["LEFT_KNEE"]["id"], LANDMARKS["LEFT_ANKLE"]["id"]),
    (LANDMARKS["RIGHT_KNEE"]["id"], LANDMARKS["RIGHT_ANKLE"]["id"]),
    (LANDMARKS["LEFT_HIP"]["id"], LANDMARKS["RIGHT_HIP"]["id"]),
])

RIGHT_SIDE = [
    LANDMARKS["RIGHT_SHOULDER"]["id"],
    LANDMARKS["RIGHT_HIP"]["id"],
    LANDMARKS["RIGHT_KNEE"]["id"],
    LANDMARKS["RIGHT_ANKLE"]["id"],
]

LEFT_SIDE = [
    LANDMARKS["LEFT_SHOULDER"]["id"],
    LANDMARKS["LEFT_HIP"]["id"],
    LANDMARKS["LEFT_KNEE"]["id"],
    LANDMARKS["LEFT_ANKLE"]["id"],
]

LEG_CONNECTIONS_LEFT_SIDE = [
    (LANDMARKS["LEFT_SHOULDER"]["id"], LANDMARKS["LEFT_HIP"]["id"]),
    (LANDMARKS["LEFT_HIP"]["id"], LANDMARKS["LEFT_KNEE"]["id"]),
    (LANDMARKS["LEFT_KNEE"]["id"], LANDMARKS["LEFT_ANKLE"]["id"]),
]

LEG_CONNECTIONS_RIGHT_SIDE = [
    (LANDMARKS["RIGHT_SHOULDER"]["id"], LANDMARKS["RIGHT_HIP"]["id"]),
    (LANDMARKS["RIGHT_HIP"]["id"], LANDMARKS["RIGHT_KNEE"]["id"]),
    (LANDMARKS["RIGHT_KNEE"]["id"], LANDMARKS["RIGHT_ANKLE"]["id"]),
]

VISIBILITY_THRESHOLD = 0.70
PRESENCE_THRESHOLD = 0.70
CRITICAL_HARD_FLOOR = 0.60

GOOD_THRESHOLD = 0.85
ACCEPTABLE_THRESHOLD = 0.70

# Output structure

@dataclass
class FrameLandmarkData:
    x: float          # world x
    y: float          # world y
    z: float          # world z
    screen_x: float
    screen_y: float
    visibility: float
    presence: float

@dataclass
class FrameAssessment:
    frame_index: int
    timestamp_ms: int
    camera_view: str
    passes_critical_gate: bool

    tracked_landmarks: Dict[str, FrameLandmarkData] = field(default_factory=dict)
    expected_landmarks: List[str] = field(default_factory=list)
    expected_critical_landmarks: List[str] = field(default_factory=list)

    frame_reliability: float = 0.0
    critical_failures: List[str] = field(default_factory=list)