from dataclasses import asdict
from typing import Any, Dict, List
import mediapipe as mp
import cv2
from utils.rep_counter_landmark import RepCounterLandmark
from utils.angle_methods import detect_camera_view
from utils.landmark_quality_configuration import (
    LANDMARKS, PRESENCE_THRESHOLD, 
    VISIBILITY_THRESHOLD, FrameAssessment, FrameLandmarkData, 
    VideoAssessment)
from utils.landmark_quality_methods import (
    annotate_points_of_max_error, apply_hard_floor, compute_composite_score, 
    compute_frame_reliability, compute_reliability, extract_frame_landmark_data, 
    find_rep, get_first_pose, get_rep_angles, safe_get_landmark, score_status, 
    select_landmarks_by_view, tag_key_positions)


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

            rep_counter = RepCounterLandmark()
            rep_segments = []
            current_rep_start = None

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
                            camera_view="unknown",
                            expected_landmarks=[],
                            expected_critical_landmarks=[],
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
                    select_landmarks_by_view(self.all_landmarks, self.critical_landmarks, camera_view)
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

                # Rep counting only if frame is reliable
                #if passes_critical_gate:
                hip_angle, knee_angle = get_rep_angles(self.landmarks, world_pose, camera_view)

                if hip_angle is not None:
                    rep_started, rep_completed, rep_count, state = rep_counter.update(
                            hip_angle,
                            knee_angle if knee_angle is not None else hip_angle
                        )

                    if rep_started and current_rep_start is None:
                            current_rep_start = frame_index

                        # When a rep ends, the start and end frame are saved
                    if rep_completed and current_rep_start is not None:
                            rep_segments.append((current_rep_start, frame_index))
                            current_rep_start = None


                frame_reliability = compute_frame_reliability(
                    tracked_landmarks,
                    active_critical_landmarks
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
                        expected_critical_landmarks=active_critical_landmarks,
                        frame_reliability=frame_reliability
                    )
                )

                frame_index += 1

        # End of the loop
        cap.release()

        # Layer 1 — Per-Landmark Reliability Rate
        reliability_by_landmark = compute_reliability(self.all_landmarks, self.critical_landmarks, raw_frames)
        
        # Layer 2 — Weighted Composite Video Score
        composite_score = compute_composite_score(
            self.weights,
            reliability_by_landmark,
            raw_frames
        )
        
        # Apply a status to the composite score
        status = score_status(composite_score)

        # Layer 3 — Hard Floor Rule (Critical Landmarks)
        critical_flags = apply_hard_floor(reliability_by_landmark, raw_frames)
        
        # Visibility / quality payload
        eligible_frames = self._build_visibility_payload(raw_frames)
        
        # Biomechanics payload only if status is not POOR
        if status != "POOR":
            # GATE 1: Reliability Gate — per-frame check on critical landmarks
            # Filters frames with visibility and presence greater than 0.70
            """reliability_frames = []
            for frame in raw_frames:
                if frame.passes_critical_gate:
                    reliability_frames.append(frame)"""
            
            print("Rep segments: ",rep_segments)

            # GATE 2: Rep Membership
            # Filter frames that have repetition
            for frame in raw_frames:
                frame.rep_index = find_rep(frame.frame_index, rep_segments)

            frames_with_rep_index = []
            for frame in raw_frames:
                if frame.rep_index:
                    frames_with_rep_index.append(frame)


            # GATE 3: Key Position Tagging — top and bottom position frames per rep
            # Filter the top and bottom position frame of each repetition.
            # Apply a higher threshold.
            tag_key_positions(frames_with_rep_index)

            """key_frames = []
            for frame in frames_with_rep_index:
                if frame.key_frame_reliable:
                    key_frames.append(frame)"""

            # Add Points of max error
            annotate_points_of_max_error(frames_with_rep_index)

            biomechanics_frames = self._build_biomechanics_payload(frames_with_rep_index)
        else:
            biomechanics_frames = []

        return VideoAssessment(
            reliability_by_landmark=reliability_by_landmark,
            composite_score=composite_score,
            status=status,
            critical_flags=critical_flags,
            eligible_frames=eligible_frames,
            biomechanics_frames=biomechanics_frames,
            all_frames=raw_frames,
        )


    def _build_visibility_payload(self, frames: List[FrameAssessment]) -> List[Dict[str, Any]]:
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


    def _build_biomechanics_payload(self, frames: List[FrameAssessment]) -> List[Dict[str, Any]]:
        payload = []

        for frame in frames:
            #if not frame.key_frame_reliable:
               #continue
            if not frame.rep_index or not frame.position_tag:
                continue

            included_names = []
            included_names.extend(frame.expected_critical_landmarks)
            included_names.extend(frame.expected_important_landmarks)

            seen = set()
            included_names = [n for n in included_names if not (n in seen or seen.add(n))]

            world_landmarks = {}
            screen_landmarks = {}

            for name in included_names:
                lm = frame.tracked_landmarks.get(name)
                if lm is None:
                    continue

                world_landmarks[name.lower()] = {
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility,
                    "presence": lm.presence,
                }

                screen_landmarks[name.lower()] = {
                    "x": lm.screen_x,
                    "y": lm.screen_y,
                }

            payload.append(
                {
                    "frame_index": frame.frame_index,
                    "timestamp_ms": frame.timestamp_ms,
                    "rep_index": frame.rep_index,
                    "position_tag": frame.position_tag,
                    "error_flags": frame.error_flags,
                    "error_values": frame.error_values,
                    "frame_reliability": frame.frame_reliability,
                    "world_landmarks": world_landmarks,
                    "screen_landmarks": screen_landmarks,
                }
            )

        return payload



model_path = "./mediapipe_code/model/pose_landmarker_lite.task"
video_path = "./mediapipe_code/videos/good_form/goblet_squats_1.mp4"

framework = LandmarkQualityFramework(model_path=model_path)
result = framework.analyze_video(video_path)

print("Composite score:", result.composite_score)
print("Status:", result.status)
print("Critical flags:", result.critical_flags)
print("Eligible frames:", len(result.eligible_frames))
print("Biomechanics frames count:", len(result.biomechanics_frames))

import os
import json

output_dir = "./mediapipe_code/results_landmark"
os.makedirs(output_dir, exist_ok=True)
video_name = os.path.splitext(os.path.basename(video_path))[0]
json_filename = os.path.join(output_dir, f"{video_name}.json")

with open(json_filename, "w", encoding="utf-8") as f:
    json.dump(result.biomechanics_frames, f, indent=4, ensure_ascii=False)