import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from utils.trackers import (
    RepCounter, TempoTracker,
    BackAngleTracker, KneeValgusTracker
)
from utils.angle_methods import detect_camera_view
from utils.draw_methods import add_text_lines, compute_view_metrics, draw_points_and_lines
import json
import os


model_path = "mediapipe_code/model/pose_landmarker_heavy.task"
video_path = "./mediapipe_code/videos/good_form/goblet_squats_1.mp4"
# Initialize MediaPipe
base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    output_segmentation_masks=True)
detector = vision.PoseLandmarker.create_from_options(options)

# Initialize trackers
rep_counter = RepCounter()
tempo_tracker = TempoTracker()
back_tracker = BackAngleTracker()
valgus_tracker  = KneeValgusTracker()

# Landmark indices
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28

# The important connections for the squats excercise
LEG_CONNECTIONS = frozenset([(11, 12), (11, 23), (12, 24), (23, 25), (24, 26), (25, 27), (26, 28), (23, 24)])

# These are the points from the shoulders to feet
TARGET_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28]

RIGHT_SIDE = [RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE]
LEFT_SIDE = [LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE, LEFT_ANKLE]
LEG_CONNECTIONS_LEFT_SIDE = [(LEFT_SHOULDER, LEFT_HIP), 
                              (LEFT_HIP, LEFT_KNEE),
                              (LEFT_KNEE, LEFT_ANKLE)]
LEG_CONNECTIONS_RIGHT_SIDE = [(RIGHT_SHOULDER, RIGHT_HIP), 
                              (RIGHT_HIP, RIGHT_KNEE),
                              (RIGHT_KNEE, RIGHT_ANKLE)]

# The points of the hip and ankle
#ANGLE_POINTS = {
#    "hip_24": (12, 24),
#    "ankle_28": (26, 28),
#}

def format_rep_data(rep_count, tempo_data, back_data, valgus_data=None):
    data = {
        "rep_number": rep_count,
        "tempo_data": {
            "tempo_notation": tempo_data['tempo_notation'],
            "squat_type": tempo_data['squat_type'],
            "eccentric": tempo_data['eccentric'],
            "pause": tempo_data['pause'],
            "concentric": tempo_data['concentric'],
            "total": tempo_data['total_time']
        },
        "back_data": {
            "max_back_angle": back_data['max_back_angle'],
            "time_warning": back_data['time_warning'],
            "time_excessive": back_data['time_excessive'],
            "status": back_data['status']
        }
    }

    if valgus_data:
        data["valgus_data"] = {
                        "left": {
                            "max_valgus": valgus_data['left']['max_valgus'],
                            "time_warning": valgus_data['left']['time_warning'],
                            "time_excessive": valgus_data['left']['time_excessive'],
                            "status": valgus_data['left']['status']
                        },
                        "right": {
                            "max_valgus": valgus_data['right']['max_valgus'],
                            "time_warning": valgus_data['right']['time_warning'],
                            "time_excessive": valgus_data['right']['time_excessive'],
                            "status": valgus_data['right']['status']
                        }
                    }

    return data

