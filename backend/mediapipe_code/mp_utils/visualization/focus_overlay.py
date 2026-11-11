"""The picture at the top of the results screen: your own frame, with one arrow and a short label.

Which issue: the first item under "Work on" (decided by the code in services/coaching_signals.py), so the picture
always matches the words. If nothing needs work, a plain frame is shown.
Which rep: the rep where that issue is clearest among the reps it applies to.
Which moment: the bottom of that rep (the frame with the most bent knee).

Nothing else is drawn: no angles, no numbers, no target lines, no judging captions. Issues that are about timing
(lowering speed, rushing) have no body part to point at, so they get the plain frame.
Only side views are annotated: from the front, lean and ankle range cannot be seen.
"""
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

from mediapipe_code.mp_utils.visualization.draw_methods import _load_font, get_xy

SS = 2                          # draw at 2x and shrink, so edges are smooth
AMBER = (255, 150, 0)
WHITE = (255, 255, 255)
OUT_W, OUT_H = 720, 1280

# topic -> (label, how to find the point to aim at)
ARROW_TOPICS = {
    "chest_lean": "Torso lean",
    "ankle_mobility": "Ankle mobility",
    "depth": "Depth",
}


def _num(v):
    return v if isinstance(v, (int, float)) else None


def choose_focus(coaching_output, reps):
    """Returns (topic or None, rep dict). Same priority as the text: the first 'work on' item."""
    reps = [r for r in reps if isinstance(r, dict)]
    if not reps:
        return None, None
    items = (coaching_output or {}).get("feedback_items") or {}
    work = items.get("work_on") or []
    topic, flagged = None, []
    if work:
        topic = work[0].get("topic")
        flagged = [int(n) for n in (work[0].get("reps_flagged") or [])]
    elif (coaching_output or {}).get("signals", {}).get("depth_short") or (coaching_output or {}).get("signals", {}).get("depth_very_shallow"):
        topic = "depth"
    pool = [r for r in reps if r.get("rep_number") in flagged] or reps

    def get(r, section, key):
        return _num((r.get(section) or {}).get(key))

    if topic == "chest_lean":
        best = max(pool, key=lambda r: get(r, "back_data", "back_angle_at_bottom") if get(r, "back_data", "back_angle_at_bottom") is not None else -1)
    elif topic == "ankle_mobility":
        best = min(pool, key=lambda r: get(r, "ankle_data", "dorsiflexion_at_bottom") if get(r, "ankle_data", "dorsiflexion_at_bottom") is not None else 1e9)
    elif topic == "depth":
        # the rep where the hips stay highest above the knees
        best = min(pool, key=lambda r: get(r, "depth_data", "hip_below_knee_ratio") if get(r, "depth_data", "hip_below_knee_ratio") is not None else 1e9)
    else:
        best = pool[len(pool) // 2]          # nothing to point at: a typical rep from the middle of the set
    return topic, best


def _arrow(draw, tail, tip, width):
    """White-outlined amber arrow from tail to tip."""
    ang = math.atan2(tip[1] - tail[1], tip[0] - tail[0])
    head = 34 * SS
    base = (tip[0] - head * math.cos(ang), tip[1] - head * math.sin(ang))
    for color, grow in ((WHITE, 5 * SS), (AMBER, 0)):
        w = width + 2 * grow
        draw.line((*tail, *base), fill=color, width=int(w))
        spread = 0.52
        l = (tip[0] - (head + grow) * math.cos(ang - spread), tip[1] - (head + grow) * math.sin(ang - spread))
        r = (tip[0] - (head + grow) * math.cos(ang + spread), tip[1] - (head + grow) * math.sin(ang + spread))
        draw.polygon([tip, l, r], fill=color)


def _label(draw, anchor, text, img_w, img_h):
    font = _load_font(38 * SS)
    tw = draw.textlength(text, font=font)
    pad_x, pad_y = 18 * SS, 11 * SS
    w, h = tw + pad_x * 2, font.size + pad_y * 2
    x = min(max(anchor[0] - w / 2, 8 * SS), img_w - w - 8 * SS)
    y = min(max(anchor[1] - h - 6 * SS, 8 * SS), img_h - h - 8 * SS)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=14 * SS, fill=AMBER + (255,))
    draw.text((x + w / 2, y + h / 2), text, font=font, fill=WHITE, anchor="mm")


def _annotate(frame_bgr, frame_info, camera_view, topic):
    h, w = frame_bgr.shape[:2]
    pose = frame_info["norm_pose"]
    right = camera_view == "side_right"
    ids = {"nose": 0, "sh": 12 if right else 11, "hip": 24 if right else 23, "knee": 26 if right else 25, "ankle": 28 if right else 27}
    P = {k: get_xy(pose, i, w, h) for k, i in ids.items()}
    if any(P[k] is None for k in ("nose", "sh", "hip", "knee", "ankle")):
        return frame_bgr
    P = {k: np.array(v, np.float32) * SS for k, v in P.items()}
    facing_right = P["nose"][0] > P["hip"][0]
    back = -1.0 if facing_right else 1.0          # which side of the picture the person's back is on

    if topic == "chest_lean":
        tip = (P["sh"] + P["hip"]) / 2 + np.array([back * w * SS * 0.07, 0])
    elif topic == "ankle_mobility":
        tip = P["ankle"] + (P["knee"] - P["ankle"]) * 0.35 + np.array([back * w * SS * 0.05, 0])
    else:  # depth
        tip = P["hip"] + np.array([back * w * SS * 0.06, 0])

    length = w * SS * 0.22
    tail = tip + np.array([back * length * 0.85, -length * 0.5])
    layer = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    _arrow(d, tuple(tail), tuple(tip), 9 * SS)
    _label(d, tuple(tail), ARROW_TOPICS[topic], w * SS, h * SS)
    layer = layer.resize((w, h), Image.LANCZOS)
    base = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)).convert("RGBA")
    return cv2.cvtColor(np.array(Image.alpha_composite(base, layer).convert("RGB")), cv2.COLOR_RGB2BGR)


def build_focus_picture(video_path, rep_frames, final_json, coaching_output, output_filename):
    """Returns (image, saved path). Never draws numbers, targets or judging captions."""
    reps = (final_json or {}).get("reps") or []
    topic, rep = choose_focus(coaching_output, reps)
    if rep is None:
        raise ValueError("no reps to build a picture from")
    frames = [f for f in rep_frames if f.get("rep_number") == rep["rep_number"]] or list(rep_frames)
    if not frames:
        raise ValueError("no frames for the chosen rep")
    chosen = min(frames, key=lambda f: f["knee_angle"] if f.get("knee_angle") is not None else float("inf"))

    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, chosen["frame_index"])
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise ValueError("could not read the frame")
    frame = cv2.resize(frame, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)

    view = chosen.get("camera_view") or rep.get("camera_view")
    out = frame
    if topic in ARROW_TOPICS and view in ("side_left", "side_right"):
        try:
            out = _annotate(frame, chosen, view, topic)
        except Exception as e:          # a missing landmark must not cost the user the picture
            print(f"[focus overlay] could not annotate ({e}); using the plain frame")

    os.makedirs("./worst_frames", exist_ok=True)
    path = os.path.join("./worst_frames", f"{output_filename}.jpg")
    quality = 95
    while quality >= 40:
        cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if os.path.getsize(path) <= 500 * 1024:
            break
        quality -= 5
    print(f"[focus overlay] topic={topic} rep={rep['rep_number']} view={view}")
    return out, path
