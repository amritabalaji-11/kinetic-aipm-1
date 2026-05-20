import base64
from collections import Counter
import datetime
import json
import os
import time
import uuid
import mediapipe as mp
import cv2
from pathlib import Path
from mediapipe_code.llm_run_code import run_llm
from mediapipe_code.utils.trackers.trend_analyzer import TrendAnalyzer
from mediapipe_code.utils.trackers.ankle_tracker import AnkleTracker
from mediapipe_code.utils.trackers.back_tracker import BackAngleTracker
from mediapipe_code.utils.trackers.depth_tracker import DepthTracker
from mediapipe_code.utils.trackers.rep_counter import RepCounter
from mediapipe_code.utils.trackers.stability_tracker import StabilityTracker
from mediapipe_code.utils.trackers.tempo_tracker import TempoTracker
from mediapipe_code.utils.draw_methods import add_text_lines, annotate_frame, draw_points_and_lines
from mediapipe_code.utils.angle_methods import detect_camera_view
from mediapipe_code.utils.landmark_quality_configuration import (
    LANDMARKS, LEFT_SIDE, LEG_CONNECTIONS, LEG_CONNECTIONS_LEFT_SIDE, LEG_CONNECTIONS_RIGHT_SIDE, LEG_TARGET_LANDMARKS, MEDIAPIPE_MODEL, 
    PRESENCE_THRESHOLD, RIGHT_SIDE, 
    VISIBILITY_THRESHOLD, FrameAssessment )
from mediapipe_code.utils.landmark_quality_methods import (
    build_composite_from_frames,
    compute_composite_score, 
    compute_frame_reliability, compute_reliability,
    compute_view_metrics, evaluate_quality_gate, extract_frame_landmark_data,
    extract_frames_from_memory,
    format_rep_data,
    get_first_pose,
    resize_video,
    safe_get_landmark, 
    select_landmarks_by_view,
    torso_vertical_angle)

BASE_DIR = Path(__file__).resolve().parent

import shutil

FFMPEG_PATH = shutil.which("ffmpeg")

if FFMPEG_PATH is None:
    raise RuntimeError("ffmpeg is not installed. Run: brew install ffmpeg")

