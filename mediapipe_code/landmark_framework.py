from dataclasses import asdict
from typing import Any, Dict, List
import mediapipe as mp
import cv2
from utils.angle_methods import detect_camera_view
from utils.landmark_quality_configuration import (
    ACCEPTABLE_THRESHOLD, CRITICAL_HARD_FLOOR, GOOD_THRESHOLD, LANDMARKS, PRESENCE_THRESHOLD, 
    VISIBILITY_THRESHOLD, FrameAssessment, FrameLandmarkData, 
    VideoAssessment)
from utils.landmark_quality_methods import (
    extract_frame_landmark_data, get_first_pose, safe_get_landmark)


CRITICAL_LANDMARKS = [
    name for name, data in LANDMARKS.items()
    if data["category"] == "critical"
]

IMPORTANT_LANDMARKS = [
    name for name, data in LANDMARKS.items()
    if data["category"] == "important"
]

LEAST_IMPACT_LANDMARKS = [
    name for name, data in LANDMARKS.items()
    if data["category"] == "least_impact"
]

ALL_TRACKED_LANDMARKS = list(LANDMARKS.keys())

WEIGHTS = {
    name: data["weight"]
    for name, data in LANDMARKS.items()
}

class LandmarkQualityFramework:
    def __init__(self, model_path: str):
        self.model_path = model_path

        self.base_options = mp.tasks.BaseOptions
        self.PoseLandmarker = mp.tasks.vision.PoseLandmarker
        self.PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
        self.RunningMode = mp.tasks.vision.RunningMode

        self.landmarks = LANDMARKS
        self.weights = WEIGHTS
        self.all_landmarks = ALL_TRACKED_LANDMARKS
        self.critical_landmarks = CRITICAL_LANDMARKS


    def _create_landmarker(self):
        options = self.PoseLandmarkerOptions(
            base_options=self.base_options(model_asset_path=self.model_path),
            running_mode=self.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.50,
            min_pose_presence_confidence=0.50,
            min_tracking_confidence=0.50,
        )
        return self.PoseLandmarker.create_from_options(options)
    

    def _select_landmarks_by_view(self, camera_view: str):
        """
        Selects which landmarks should be evaluated
        depending on camera orientation.
        """

        # Front or angled:
        # evaluate everything
        if camera_view in ["front", "angled"]:
            return (
                self.all_landmarks,
                self.critical_landmarks
            )

        # Left side view:
        # only LEFT landmarks
        if camera_view == "side_left":

            active_landmarks = [
                name for name in self.all_landmarks
                if name.startswith("LEFT") or name == "NOSE"
            ]

            active_critical = [
                name for name in self.critical_landmarks
                if name.startswith("LEFT")
            ]

            return active_landmarks, active_critical

        # Right side view:
        # only RIGHT landmarks
        if camera_view == "side_right":

            active_landmarks = [
                name for name in self.all_landmarks
                if name.startswith("RIGHT") or name == "NOSE"
            ]

            active_critical = [
                name for name in self.critical_landmarks
                if name.startswith("RIGHT")
            ]

            return active_landmarks, active_critical

        # Fallback
        return [], []


    def analyze_video(self, video_path: str) -> VideoAssessment:
        # Capture video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"The video could not be opened: {video_path}")

        # Get FPS
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = 0
        raw_frames: List[FrameAssessment] = []

        with self._create_landmarker() as landmarker:
            frame_index = 0

            # Start video loop
            while True:
                ok, frame_bgr = cap.read()
                if not ok:
                    break

                # Configuration of image and timestamp
                total_frames += 1
                timestamp_ms = int((frame_index / fps) * 1000)

                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=frame_rgb
                )

                # Process the video with MediaPipe
                result = landmarker.detect_for_video(mp_image, timestamp_ms)
                world_pose, norm_pose = get_first_pose(result)

                # If there is no data, returns a failed frame
                if world_pose is None or norm_pose is None:
                    raw_frames.append(
                        FrameAssessment(
                            frame_index=frame_index,
                            timestamp_ms=timestamp_ms,
                            passes_critical_gate=False,
                            critical_failures=[f"no_pose_detected_frame_{frame_index}"],
                            tracked_landmarks={},
                        )
                    )
                    frame_index += 1
                    continue

                # Detect the camera view
                camera_view = detect_camera_view(
                    norm_pose,
                    world_pose
                )
                

                # Apply the active landmarks by camera view
                active_landmarks, active_critical_landmarks = (
                    self._select_landmarks_by_view(camera_view)
                )

                
                tracked_landmarks: Dict[str, FrameLandmarkData] = {}
                critical_failures: List[str] = []

                # Extract the landmarks of the frame
                for name in active_landmarks:

                    idx = self.landmarks[name]["id"]

                    world_lm = safe_get_landmark(world_pose, idx)
                    norm_lm = safe_get_landmark(norm_pose, idx)

                    if world_lm is None or norm_lm is None:
                        continue

                    tracked_landmarks[name] = extract_frame_landmark_data(
                        world_lm,
                        norm_lm
                    )

                passes_critical_gate = True
                # If there are not a critical landmark or
                # the visibility and presence are bad.
                # Returns a critical failure
                for name in active_critical_landmarks:

                    lm = tracked_landmarks.get(name)

                    if lm is None:
                        passes_critical_gate = False
                        critical_failures.append(f"{name}:missing")
                        continue

                    if (
                        lm.visibility < VISIBILITY_THRESHOLD
                        or lm.presence < PRESENCE_THRESHOLD
                    ):

                        passes_critical_gate = False

                        critical_failures.append(
                            f"{name}:visibility={lm.visibility:.2f},presence={lm.presence:.2f}"
                        )

                raw_frames.append(
                    FrameAssessment(
                        frame_index=frame_index,
                        timestamp_ms=timestamp_ms,
                        passes_critical_gate=passes_critical_gate,
                        critical_failures=critical_failures,
                        tracked_landmarks=tracked_landmarks,
                        camera_view=camera_view,
                        expected_landmarks=active_landmarks,
                        expected_critical_landmarks=active_critical_landmarks
                    )
                )

                frame_index += 1

        cap.release()

        # Layer 1 — Per-Landmark Reliability Rate
        reliability_by_landmark = self._compute_reliability(raw_frames)
        
        # Layer 2 — Weighted Composite Video Score
        composite_score = self._compute_composite_score(
            reliability_by_landmark,
            raw_frames
        )
        
        # Apply a status to the composite score
        status = self._score_status(composite_score)

        # Layer 3 — Hard Floor Rule (Critical Landmarks)
        critical_flags = self._apply_hard_floor(reliability_by_landmark, raw_frames)
        
        
        eligible_frames = self._build_biomechanics_payload(raw_frames)

        return VideoAssessment(
            reliability_by_landmark=reliability_by_landmark,
            composite_score=composite_score,
            status=status,
            critical_flags=critical_flags,
            eligible_frames=eligible_frames,
            all_frames=raw_frames,
        )

    def _compute_reliability(
        self,
        frames: List[FrameAssessment]
    ) -> Dict[str, float]:
        """
        Returns reliability only for landmarks that were actually expected
        according to camera_view / frame configuration.
        """

        counts: Dict[str, int] = {}
        expected_counts: Dict[str, int] = {}

        for frame in frames:
            active_landmarks, _ = self._select_landmarks_by_view(frame.camera_view)

            for name in active_landmarks:
                if name not in counts:
                    counts[name] = 0
                    expected_counts[name] = 0

                expected_counts[name] += 1

                lm = frame.tracked_landmarks.get(name)
                if (
                    lm is not None
                    and lm.visibility >= VISIBILITY_THRESHOLD
                    and lm.presence >= PRESENCE_THRESHOLD
                ):
                    counts[name] += 1

        return {
            name: counts[name] / expected_counts[name]
            for name in expected_counts
            if expected_counts[name] > 0
        }

    def _compute_composite_score(self, 
                                 reliability_by_landmark: Dict[str, float], 
                                 frames: List[FrameAssessment]) -> float:
        """
        For each landmark returns reliability x biomechanical weight
        Output: 0 - 1 (e.g 0.82 = acceptable)
        """
        expected_landmarks = set()

        for frame in frames:
            expected_landmarks.update(frame.expected_landmarks)

        total_weight = 0.0
        weighted_score = 0.0

        for name in expected_landmarks:

            weight = self.weights.get(name, 0.0)
            reliability = reliability_by_landmark.get(name, 0.0)

            weighted_score += weight * reliability
            total_weight += weight

        if total_weight == 0:
            return 0.0

        normalized_score = weighted_score / total_weight

        return round(normalized_score, 4)

    def _apply_hard_floor(
        self,
        reliability_by_landmark: Dict[str, float],
        frames: List[FrameAssessment]
    ) -> List[str]:
        """
        Returns a list of critical occlusions only for landmarks
        that were actually expected by camera view.
        """
        flags = []

        expected_critical = set()
        for frame in frames:
            expected_critical.update(frame.expected_critical_landmarks)

        for name in expected_critical:
            r = reliability_by_landmark.get(name, 0.0)
            if r < CRITICAL_HARD_FLOOR:
                flags.append(
                    f"CRITICAL_OCCLUSION: {name} visible in only {r*100:.0f}% of frames"
                )

        return flags

    def _score_status(self, composite_score: float) -> str:
        if composite_score >= GOOD_THRESHOLD:
            return "GOOD"
        if composite_score >= ACCEPTABLE_THRESHOLD:
            return "ACCEPTABLE"
        return "POOR"

    def _build_biomechanics_payload(self, frames: List[FrameAssessment]) -> List[Dict[str, Any]]:
        payload = []

        for frame in frames:
            # Filters the frames that didn't pass the critical gate
            if not frame.passes_critical_gate:
                continue

            payload.append(
                {
                    "frame_index": frame.frame_index,
                    "timestamp_ms": frame.timestamp_ms,
                    "landmarks": {
                        name: asdict(data)
                        for name, data in frame.tracked_landmarks.items()
                    },
                }
            )

        return payload
    



model_path = "./mediapipe_code/model/pose_landmarker_heavy.task"
video_path = "./mediapipe_code/videos/good_form/goblet_squats_2.mp4"

framework = LandmarkQualityFramework(model_path=model_path)
result = framework.analyze_video(video_path)

print("Composite score:", result.composite_score)
print("Status:", result.status)
print("Critical flags:", result.critical_flags)
print("Eligible frames:", len(result.eligible_frames))