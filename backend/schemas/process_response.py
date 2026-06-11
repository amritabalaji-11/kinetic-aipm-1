from typing import TypedDict


class ProcessSuccess(TypedDict):

    status: str
    overlay_video_url: str
    biomechanics_json: dict


class ProcessFailure(TypedDict):

    status: str
    error_code: str
    affected_landmarks: list[str]