#FFMPEG_PATH = BASE_DIR / "ffmpeg" / "ffmpeg.exe"

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
        """
        resized_video_path = resize_video(video_path)

        if not os.path.exists(resized_video_path):
            raise ValueError(f"Resized video not found at path: {resized_video_path}")

        cap = cv2.VideoCapture(resized_video_path)
        if not cap.isOpened():
            raise ValueError(f"The video could not be opened: {resized_video_path}")

        fps = 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        video_name = os.path.splitext(os.path.basename(resized_video_path))[0]

        raw_frames = []
        reps_json_info = []
        frame_cache = []
        annotated_frames = []

        frame_index = 0
        rep_count = 0

        # Local refs
        append_raw = raw_frames.append
        append_rep = reps_json_info.append
        append_cache = frame_cache.append
        append_annotated = annotated_frames.append

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
            tempo_tracker = TempoTracker()
            back_tracker = BackAngleTracker()
            depth_tracker = DepthTracker()
            stability_tracker = StabilityTracker()
            ankle_tracker = AnkleTracker()

            rep_update = rep_counter.update
            tempo_update = tempo_tracker.update
            back_update = back_tracker.update
            depth_update = depth_tracker.update
            stability_update = stability_tracker.update
            ankle_update = ankle_tracker.update

            while True:
                ok, frame_bgr = read()
                if not ok:
                    break

                if frame_index % 3 != 0:
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

                    append_cache({
                        "frame_index": frame_index,
                        "timestamp_ms": timestamp_ms,
                        "has_pose": False,
                    })

                    frame_index += 1
                    continue

                # -------------------------------------------------
                # VIEW
                # -------------------------------------------------
                camera_view = detect_view(norm_pose)

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
                if world_pose is None:
                 continue

                hip_angle = metrics["hip_angle"]
                knee_angle = metrics["knee_angle"]
                back_angle_value = metrics["back_angle"]
                left_knee_valgus = metrics["left_knee_valgus"]
                right_knee_valgus = metrics["right_knee_valgus"]
                dorsiflexion = metrics["dorsiflexion"]

                torso_angle = torso_vertical_angle(world_pose)

                rep_completed = None
                if hip_angle is not None:
                    rep_completed, rep_count = rep_update(
                        hip_angle,
                        knee_angle,
                        camera_view=camera_view,
                    )

                tempo_data = tempo_update(
                    hip_angle,
                    knee_angle,
                    camera_view,
                    timestamp_ms,
                )

                if tempo_data is None:
                    tempo_data = tempo_tracker.current_rep_tempo

                back_data = back_update(
                    back_angle_value,
                    hip_angle,
                    knee_angle,
                    camera_view,
                    timestamp_ms,
                    torso_angle=torso_angle,
                )

                depth_data = depth_update(
                    hip_angle,
                    knee_angle,
                    camera_view,
                )

                stability_data = stability_update(
                    hip_angle,
                    knee_angle,
                    camera_view,
                    norm_pose,
                    timestamp_ms,
                )

                ankle_data = ankle_update(
                    hip_angle,
                    knee_angle,
                    camera_view,
                    dorsiflexion,
                    world_pose,
                )

                # -------------------------------------------------
                # REP COMPLETED
                # -------------------------------------------------
                if rep_completed:
                    rep_dict = format_rep_data(
                        rep_count,
                        tempo_data,
                        back_data,
                        depth_data,
                        stability_data,
                        ankle_data,
                        camera_view,
                    )

                    tempo_tracker.delete_current_rep()

                    if rep_dict["tempo_data"]["total"] > 4:
                        if rep_counter.rep_count > 1:
                            rep_counter.reduce_rep()
                        else:
                            rep_counter.rep_to_zero()
                    else:
                        rep_dict["rep_number"] = rep_count
                        rep_dict["camera_view"] = camera_view
                        append_rep(rep_dict)

                # -------------------------------------------------
                # CACHE
                # -------------------------------------------------
                append_cache({
                    "frame_index": frame_index,
                    "timestamp_ms": timestamp_ms,
                    "has_pose": True,
                    "camera_view": camera_view,
                    "norm_pose": norm_pose,
                    "hip_angle": hip_angle,
                    "knee_angle": knee_angle,
                    "back_angle_value": back_angle_value,
                    "left_knee_valgus": left_knee_valgus,
                    "right_knee_valgus": right_knee_valgus,
                    "rep_count": rep_counter.rep_count,
                    "tempo_state": tempo_tracker.state,
                })

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
                    tempo_state=tempo_tracker.state,
                )

                append_annotated(annotated)

                frame_index += 1

        cap.release()
        cv2.destroyAllWindows()

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
            rep_count,
        )

        quality_result["analysis_id"] = str(uuid.uuid4())

        if quality_result["event"] != "mediapipe_complete":
            return None, quality_result, None

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
                "analysis_id": str(uuid.uuid4()),
                "exercise": exercise,
                "weight_kg": weight_kg,
                "rep_count": rep_count,
                "camera_view": camera_view,
                "date": str(datetime.date.today()),
            },
            "reps": reps_json_info,
            "consolidated": trend_results,
        }

        output_dir = "./mediapipe_code/results"
        os.makedirs(output_dir, exist_ok=True)

        json_filename = os.path.join(output_dir, f"{video_name}.json")
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(
                final_json,
                f,
                indent=4,
                ensure_ascii=False,
            )

        # -------------------------------------------------
        # COLLAGE IMAGE
        # -------------------------------------------------
        if annotated_frames:

            frames_base64 = extract_frames_from_memory(annotated_frames)

            collage_b64 = build_composite_from_frames(
                frames_base64,
                cols=4,
            )

        return final_json, quality_result, collage_b64
    
    def _render_video_from_cache(
        self,
        input_video_path,
        frame_cache,
        output_video_path,
    ):
        cap = cv2.VideoCapture(input_video_path)

        if not cap.isOpened():
            raise ValueError(
                f"The video cannot be open: {input_video_path}"
            )

        fps = 30.0

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        out = cv2.VideoWriter(
            output_video_path,
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height),
        )

        # Local refs
        read = cap.read
        write = out.write

        draw = draw_points_and_lines
        add_text = add_text_lines

        left_side = LEFT_SIDE
        right_side = RIGHT_SIDE

        left_connections = LEG_CONNECTIONS_LEFT_SIDE
        right_connections = LEG_CONNECTIONS_RIGHT_SIDE

        leg_landmarks = LEG_TARGET_LANDMARKS
        leg_connections = LEG_CONNECTIONS

        for data in frame_cache:

            ok, frame = read()

            if not ok:
                break

            if not data["has_pose"]:
                write(frame)
                continue

            camera_view = data["camera_view"]

            annotated = frame

            norm_pose = data["norm_pose"]

            if camera_view == "side_left":

                draw(
                    annotated,
                    norm_pose,
                    width,
                    height,
                    left_side,
                    left_connections,
                    threshold=0.0,
                )

            elif camera_view == "side_right":

                draw(
                    annotated,
                    norm_pose,
                    width,
                    height,
                    right_side,
                    right_connections,
                    threshold=0.0,
                )

            else:

                draw(
                    annotated,
                    norm_pose,
                    width,
                    height,
                    leg_landmarks,
                    leg_connections,
                    threshold=0.0,
                )

            hip_angle = data["hip_angle"]
            knee_angle = data["knee_angle"]
            back_angle = data["back_angle_value"]

            lines = [
                (
                    f"Hip Angle: {hip_angle:.1f}"
                    if hip_angle is not None
                    else "Hip Angle: N/A",
                    (0, 255, 0),
                    1,
                ),
                (
                    f"Knee Angle: {knee_angle:.1f}"
                    if knee_angle is not None
                    else "Knee Angle: N/A",
                    (0, 255, 0),
                    1,
                ),
                (
                    f"Back Angle: {back_angle:.1f}"
                    if back_angle is not None
                    else "Back Angle: N/A",
                    (0, 255, 0),
                    1,
                ),
                (f"Reps: {data['rep_count']}", (0, 0, 255), 1),
                (f"State: {data['tempo_state']}", (255, 0, 0), 1),
                (f"Camera: {camera_view}", (0, 255, 0), 1),
            ]

            left_valgus = data["left_knee_valgus"]

            if left_valgus is not None:
                lines.append(
                    (
                        f"Left Valgus: {left_valgus:.3f}",
                        (0, 255, 0),
                        1,
                    )
                )

            right_valgus = data["right_knee_valgus"]

            if right_valgus is not None:
                lines.append(
                    (
                        f"Right Valgus: {right_valgus:.3f}",
                        (0, 255, 0),
                        1,
                    )
                )

            add_text(
                annotated,
                lines,
                start_x=10,
                start_y=30,
                dy=40,
            )

            write(annotated)

        cap.release()
        out.release()


# How to use it
"""framework = LandmarkQualityFramework(model_path=MEDIAPIPE_MODEL)
input_dir = "./mediapipe_code/videos/good_form/v3_knee_fault.mp4"

start = time.time()
final_json, _, collage_b64 = framework.process_video_once(input_dir, "goblet squat", 20)
response = run_llm(final_json, collage_b64, debug=True)

print(response)
end = time.time() - start
print(end)"""