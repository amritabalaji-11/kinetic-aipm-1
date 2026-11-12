"""The picture at the top of the results screen when the before/after video cannot play: your own frame, with one arrow and a short label.

Which issue: the focus rule (the first item under "Work on", decided by the code, so the picture always matches the words). If nothing
needs work, a plain frame is shown. Which rep and which arrow: the rule's `comparison.picture` and `comparison.arrow` in the exercise spec.
Which moment: the key moment of the rep (for a squat, the bottom, the frame with the smallest thigh angle).

Nothing else is drawn: no angles, no numbers, no target lines, no judging captions. Issues about timing (lowering speed, rushing) have
no body part to point at, so their rules have no arrow and get the plain frame.
"""
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

from exercises.registry import get_spec
from mediapipe_code.mp_utils.visualization.draw_methods import _load_font
from services.rep_picking import Reps, anchor_point, focus_rule

SS = 2                          # draw at 2x and shrink, so edges are smooth
AMBER = (255, 150, 0)
WHITE = (255, 255, 255)
OUT_W, OUT_H = 720, 1280
DEFAULT_EXERCISE_ID = "goblet-squat"


def choose_focus(coaching_output, reps, spec):
    """Returns (rule or None, rep dict). Same priority as the text: the first 'work on' item."""
    reps = [r for r in reps if isinstance(r, dict)]
    counted = [r for r in reps if not r.get("partial")] or reps
    if not counted:
        return None, None
    rule, flagged = focus_rule(coaching_output, spec)
    pick = Reps(counted, spec, flagged)
    rep = pick.pick(rule["comparison"]["picture"]) if rule else None
    return rule, rep or pick.pick({"pick": "middle", "pool": "all"})     # nothing to point at: a typical rep from the middle of the set


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


def _annotate(frame_bgr, arrow, label):
    """Draw the arrow and label. `arrow` is {x, y, back}: x and y are 0 to 1 positions in the picture, back is which side the tail comes from."""
    h, w = frame_bgr.shape[:2]
    tip = np.array([arrow["x"] * w * SS, arrow["y"] * h * SS], np.float32)
    back = arrow["back"]
    length = w * SS * 0.22
    tail = tip + np.array([back * length * 0.85, -length * 0.5])
    layer = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    _arrow(d, tuple(tail), tuple(tip), 9 * SS)
    _label(d, tuple(tail), label, w * SS, h * SS)
    layer = layer.resize((w, h), Image.LANCZOS)
    base = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)).convert("RGBA")
    return cv2.cvtColor(np.array(Image.alpha_composite(base, layer).convert("RGB")), cv2.COLOR_RGB2BGR)


def build_focus_picture(video_path, rep_frames, final_json, coaching_output, output_filename, exercise_id=DEFAULT_EXERCISE_ID, goal=None):
    """Returns (image, saved path). Never draws numbers, targets or judging captions."""
    spec = get_spec(exercise_id, goal)
    reps = (final_json or {}).get("reps") or []
    rule, rep = choose_focus(coaching_output, reps, spec)
    if rep is None:
        raise ValueError("no reps to build a picture from")
    frames = [f for f in rep_frames if f.get("rep_number") == rep["rep_number"]] or list(rep_frames)
    if not frames:
        raise ValueError("no frames for the chosen rep")
    field, pick = spec["visuals"]["key_moment"]["frame_field"], spec["visuals"]["key_moment"]["pick"]
    bad = float("inf") if pick == "min" else float("-inf")
    key = lambda f: f[field] if f.get(field) is not None else bad
    chosen = min(frames, key=key) if pick == "min" else max(frames, key=key)

    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, chosen["frame_index"])
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise ValueError("could not read the frame")
    frame = cv2.resize(frame, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)

    view = chosen.get("camera_view") or rep.get("camera_view")
    out = frame
    arrow_spec = rule["comparison"].get("arrow") if rule else None
    arrow = anchor_point(chosen.get("norm_pose"), arrow_spec, view, spec) if arrow_spec else None
    if arrow:
        try:
            out = _annotate(frame, arrow, arrow_spec["label"])
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
    print(f"[focus overlay] rule={rule['id'] if rule else None} rep={rep['rep_number']} view={view}")
    return out, path
