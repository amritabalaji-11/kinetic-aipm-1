from collections import Counter
import datetime
import os
import mediapipe as mp
import cv2
from mediapipe_code.mp_utils.pose.pose_landmarks import LEFT_HIP, LEFT_KNEE, RIGHT_HIP, RIGHT_KNEE
from mediapipe_code.mp_utils.trackers.trend_analyzer import TrendAnalyzer
from mediapipe_code.mp_utils.trackers.rep_counter import RepCounter
from mediapipe_code.mp_utils.trackers.exercise_trackers import (
    PassiveAnkleTracker,
    PassiveBackAngleTracker,
    PassiveDepthTracker,
    PassiveStabilityTracker,
    PassiveTempoTracker,
)
from mediapipe_code.mp_utils.visualization.draw_methods import annotate_frame, extract_worst_frame, overlay_frame
from mediapipe_code.mp_utils.geometry.angle_methods import detect_camera_view
from mediapipe_code.mp_utils.quality.landmark_quality_configuration import (
    LANDMARKS, MEDIAPIPE_MODEL, 
    PRESENCE_THRESHOLD, 
    VISIBILITY_THRESHOLD, FrameAssessment )
from mediapipe_code.mp_utils.quality.landmark_quality_methods import (
    build_composite_from_frames,
    compute_composite_score, 
    compute_frame_reliability, compute_reliability,
    compute_view_metrics, evaluate_quality_gate, extract_frame_landmark_data,
    extract_frames_from_memory,
    format_rep_data,
    get_first_pose,
    get_y,
    resize_video,
    safe_get_landmark, 
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

        self.view_config = {
            "front": {
                "active_landmarks": self.all_landmarks,
                "critical_landmarks": self.critical_landmarks,
            },
            "angled": {
                "active_landmarks": self.all_landmarks,
                "critical_landmarks": self.critical_landmarks,
            },
            "side_left": {
                "active_landmarks": [
                    name for name in self.all_landmarks
                    if name.startswith("LEFT") or name == "NOSE"
                ],
                "critical_landmarks": [
                    name for name in self.critical_landmarks
                    if name.startswith("LEFT")
                ],
            },
            "side_right": {
                "active_landmarks": [
                    name for name in self.all_landmarks
                    if name.startswith("RIGHT") or name == "NOSE"
                ],
                "critical_landmarks": [
                    name for name in self.critical_landmarks
                    if name.startswith("RIGHT")
                ],
            },
        }


    def _create_landmarker(self):
        options = self.PoseLandmarkerOptions(
            base_options=self.base_options(model_asset_path=self.model_path),
            running_mode=self.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.50,
            min_pose_presence_confidence=0.50,
            min_tracking_confidence=0.50,
            output_segmentation_masks=False
        )
        return self.PoseLandmarker.create_from_options(options)
    

    def process_video_once(
        self,
        video_path,
        exercise,
        weight_kg,
        analysis_id,
    ):
        
        """
        Process_video_once is the main method that processes a single video and returns the analysis results.

        Args:
            - video_path: str - the path to the input video file
            - exercise: str - the name of the exercise being performed in the video
            - weight_kg: float - the weight being lifted in the exercise (if applicable)
        
        Returns:
            - final_json: dict - the final JSON result containing session info, reps data, and consolidated trends. None if the video doesn't pass quality gate.
            - quality_result: dict - the result of the quality evaluation, including pass/fail and scores
            - collage_b64: str or None - a base64-encoded string of the annotated collage image, or None if no frames were processed. None if the video doesn't pass quality gate.
            - bottom_frames: List of frames of each rep.
        """
        resized_video_path = resize_video(video_path)

        cap = cv2.VideoCapture(resized_video_path)
        if not cap.isOpened():
            raise ValueError(f"The video could not be opened: {resized_video_path}")

        fps = 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Setup temp annotated video output
        temp_annotated_path = video_path + ".annotated_temp.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        # Since we downsample by skipping every 2nd frame, write at 15.0 FPS
        out_video = cv2.VideoWriter(temp_annotated_path, fourcc, 15.0, (width, height))

        video_name = os.path.splitext(os.path.basename(resized_video_path))[0]

        raw_frames = []
        reps_json_info = []
        annotated_frames = []
        bottom_frames = []

        frame_index = 0
        rep_count = 0

        # Local refs
        append_raw = raw_frames.append
        append_rep = reps_json_info.append
        append_annotated = annotated_frames.append
        append_bottom_frames = bottom_frames.append

        cvt_color = cv2.cvtColor
        read = cap.read
        compute_metrics = compute_view_metrics
        detect_view = detect_camera_view
        compute_rel = compute_frame_reliability
        select_landmarks = select_landmarks_by_view
        safe_landmark = safe_get_landmark
        extract_lm = extract_frame_landmark_data
        mp_image_cls = mp.Image
        mp_srgb = mp.ImageFormat.SRGB

        visibility_threshold = VISIBILITY_THRESHOLD
        presence_threshold = PRESENCE_THRESHOLD
        landmarks_config = self.landmarks
        view_config = self.view_config

        with self._create_landmarker() as landmarker:
            detect_for_video = landmarker.detect_for_video

            rep_counter = RepCounter()
            tempo_tracker = PassiveTempoTracker()
            back_tracker = PassiveBackAngleTracker()
            depth_tracker = PassiveDepthTracker()
            stability_tracker = PassiveStabilityTracker()
            ankle_tracker = PassiveAnkleTracker()

            # -------------------------------------------------
            # VIEW STABILIZATION & SIGNAL SMOOTHING CONFIG
            # -------------------------------------------------
            # View stabilization: We lock the camera view once a dominant view receives 
            # VIEW_LOCK_FRAMES votes. This prevents camera view flapping/jittering 
            # during rapid motions.
            view_votes = {}
            locked_view = None
            VIEW_LOCK_FRAMES = 10

            # Exponential Moving Average (EMA) smoothing for hip angle signal.
            # Reduces noise from high-frequency coordinate fluctuations without introducing 
            # significant phase delay.
            ema_hip = None
            EMA_ALPHA = 0.4

            while True:
                ok, frame_bgr = read()
                if not ok:
                    break

                if frame_index % 2 != 0:
                    frame_index += 1
                    continue

                timestamp_ms = frame_index / fps

                frame_rgb = cvt_color(frame_bgr, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False

                detection_result = detect_for_video(
                    mp_image_cls(
                        image_format=mp_srgb,
                        data=frame_rgb,
                    ),
                    int(timestamp_ms * 1000),
                )

                world_pose, norm_pose = get_first_pose(detection_result)

                # -------------------------------------------------
                # NO POSE
                # -------------------------------------------------
                if world_pose is None or norm_pose is None:
                    append_raw(
                        FrameAssessment(
                            frame_index=frame_index,
                            timestamp_ms=timestamp_ms,
                            camera_view="unknown",
                            passes_critical_gate=False,
                            tracked_landmarks={},
                            expected_landmarks=[],
                            expected_critical_landmarks=[],
                            critical_failures=[
                                f"no_pose_detected_frame_{frame_index}"
                            ],
                        )
                    )

                    annotated = frame_bgr.copy()
                    
                    append_annotated(annotated)
                    if out_video.isOpened():
                        out_video.write(annotated)

                    frame_index += 1
                    continue

                # -------------------------------------------------
                # VIEW
                # -------------------------------------------------
                camera_view = detect_view(norm_pose)

                # View stabilization: During initial frames, compile votes for the observed view.
                # Once VIEW_LOCK_FRAMES is reached, lock the camera_view to the majority vote 
                # to prevent transient errors or side-to-side view swapping.
                """if locked_view is None:
                    view_votes[raw_view] = view_votes.get(raw_view, 0) + 1
                    total_votes = sum(view_votes.values())
                    if total_votes >= VIEW_LOCK_FRAMES:
                        locked_view = max(view_votes, key=view_votes.get)
                    camera_view = raw_view
                else:
                    camera_view = locked_view"""

                active_landmarks, active_critical_landmarks = select_landmarks(
                    camera_view,
                    view_config,
                )

                tracked_landmarks = {}
                critical_failures = []
                passes_critical_gate = True

                # -------------------------------------------------
                # LANDMARKS
                # -------------------------------------------------
                for name in active_landmarks:
                    idx = landmarks_config[name]["id"]

                    world_lm = safe_landmark(world_pose, idx)
                    if world_lm is None:
                        continue

                    norm_lm = safe_landmark(norm_pose, idx)
                    if norm_lm is None:
                        continue

                    tracked_landmarks[name] = extract_lm(world_lm, norm_lm)

                # -------------------------------------------------
                # QUALITY
                # -------------------------------------------------
                for name in active_critical_landmarks:
                    lm = tracked_landmarks.get(name)
                    if lm is None:
                        passes_critical_gate = False
                        critical_failures.append(f"{name}:missing")
                        continue

                    visibility = lm.visibility
                    presence = lm.presence

                    if (
                        visibility < visibility_threshold
                        or presence < presence_threshold
                    ):
                        passes_critical_gate = False
                        critical_failures.append(
                            f"{name}:visibility={visibility:.2f},presence={presence:.2f}"
                        )

                frame_reliability = compute_rel(
                    tracked_landmarks,
                    active_critical_landmarks,
                )

                append_raw(
                    FrameAssessment(
                        frame_index=frame_index,
                        timestamp_ms=timestamp_ms,
                        camera_view=camera_view,
                        passes_critical_gate=passes_critical_gate,
                        tracked_landmarks=tracked_landmarks,
                        expected_landmarks=active_landmarks,
                        expected_critical_landmarks=active_critical_landmarks,
                        frame_reliability=frame_reliability,
                        critical_failures=critical_failures,
                    )
                )

                # -------------------------------------------------
                # BIOMECHANICS
                # -------------------------------------------------
                metrics = compute_metrics(
                    world_pose,
                    camera_view,
                )

                raw_hip_angle = metrics["hip_angle"]
                knee_angle = metrics["knee_angle"]
                back_angle_value = metrics["back_angle"]

                # EMA smoothing for hip angle signal to reduce noise and frame-to-frame jitter.
                # If it's the first frame with a valid hip angle, initialize the filter.
                # Otherwise, calculate the new EMA value using EMA_ALPHA.
                if raw_hip_angle is not None:
                    if ema_hip is None:
                        ema_hip = raw_hip_angle
                    else:
                        ema_hip = EMA_ALPHA * raw_hip_angle + (1 - EMA_ALPHA) * ema_hip
                    hip_angle = ema_hip
                else:
                    hip_angle = raw_hip_angle
                left_knee_valgus = metrics["left_knee_valgus"]
                right_knee_valgus = metrics["right_knee_valgus"]
                dorsiflexion = metrics["dorsiflexion"]

                torso_angle = torso_vertical_angle(world_pose)


                if camera_view == "side_left":
                    hip_y = get_y(norm_pose, LEFT_HIP)
                    knee_y = get_y(norm_pose, LEFT_KNEE)
                elif camera_view == "side_right":
                    hip_y = get_y(norm_pose, RIGHT_HIP)
                    knee_y = get_y(norm_pose, RIGHT_KNEE)
                else:
                    left_hip_y = get_y(norm_pose, LEFT_HIP)
                    right_hip_y = get_y(norm_pose, RIGHT_HIP)
                    left_knee_y = get_y(norm_pose, LEFT_KNEE)
                    right_knee_y = get_y(norm_pose, RIGHT_KNEE)

                    hip_vals = [v for v in (left_hip_y, right_hip_y) if v is not None]
                    knee_vals = [v for v in (left_knee_y, right_knee_y) if v is not None]

                    hip_y = sum(hip_vals) / len(hip_vals) if hip_vals else None
                    knee_y = sum(knee_vals) / len(knee_vals) if knee_vals else None
                    
                # -------------------------------------------------
                # CENTRAL LIFECYCLE EVENT BROADCASTER
                # -------------------------------------------------
                rep_event = None
                rep_completed = False
                if hip_angle is not None:
                    rep_event, rep_count = rep_counter.update(hip_angle)

                is_standing = (rep_counter.state == "STANDING")

                # Update frame-level trackers
                ankle_tracker.update_frame(hip_angle, dorsiflexion, world_pose, is_standing)
                back_tracker.update_frame(back_angle_value, hip_angle, torso_angle, timestamp_ms, is_standing)
                depth_tracker.update_frame(hip_angle, knee_angle, hip_y, knee_y, is_standing)
                stability_tracker.update_frame(norm_pose, is_standing)

                # Broadcast transitional triggers
                if rep_event is not None:
                    if rep_event == "descending_started":
                        ankle_tracker.on_descending(hip_angle, dorsiflexion)
                        back_tracker.on_descending(back_angle_value, hip_angle, timestamp_ms)
                        depth_tracker.on_descending(hip_angle, knee_angle, hip_y, knee_y)
                        stability_tracker.on_descending(norm_pose)
                        tempo_tracker.on_descending(timestamp_ms)
                    elif rep_event == "bottom_reached":
                        tempo_tracker.on_bottom_reached(timestamp_ms)
                    elif rep_event == "ascending_started":
                        tempo_tracker.on_ascending_started(timestamp_ms)
                    elif rep_event == "reset":
                        ankle_tracker.on_reset()
                        back_tracker.on_reset()
                        depth_tracker.on_reset()
                        stability_tracker.on_reset()
                        tempo_tracker.on_reset()
                    elif rep_event == "rep_completed":
                        rep_completed = True

                # -------------------------------------------------
                # BOTTOM FRAMES
                # -------------------------------------------------
                if rep_counter.state != "STANDING":
                    active_rep_number = rep_counter.rep_count + 1
                elif rep_completed:
                    active_rep_number = rep_counter.rep_count
                else:
                    active_rep_number = 0

                if active_rep_number > 0:
                     append_bottom_frames(
                            {"frame_index": frame_index,
                             "frame_bgr": frame_bgr,
                             "camera_view":camera_view,
                             "norm_pose":norm_pose,
                             "width":width,
                             "height":height,
                             "hip_angle": hip_angle,
                             "knee_angle":knee_angle,
                             "rep_number":rep_counter.rep_count}
                        )

                # -------------------------------------------------
                # REP COMPLETED
                # -------------------------------------------------
                if rep_completed:
                    ankle_data = ankle_tracker.on_rep_completed(camera_view)
                    back_data = back_tracker.on_rep_completed(camera_view)
                    depth_data = depth_tracker.on_rep_completed(camera_view)
                    stability_data = stability_tracker.on_rep_completed(camera_view)
                    tempo_data = tempo_tracker.on_rep_completed(timestamp_ms)

                    rep_dict = format_rep_data(
                        rep_count,
                        tempo_data,
                        back_data,
                        depth_data,
                        stability_data,
                        ankle_data,
                        camera_view,
                    )

                    rep_dict["rep_number"] = rep_count
                    rep_dict["camera_view"] = camera_view
                    append_rep(rep_dict)

                # -------------------------------------------------
                # ANNOTATED FRAME FOR COLLAGE
                # -------------------------------------------------
                annotated = annotate_frame(
                    frame_bgr=frame_bgr,
                    camera_view=camera_view,
                    norm_pose=norm_pose,
                    width=width,
                    height=height,
                    hip_angle=hip_angle,
                    knee_angle=knee_angle,
                    back_angle_value=back_angle_value,
                    left_knee_valgus=left_knee_valgus,
                    right_knee_valgus=right_knee_valgus,
                    rep_count=rep_counter.rep_count,
                    tempo_state=rep_counter.state,
                )

                append_annotated(annotated)
                if out_video.isOpened():
                    out_video.write(annotated)

                frame_index += 1

        cap.release()
        cv2.destroyAllWindows()
        if out_video.isOpened():
            out_video.release()

        # -------------------------------------------------
        # QUALITY SCORE
        # -------------------------------------------------
        reliability_by_landmark = compute_reliability(raw_frames)

        expected_landmarks = set()
        for frame in raw_frames:
            expected_landmarks.update(frame.expected_landmarks)

        composite_score = compute_composite_score(
            self.weights,
            reliability_by_landmark,
            expected_landmarks,
        )

        quality_result = evaluate_quality_gate(
            raw_frames,
            composite_score,
            len(reps_json_info),
        )

        quality_result["analysis_id"] = analysis_id

        #quality_result["event"] = "mediapipe_complete"

        #print(quality_result)
        

        if quality_result["event"] != "mediapipe_complete":
            if os.path.exists(temp_annotated_path):
                try:
                    os.remove(temp_annotated_path)
                except:
                    pass
            return None, quality_result, None, None

        # -------------------------------------------------
        # FINAL JSON
        # -------------------------------------------------
        trend_analyzer = TrendAnalyzer()

        if reps_json_info:
            camera_view = Counter(
                rep["camera_view"]
                for rep in reps_json_info
                if rep.get("camera_view") is not None
            ).most_common(1)[0][0]
        else:
            camera_view = "unknown"

        trend_results = trend_analyzer.build_consolidated_summary(
            reps_json_info,
            camera_view,
        )

        final_json = {
            "session": {
                "analysis_id": analysis_id,
                "exercise": exercise,
                "weight_kg": weight_kg,
                "rep_count": len(reps_json_info),
                "camera_view": camera_view,
                "date": str(datetime.date.today()),
            },
            "reps": reps_json_info,
            "consolidated": trend_results,
        }

        # -------------------------------------------------
        # COLLAGE IMAGE
        # -------------------------------------------------
        if annotated_frames:

            frames_base64 = extract_frames_from_memory(annotated_frames)

            collage_b64 = build_composite_from_frames(
                frames_base64,
                cols=4,
            )

        # Clean up temporary resized video file
        if os.path.exists(resized_video_path):
            try:
                os.remove(resized_video_path)
            except Exception as clean_err:
                print(f"Could not remove temporary resized video: {clean_err}")

        return final_json, quality_result, collage_b64, bottom_frames
    
    



if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    # How to use it
    framework = LandmarkQualityFramework(model_path=MEDIAPIPE_MODEL)
    input_dir = "./AB test videos/v1_depth_fault.mp4"
    video_name = os.path.splitext(os.path.basename(input_dir))[0] + "_resized"
    analysis_path = f"./backend/mediapipe_code/results/{video_name}.json"

    final_json, quality_result, collage_b64, rep_frames_list = framework.process_video_once(input_dir, "goblet squat", 20, analysis_id)

    if final_json and os.path.exists(analysis_path):
        try:
            frame, frame_data, dominant_camera_view, rep_data = extract_worst_frame(input_dir, analysis_path, rep_frames_list, final_json)
            annotated_worst_frame = overlay_frame(frame, frame_data, dominant_camera_view, rep_data, output_filename="user_001_side_17.5kg")
        except Exception as e:
            print("Could not extract worst frame:", e)