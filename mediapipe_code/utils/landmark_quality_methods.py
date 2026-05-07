from typing import Any, List, Optional
from utils.landmark_quality_configuration import (
    PRESENCE_THRESHOLD, VISIBILITY_THRESHOLD, FrameLandmarkData)


def landmark_name(name: str) -> str:
    """
    Normalize the landmark name for use as a dictionary key.    
    """
    return name.lower()


def get_first_pose(result: Any):
    """
    Attempt to retrieve the first detected pose, tolerating different attribute names
    depending on the version/configuration.
    """
    world_list = (
        getattr(result, "pose_world_landmarks", None)
        or getattr(result, "world_landmarks", None)
    )
    norm_list = (
        getattr(result, "pose_landmarks", None)
        or getattr(result, "landmarks", None)
    )

    if world_list and norm_list:
        return world_list[0], norm_list[0]

    return None, None


def safe_get_landmark(lm_list: List[Any], idx: int) -> Optional[Any]:
    """
    Returns the landmark by index if it exists; otherwise, it returns None.    
    """
    if lm_list is None:
        return None
    if idx < 0 or idx >= len(lm_list):
        return None
    return lm_list[idx]


def extract_frame_landmark_data(world_lm: Any, norm_lm: Any) -> FrameLandmarkData:
    """
    x/y/z originate from the 3D world landmark.
    Visibility/presence originate from the normalized landmark.   
    """
    return FrameLandmarkData(
        x=float(getattr(world_lm, "x", 0.0) or 0.0),
        y=float(getattr(world_lm, "y", 0.0) or 0.0),
        z=float(getattr(world_lm, "z", 0.0) or 0.0),
        visibility=float(getattr(norm_lm, "visibility", 0.0) or 0.0),
        presence=float(getattr(norm_lm, "presence", 0.0) or 0.0),
    )


def landmark_is_reliable(lm: Any) -> bool:
    """
    True if the landmark exceeds the visibility and presence gate.    
    """
    if lm is None:
        return False

    visibility = float(getattr(lm, "visibility", 0.0) or 0.0)
    presence = float(getattr(lm, "presence", 0.0) or 0.0)

    return visibility >= VISIBILITY_THRESHOLD and presence >= PRESENCE_THRESHOLD