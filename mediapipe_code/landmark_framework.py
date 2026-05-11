from collections import Counter
import json
import os
from typing import Any, Dict, List
import uuid
import mediapipe as mp
import numpy as np
import cv2
from utils.draw_methods import add_text_lines, draw_points_and_lines, draw_torso_vertical_reference
from utils.trackers import AnkleTracker, BackAngleTracker, DepthTracker, RepCounter, StabilityTracker, TempoTracker, TrendAnalyzer
from utils.angle_methods import detect_camera_view
from utils.landmark_quality_configuration import (
    LANDMARKS, LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, PRESENCE_THRESHOLD, RIGHT_SIDE, 
    VISIBILITY_THRESHOLD, FrameAssessment, FrameLandmarkData, )
from utils.landmark_quality_methods import (
    compute_composite_score, 
    compute_frame_reliability, compute_reliability,
    compute_view_metrics, evaluate_quality_gate, extract_frame_landmark_data,
    format_rep_data,
    get_first_pose,
    get_rep_angles, safe_get_landmark, 
    select_landmarks_by_view,
    torso_vertical_angle)


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


    def _draw_and_process_video(
            self, rgb_image, detection_result, rep_counter: RepCounter, 
            tempo_tracker: TempoTracker, back_tracker: BackAngleTracker, 
            depth_tracker: DepthTracker, stability_tracker: StabilityTracker, 
            ankle_tracker: AnkleTracker, json_info, frame_timestamp_ms, threshold=0.0):
        """
        Processes each frame by drawing the points, writing the texts, and calculating the angles.

        rgb_image: The numpy view of each RGB frame.
        detection_results: The pose_landmarks and pose_world_landmarks of each frame.
        frame_timestamp_ms: The real time of the video.
        threshold: It modifies the visualization of points in the image based on their visibility and presence.
        """
        annotated_image = np.copy(rgb_image)

        if not detection_result.pose_landmarks or not detection_result.pose_world_landmarks:
            return annotated_image, rep_counter.rep_count

        h, w, _ = annotated_image.shape

        for pose_landmarks, pose_world in zip(
            detection_result.pose_landmarks,
            detection_result.pose_world_landmarks,
        ):
            camera_view = detect_camera_view(pose_landmarks, pose_world)

            # --- draw only what we need ---
            if camera_view == "side_left":
                draw_points_and_lines(
                    annotated_image,
                    pose_landmarks,
                    w,
                    h,
                    LEFT_SIDE,
                    LEG_CONNECTIONS_LEFT_SIDE,
                    threshold=threshold,
                )

            elif camera_view == "side_right":
                draw_points_and_lines(
                    annotated_image,
                    pose_landmarks,
                    w,
                    h,
                    RIGHT_SIDE,
                    LEG_CONNECTIONS_RIGHT_SIDE,
                    threshold=threshold,
                )

            else:
                draw_points_and_lines(
                    annotated_image,
                    pose_landmarks,
                    w,
                    h,
                    LEG_TARGET_LANDMARKS,
                    LEG_CONNECTIONS,
                    threshold=threshold,
                )


            metrics = compute_view_metrics(pose_world, camera_view)
            hip_angle = metrics["hip_angle"]
            knee_angle = metrics["knee_angle"]
            back_angle_value = metrics["back_angle"]
            left_knee_valgus = metrics["left_knee_valgus"]
            right_knee_valgus = metrics["right_knee_valgus"]
            dorsiflexion = metrics["dorsiflexion"]

             # --- update trackers only if values exist ---
            rep_completed = None
            tempo_data = None
            back_data = None
            stability_data = None

            torso_angle_from_vertical = torso_vertical_angle(pose_world)

            if hip_angle is not None:
                    rep_completed, rep_count = rep_counter.update(
                            hip_angle,
                            knee_angle,
                            camera_view=camera_view
                        )
            tempo_data = tempo_tracker.update(hip_angle, knee_angle, camera_view, frame_timestamp_ms)
            back_data = back_tracker.update(
                back_angle_value,
                hip_angle,
                knee_angle,
                camera_view,
                frame_timestamp_ms,
                torso_angle=torso_angle_from_vertical
            )
            depth_data = depth_tracker.update(
                hip_angle=hip_angle,
                knee_angle=knee_angle,
                camera_view=camera_view,
                timestamp=frame_timestamp_ms,
            )
            stability_data = stability_tracker.update(
                hip_angle=hip_angle,
                knee_angle=knee_angle,
                camera_view=camera_view,
                pose_landmarks=pose_landmarks,
                timestamp=frame_timestamp_ms,
            )
            ankle_data = ankle_tracker.update(
                hip_angle=hip_angle,
                knee_angle=knee_angle,
                camera_view=camera_view,
                dorsiflexion=dorsiflexion,
                pose_world=pose_world,
                timestamp=frame_timestamp_ms,
            )

            if rep_completed:
                rep_dict = format_rep_data(
                    rep_count, tempo_data, 
                    back_data, depth_data, stability_data, ankle_data, camera_view)

                rep_dict["rep_number"] = rep_count
                rep_dict["camera_view"] = camera_view

                json_info.append(rep_dict)

            # --- text overlay ---
            lines = [
                (f"Hip Angle: {hip_angle:.1f}" if hip_angle is not None else "Hip Angle: N/A", (0, 255, 0), 1),
                (f"Knee Angle: {knee_angle:.1f}" if knee_angle is not None else "Knee Angle: N/A", (0, 255, 0), 1),
                (f"Back Angle: {back_angle_value:.1f}" if back_angle_value is not None else "Back Angle: N/A", (0, 255, 0), 1),
                (f"Reps: {rep_counter.rep_count}", (0, 0, 255), 1),
                (f"State: {tempo_tracker.state}", (255, 0, 0), 1),
                (f"Camera view: {camera_view}", (0, 255, 0), 1),
            ]

            if left_knee_valgus is not None:
                lines.append((f"Left Valgus: {left_knee_valgus:.3f}", (0, 255, 0), 1))
            if right_knee_valgus is not None:
                lines.append((f"Right Valgus: {right_knee_valgus:.3f}", (0, 255, 0), 1))

            add_text_lines(annotated_image, lines, start_x=10, start_y=30, dy=40)

        
        return annotated_image, rep_counter.rep_count


    def _analyze_video(self, video_path: str):
        # Capture video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"The video could not be opened: {video_path}")

        # Get FPS
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = 0
        raw_frames: List[FrameAssessment] = []
        rep_count = 0

        with self._create_landmarker() as landmarker:
            frame_index = 0

            rep_counter = RepCounter()

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
                    _, rep_count = rep_counter.update(
                            hip_angle,
                            knee_angle,
                            camera_view=camera_view
                        )

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

        return raw_frames, rep_count
    

    def get_quality_result(self, video_path):
        raw_frames, rep_count = self._analyze_video(video_path)

        # Layer 1 — Per-Landmark Reliability Rate
        reliability_by_landmark = compute_reliability(self.all_landmarks, self.critical_landmarks, raw_frames)
            
        # Layer 2 — Weighted Composite Video Score
        composite_score = compute_composite_score(
            self.weights,
            reliability_by_landmark,
            raw_frames
        )
    
        quality_result = evaluate_quality_gate(raw_frames, composite_score, rep_count)
        quality_result_id = uuid.uuid4()

        quality_result["analysis_id"] = quality_result_id

        return quality_result


    def get_biomechanics_output(self, video_path, exercise, weight_kg):

        video = cv2.VideoCapture(video_path)

        fps = video.get(cv2.CAP_PROP_FPS)
        width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frame_index = 0
        reps_json_info = []

        # =========================================
        # Output video configuration
        # =========================================
        video_name = os.path.splitext(os.path.basename(video_path))[0]

        output_video_dir = "./mediapipe_code/video_results"
        os.makedirs(output_video_dir, exist_ok=True)

        output_video_path = os.path.join(
            output_video_dir,
            f"{video_name}_processed.mp4"
        )

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        out = cv2.VideoWriter(
            output_video_path,
            fourcc,
            fps,
            (width, height)
        )

        with self._create_landmarker() as detector:

            rep_counter = RepCounter()
            tempo_tracker = TempoTracker()
            back_tracker = BackAngleTracker()
            depth_tracker = DepthTracker()
            stability_tracker = StabilityTracker()
            ankle_tracker = AnkleTracker()

            while video.isOpened():

                ret, frame = video.read()

                if not ret:
                    break

                # Frame to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                frame_rgb = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=frame_rgb
                )

                # Timestamp by frame
                frame_timestamp_ms = frame_index / fps

                pose_detector_result = detector.detect_for_video(
                    frame_rgb,
                    int(frame_timestamp_ms * 1000)
                )

                annotated_image, rep_count = self._draw_and_process_video(
                    frame_rgb.numpy_view(),
                    pose_detector_result,
                    rep_counter,
                    tempo_tracker,
                    back_tracker,
                    depth_tracker,
                    stability_tracker,
                    ankle_tracker,
                    reps_json_info,
                    frame_timestamp_ms
                )

                # =========================================
                # Convert RGB -> BGR before saving
                # =========================================
                annotated_bgr = cv2.cvtColor(
                    annotated_image,
                    cv2.COLOR_RGB2BGR
                )

                out.write(annotated_bgr)

                cv2.imshow("Pose Detection", annotated_image)

                if cv2.waitKey(1) & 0xFF == 27:
                    break

                frame_index += 1

            video.release()
            out.release()

        cv2.destroyAllWindows()

        trend_analyzer = TrendAnalyzer()

        camera_view = Counter(
            rep["camera_view"]
            for rep in reps_json_info
            if rep.get("camera_view") is not None
        ).most_common(1)[0][0]

        trend_results = trend_analyzer.build_consolidated_summary(
            reps_json_info,
            camera_view
        )

        json_final = {
            "session": {
                "analysis_id": str(uuid.uuid4()),
                "exercise": exercise,
                "weight_kg": weight_kg,
                "rep_count": rep_count,
                "camera_view": camera_view
            },
            "reps": reps_json_info,
            "consolidated": trend_results
        }

        # =========================================
        # Output JSON configuration
        # =========================================
        output_dir = "./mediapipe_code/results"

        os.makedirs(output_dir, exist_ok=True)

        json_filename = os.path.join(
            output_dir,
            f"{video_name}.json"
        )

        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(json_final, f, indent=4, ensure_ascii=False)

        return json_final

model_path = "./mediapipe_code/model/pose_landmarker_heavy.task"
framework = LandmarkQualityFramework(model_path=model_path)

input_dir = "./mediapipe_code/videos/good_form/"
# You can use this for process videos individualy
#framework.get_biomechanics_output(input_dir, "Goblet Squat", 20)
for filename in os.listdir(input_dir):
    result = framework.get_quality_result(input_dir + filename)
    if result["event"] == "mediapipe_complete":
        try:
            framework.get_biomechanics_output(input_dir + filename, "Goblet Squat", 20)
        except Exception as e:
            print("==================================================")
            print(f"problema en el archivo {filename}")
            print(e)
            print("==================================================")
            continue