def process_frame(rgb_image, detection_result, frame_timestamp_ms, json_info, threshold=0.0):
    """
    Processes each frame by drawing the points, writing the texts, and calculating the angles.

    rgb_image: The numpy view of each RGB frame.
    detection_results: The pose_landmarks and pose_world_landmarks of each frame.
    frame_timestamp_ms: The real time of the video.
    threshold: It modifies the visualization of points in the image based on their visibility and presence.
    """
    annotated_image = np.copy(rgb_image)

    if not detection_result.pose_landmarks or not detection_result.pose_world_landmarks:
        return annotated_image

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
                TARGET_LANDMARKS,
                LEG_CONNECTIONS,
                threshold=threshold,
            )

        # --- compute only needed metrics ---
        metrics = compute_view_metrics(pose_world, camera_view)

        hip_angle = metrics["hip_angle"]
        knee_angle = metrics["knee_angle"]
        back_angle = metrics["back_angle"]
        left_knee_valgus = metrics["left_knee_valgus"]
        right_knee_valgus = metrics["right_knee_valgus"]

        # --- update trackers only if values exist ---
        rep_completed = None
        tempo_data = None
        back_data = None
        valgus_data = None

        if camera_view == "front":
            rep_completed, rep_count = rep_counter.update(hip_angle, knee_angle)
            tempo_data = tempo_tracker.update(hip_angle, frame_timestamp_ms)
            back_data = back_tracker.update(back_angle, hip_angle, frame_timestamp_ms)
            valgus_data = valgus_tracker.update(
                    left_knee_valgus,
                    right_knee_valgus,
                    hip_angle,
                    frame_timestamp_ms
            )

            if rep_completed:
                rep_dict = format_rep_data(rep_count, tempo_data, back_data, valgus_data)

                rep_dict["rep_number"] = rep_count
                rep_dict["camera_view"] = camera_view

                json_info.append(rep_dict)

        elif camera_view == "angled":    
            rep_completed, rep_count = rep_counter.update(hip_angle, knee_angle)
            tempo_data = tempo_tracker.update(hip_angle, frame_timestamp_ms)
            back_data = back_tracker.update(back_angle, hip_angle, frame_timestamp_ms)

            if rep_completed:
                rep_dict = format_rep_data(rep_count, tempo_data, back_data)

                rep_dict["rep_number"] = rep_count
                rep_dict["camera_view"] = camera_view

                json_info.append(rep_dict)

        elif camera_view == "side_left":
            rep_completed, rep_count = rep_counter.update(hip_angle, knee_angle)
            tempo_data = tempo_tracker.update(hip_angle, frame_timestamp_ms)
            back_data = back_tracker.update(back_angle, hip_angle, frame_timestamp_ms)
            
            if rep_completed:
                rep_dict = format_rep_data(rep_count, tempo_data, back_data)

                rep_dict["rep_number"] = rep_count
                rep_dict["camera_view"] = camera_view

                json_info.append(rep_dict)

        elif camera_view == "side_right":
            rep_completed, rep_count = rep_counter.update(hip_angle, knee_angle)
            tempo_data = tempo_tracker.update(hip_angle, frame_timestamp_ms)
            back_data = back_tracker.update(back_angle, hip_angle, frame_timestamp_ms)

            if rep_completed:
                rep_dict = format_rep_data(rep_count, tempo_data, back_data)

                rep_dict["rep_number"] = rep_count
                rep_dict["camera_view"] = camera_view

                json_info.append(rep_dict)

        # --- text overlay ---
        lines = [
            (f"Hip Angle: {hip_angle:.1f}" if hip_angle is not None else "Hip Angle: N/A", (0, 255, 0), 1),
            (f"Knee Angle: {knee_angle:.1f}" if knee_angle is not None else "Knee Angle: N/A", (0, 255, 0), 1),
            (f"Back Angle: {back_angle:.1f}" if back_angle is not None else "Back Angle: N/A", (0, 255, 0), 1),
            (f"Reps: {rep_counter.rep_count}", (0, 0, 255), 1),
            (f"State: {tempo_tracker.state}", (255, 0, 0), 1),
            (f"Camera view: {camera_view}", (0, 255, 0), 1),
        ]

        if left_knee_valgus is not None:
            lines.append((f"Left Valgus: {left_knee_valgus:.3f}", (0, 255, 0), 1))
        if right_knee_valgus is not None:
            lines.append((f"Right Valgus: {right_knee_valgus:.3f}", (0, 255, 0), 1))

        add_text_lines(annotated_image, lines, start_x=10, start_y=30, dy=40)

    return annotated_image, json_info


video_name = os.path.splitext(os.path.basename(video_path))[0]

# Output configuration for JSONs files
output_dir = "./mediapipe_code/results"
os.makedirs(output_dir, exist_ok=True)
json_filename = os.path.join(output_dir, f"{video_name}.json")

# Output configuration for videos results files
output_video_dir = "./mediapipe_code/video_results"
os.makedirs(output_video_dir, exist_ok=True)
output_video_path = os.path.join(output_video_dir, f"{video_name}_annotated.mp4")

video = cv2.VideoCapture(video_path)

fps = video.get(cv2.CAP_PROP_FPS)
width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*"mp4v")  # codec
out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

json_info = []

frame_index = 0
while video.isOpened():
    ret, frame = video.read()
    if not ret:
        break

    # Frame to RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame_rgb = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

    # Timestamp by frame
    frame_timestamp_ms = frame_index / fps

    pose_detector_result = detector.detect_for_video(
        frame_rgb, int(frame_timestamp_ms * 1000)
    )

    annotated_image, json_info = process_frame(
        frame_rgb.numpy_view(),
        pose_detector_result,
        frame_timestamp_ms,
        json_info
    )

    # Share the image with the results of MediaPipe
    annotated_bgr = cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR)
    out.write(annotated_bgr)

    cv2.imshow("Pose Detection", annotated_image)

    if cv2.waitKey(1) & 0xFF == 27:
        break

    frame_index += 1

video.release()
out.release()

with open(json_filename, "w", encoding="utf-8") as f:
    json.dump(json_info, f, indent=4, ensure_ascii=False)


cv2.destroyAllWindows()