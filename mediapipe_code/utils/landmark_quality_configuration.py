from dataclasses import dataclass, field
from typing import Dict, List, Any
from utils.pose_landmarks import (
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

VISIBILITY_THRESHOLD = 0.70
PRESENCE_THRESHOLD = 0.70
CRITICAL_HARD_FLOOR = 0.60

GOOD_THRESHOLD = 0.85
ACCEPTABLE_THRESHOLD = 0.70

# Output structure

@dataclass
class FrameLandmarkData:
    x: float
    y: float
    z: float
    visibility: float
    presence: float

@dataclass
class FrameAssessment:
    frame_index: int
    timestamp_ms: int
    passes_critical_gate: bool
    critical_failures: List[str]
    tracked_landmarks: Dict[str, FrameLandmarkData]
    camera_view: str = "unknown"
    expected_landmarks: List[str] = field(default_factory=list)
    expected_critical_landmarks: List[str] = field(default_factory=list)

@dataclass
class VideoAssessment:
    reliability_by_landmark: Dict[str, float]
    composite_score: float
    status: str
    critical_flags: List[str]
    eligible_frames: List[Dict[str, Any]]
    all_frames: List[FrameAssessment]