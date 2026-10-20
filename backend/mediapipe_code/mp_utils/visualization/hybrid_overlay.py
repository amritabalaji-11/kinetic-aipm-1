"""
Hybrid overlay: the picture shows only the one or two worst problems.

For each problem: a shaded arc at the joint, the angle as a number, the limbs in red, and a dashed
green "aim here" line. Everything else stays muted grey. A plain-language caption sits along the
bottom. Full details and cues stay in the app.

Same signature as overlay_frame() in draw_methods.py, so the pipeline can switch with one import.
"""
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

from mediapipe_code.mp_utils.pose.pose_landmarks import (
    LEFT_ANKLE, LEFT_HIP, LEFT_KNEE, LEFT_SHOULDER,
    RIGHT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_SHOULDER,
)
from mediapipe_code.mp_utils.visualization.draw_methods import _load_font, get_xy

SS = 2  # draw at 2x and shrink, so lines and arcs are smooth

RED = (235, 64, 52)
RED_SOFT = (255, 125, 115)
GREEN = (46, 204, 113)
GREY = (190, 190, 190)
WHITE = (255, 255, 255)

# Targets match the thresholds used by the analysis
DEPTH_TARGET, BACK_TARGET, ANKLE_TARGET = 90, 28, 30

PLAIN = {
    "depth": "Not squatting deep enough",
    "back": "Chest leaning too far forward",
    "ankle": "Limited ankle mobility",
    "knees": "Knees drifting inward",
}
GOOD_CAPTION = "Solid rep: depth, back and ankles are in range"


# ---------------------------------------------------------------- geometry helpers
def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def _unit(v):
    n = math.hypot(*v) or 1.0
    return (v[0] / n, v[1] / n)


def _rot(v, deg):
    r = math.radians(deg)
    return (v[0] * math.cos(r) - v[1] * math.sin(r), v[0] * math.sin(r) + v[1] * math.cos(r))


def _angle_between(u, v):
    dot = max(-1.0, min(1.0, u[0] * v[0] + u[1] * v[1]))
    return math.degrees(math.acos(dot))


def _cross(u, v):
    return u[0] * v[1] - u[1] * v[0]


def _fail(status):
    return str(status or "").strip().lower() not in ("good", "excellent")


# ---------------------------------------------------------------- what is wrong, worst first
def _find_issues(rep_data, camera_view):
    issues = []
    ankle, depth, back = rep_data.get("ankle_data", {}), rep_data.get("depth_data", {}), rep_data.get("back_data", {})

    d = depth.get("knee_angle_at_bottom")
    if d is not None and depth.get("depth_classification") and _fail(depth.get("depth_classification")):
        issues.append({"key": "depth", "value": d, "aim": f"aim ≤ {DEPTH_TARGET}°", "sev": max(0.1, (d - DEPTH_TARGET) / DEPTH_TARGET)})

    b = back.get("back_angle_at_bottom")
    if b is not None and back.get("back_label") and _fail(back.get("back_label")):
        issues.append({"key": "back", "value": b, "aim": f"aim ≤ {BACK_TARGET}°", "sev": max(0.1, (b - BACK_TARGET) / BACK_TARGET)})

    a = ankle.get("dorsiflexion_at_bottom")
    if a is not None and ankle.get("dorsiflexion_status") and _fail(ankle.get("dorsiflexion_status")):
        issues.append({"key": "ankle", "value": a, "aim": f"aim ≥ {ANKLE_TARGET}°", "sev": max(0.1, (ANKLE_TARGET - a) / ANKLE_TARGET)})

    if camera_view in ("front", "angled"):
        stab = rep_data.get("stability_data", {})
        sev_word = str(stab.get("valgus_severity") or "none").lower()
        if not stab.get("valgus_flag", True) and sev_word != "none":
            issues.append({"key": "knees", "value": sev_word.title(), "aim": "knee tracking",
                           "sev": {"mild": 0.3, "moderate": 0.6, "severe": 1.0}.get(sev_word, 0.3)})

    issues.sort(key=lambda i: -i["sev"])
    return issues[:2]


# ---------------------------------------------------------------- drawing helpers (on the 2x layer)
def _dashed(d, p, q, fill, width, dash=16, gap=12):
    length = math.hypot(q[0] - p[0], q[1] - p[1])
    if length < 1:
        return
    ux, uy = (q[0] - p[0]) / length, (q[1] - p[1]) / length
    t = 0.0
    while t < length:
        t2 = min(t + dash, length)
        d.line((p[0] + ux * t, p[1] + uy * t, p[0] + ux * t2, p[1] + uy * t2), fill=fill, width=width)
        t += dash + gap


def _arc(d, vertex, u, v, radius, color):
    """Shaded wedge + outline between directions u and v at the vertex."""
    a1 = math.degrees(math.atan2(u[1], u[0]))
    a2 = math.degrees(math.atan2(v[1], v[0]))
    diff = (a2 - a1 + 180) % 360 - 180
    start, end = (a1, a1 + diff) if diff >= 0 else (a1 + diff, a1)
    box = (vertex[0] - radius, vertex[1] - radius, vertex[0] + radius, vertex[1] + radius)
    d.pieslice(box, start, end, fill=color + (95,))
    d.arc(box, start, end, fill=color + (255,), width=5 * SS)
    bis = _unit((u[0] + v[0], u[1] + v[1]))
    return bis


def _pill(d, center, line1, line2, f1, f2, img_w, img_h, color1=RED_SOFT, color2=GREEN):
    w1 = d.textlength(line1, font=f1)
    w2 = d.textlength(line2, font=f2) if line2 else 0
    pad = 14 * SS
    w = max(w1, w2) + pad * 2
    h = (f1.size + (f2.size + 4 * SS if line2 else 0)) + pad * 1.6
    x = min(max(center[0] - w / 2, 8 * SS), img_w - w - 8 * SS)
    y = min(max(center[1] - h / 2, 8 * SS), img_h - h - 8 * SS)
    d.rounded_rectangle((x, y, x + w, y + h), radius=16 * SS, fill=(0, 0, 0, 185))
    d.text((x + w / 2, y + pad * 0.8), line1, font=f1, fill=color1, anchor="mt")
    if line2:
        d.text((x + w / 2, y + pad * 0.8 + f1.size + 4 * SS), line2, font=f2, fill=color2, anchor="mt")


def _caption(layer, issues, img_w, img_h):
    d = ImageDraw.Draw(layer)
    bar_h = 170 * SS
    # soft dark fade so the text stays readable on any background
    for i in range(bar_h):
        a = int(215 * (i / bar_h) ** 0.8)
        d.line((0, img_h - bar_h + i, img_w, img_h - bar_h + i), fill=(0, 0, 0, a))

    if issues:
        main = PLAIN[issues[0]["key"]]
        extra = f"Also: {PLAIN[issues[1]['key']].lower()}" if len(issues) > 1 else None
        accent = RED
    else:
        main, extra, accent = GOOD_CAPTION, None, GREEN

    margin = 34 * SS
    size = 46 * SS
    while size > 26 * SS:
        f = _load_font(size)
        if d.textlength(main, font=f) <= img_w - margin * 2 - 22 * SS:
            break
        size -= 2 * SS
    y = img_h - (86 if extra else 66) * SS
    d.rounded_rectangle((margin, y - 4 * SS, margin + 8 * SS, y + (size if not extra else size + 4 * SS)), radius=4 * SS, fill=accent + (255,))
    d.text((margin + 24 * SS, y - 6 * SS), main, font=f, fill=WHITE)
    if extra:
        d.text((margin + 24 * SS, y + size + 2 * SS), extra, font=_load_font(30 * SS), fill=(215, 215, 215))



def _arrow(d, start, end, color, width):
    d.line((*start, *end), fill=color, width=width)
    ang = math.atan2(end[1] - start[1], end[0] - start[0])
    head = 22 * SS
    left = (end[0] - head * math.cos(ang - 0.45), end[1] - head * math.sin(ang - 0.45))
    right = (end[0] - head * math.cos(ang + 0.45), end[1] - head * math.sin(ang + 0.45))
    d.polygon([end, left, right], fill=color)


def _draw_front(d, frame_info, w, h, issues, f_big, f_small, W, H):
    """
    Seen from the front, back lean / depth / ankle angles are not visible (they happen front-to-back),
    so the picture shows the legs and only the knee-tracking problem. Other problems go in the caption.
    """
    g = lambda i: get_xy(frame_info["norm_pose"], i, w, h)
    P = {n: g(i) for n, i in dict(ls=LEFT_SHOULDER, rs=RIGHT_SHOULDER, lh=LEFT_HIP, rh=RIGHT_HIP,
                                  lk=LEFT_KNEE, rk=RIGHT_KNEE, la=LEFT_ANKLE, ra=RIGHT_ANKLE).items()}
    P = {n: (p[0] * SS, p[1] * SS) for n, p in P.items() if p is not None}
    color = GREEN if not issues else GREY
    for a, b in (("ls", "rs"), ("lh", "rh"), ("ls", "lh"), ("rs", "rh"), ("lh", "lk"), ("lk", "la"), ("rh", "rk"), ("rk", "ra")):
        if a in P and b in P:
            d.line((*P[a], *P[b]), fill=color + (210,), width=7 * SS)
    for p in P.values():
        d.ellipse((p[0] - 9 * SS, p[1] - 9 * SS, p[0] + 9 * SS, p[1] + 9 * SS), fill=color + (230,))

    knee_issue = next((i for i in issues if i["key"] == "knees"), None)
    if not knee_issue or "lk" not in P or "rk" not in P:
        return
    mid_x = (P["lk"][0] + P["rk"][0]) / 2
    for hip, knee, ank in (("lh", "lk", "la"), ("rh", "rk", "ra")):
        if hip in P and ank in P:
            d.line((*P[hip], *P[knee]), fill=RED + (255,), width=12 * SS)
            d.line((*P[knee], *P[ank]), fill=RED + (255,), width=12 * SS)
        k = P[knee]
        d.ellipse((k[0] - 30 * SS, k[1] - 30 * SS, k[0] + 30 * SS, k[1] + 30 * SS), outline=RED + (255,), width=6 * SS)
        inward = 1 if k[0] < mid_x else -1
        _arrow(d, (k[0] - inward * 45 * SS, k[1]), (k[0] - inward * 100 * SS, k[1]), GREEN + (255,), 8 * SS)  # the way to push
    top = min(P["lk"][1], P["rk"][1]) - 130 * SS
    _pill(d, (mid_x, top), str(knee_issue["value"]), "push knees out", f_big, f_small, W, H)

# ---------------------------------------------------------------- main entry
def overlay_frame_hybrid(frame, frame_info, camera_view, rep_data, output_filename):
    h, w = frame.shape[:2]
    W, H = w * SS, h * SS
    issues = _find_issues(rep_data, camera_view)

    use_right = camera_view == "side_right"
    ids = (RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE) if use_right else (LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE, LEFT_ANKLE)
    pts = [get_xy(frame_info["norm_pose"], i, w, h) for i in ids]

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    report = {"issues": [i["key"] for i in issues], "measured": {}}

    f_big0, f_small0 = _load_font(46 * SS), _load_font(28 * SS)
    if camera_view == "front":
        _draw_front(d, frame_info, w, h, issues, f_big0, f_small0, W, H)
    elif all(p is not None for p in pts):
        S, Hp, K, A = [(p[0] * SS, p[1] * SS) for p in pts]
        up = (0.0, -1.0)
        flagged = {i["key"] for i in issues}
        base_color = GREEN if not issues else GREY

        # muted skeleton
        for p, q in ((S, Hp), (Hp, K), (K, A)):
            d.line((*p, *q), fill=base_color + (210,), width=7 * SS)
        for p in (S, Hp, K, A):
            d.ellipse((p[0] - 9 * SS, p[1] - 9 * SS, p[0] + 9 * SS, p[1] + 9 * SS), fill=base_color + (230,))

        f_big, f_small = _load_font(46 * SS), _load_font(28 * SS)

        def highlight(a, b):  # limbs of a problem in red
            d.line((*a, *b), fill=RED + (255,), width=12 * SS)

        def joint(p):
            d.ellipse((p[0] - 17 * SS, p[1] - 17 * SS, p[0] + 17 * SS, p[1] + 17 * SS), fill=RED + (255,), outline=WHITE + (255,), width=3 * SS)

        for issue in issues:
            k = issue["key"]
            if k == "depth":  # knee angle: thigh vs shin
                u, v = _unit(_sub(Hp, K)), _unit(_sub(A, K))
                report["measured"]["depth_knee_angle_from_frame"] = round(_angle_between(u, v))
                thigh_len = math.hypot(*_sub(Hp, K))
                aim_dir = _rot(v, 90 if _cross(v, _sub(Hp, K)) > 0 else -90)
                aim_pt = (K[0] + aim_dir[0] * thigh_len, K[1] + aim_dir[1] * thigh_len)
                _dashed(d, K, aim_pt, GREEN + (255,), 6 * SS)
                d.ellipse((aim_pt[0] - 9 * SS, aim_pt[1] - 9 * SS, aim_pt[0] + 9 * SS, aim_pt[1] + 9 * SS), fill=GREEN + (255,))
                highlight(Hp, K); highlight(K, A)
                bis = _arc(d, K, u, v, 70 * SS, RED)
                joint(K)
                anchor, vertex = (K[0] + bis[0] * 150 * SS, K[1] + bis[1] * 150 * SS), K
            elif k == "back":  # torso lean vs vertical, at the hip
                u, v = up, _unit(_sub(S, Hp))
                report["measured"]["back_lean_from_frame"] = round(_angle_between(u, v))
                torso_len = math.hypot(*_sub(S, Hp))
                aim_dir = _rot(up, BACK_TARGET if _cross(up, v) > 0 else -BACK_TARGET)
                aim_pt = (Hp[0] + aim_dir[0] * torso_len, Hp[1] + aim_dir[1] * torso_len)
                _dashed(d, Hp, (Hp[0], Hp[1] - torso_len * 0.9), WHITE + (170,), 3 * SS)
                _dashed(d, Hp, aim_pt, GREEN + (255,), 6 * SS)
                d.ellipse((aim_pt[0] - 9 * SS, aim_pt[1] - 9 * SS, aim_pt[0] + 9 * SS, aim_pt[1] + 9 * SS), fill=GREEN + (255,))
                highlight(Hp, S)
                bis = _arc(d, Hp, u, v, 90 * SS, RED)
                joint(Hp)
                anchor, vertex = (Hp[0] + bis[0] * 170 * SS, Hp[1] + bis[1] * 170 * SS), Hp
            elif k == "ankle":  # shin angle vs vertical, at the ankle
                u, v = up, _unit(_sub(K, A))
                report["measured"]["ankle_shin_angle_from_frame"] = round(_angle_between(u, v))
                shin_len = math.hypot(*_sub(K, A))
                aim_dir = _rot(up, ANKLE_TARGET if _cross(up, v) > 0 else -ANKLE_TARGET)
                aim_pt = (A[0] + aim_dir[0] * shin_len, A[1] + aim_dir[1] * shin_len)
                _dashed(d, A, (A[0], A[1] - shin_len * 0.9), WHITE + (170,), 3 * SS)
                _dashed(d, A, aim_pt, GREEN + (255,), 6 * SS)
                d.ellipse((aim_pt[0] - 9 * SS, aim_pt[1] - 9 * SS, aim_pt[0] + 9 * SS, aim_pt[1] + 9 * SS), fill=GREEN + (255,))
                highlight(A, K)
                bis = _arc(d, A, u, v, 80 * SS, RED)
                joint(A)
                anchor, vertex = (A[0] + bis[0] * 160 * SS, A[1] + bis[1] * 160 * SS), A
            else:  # knees: ring both knees
                lk = get_xy(frame_info["norm_pose"], LEFT_KNEE, w, h)
                rk = get_xy(frame_info["norm_pose"], RIGHT_KNEE, w, h)
                for kp in (lk, rk):
                    if kp:
                        c = (kp[0] * SS, kp[1] * SS)
                        d.ellipse((c[0] - 34 * SS, c[1] - 34 * SS, c[0] + 34 * SS, c[1] + 34 * SS), outline=RED + (255,), width=6 * SS)
                base_pt = rk or lk
                anchor = ((base_pt[0] + 40) * SS, (base_pt[1] - 70) * SS) if base_pt else (W / 2, H / 2)
                vertex = anchor

            value = issue["value"]
            line1 = value if isinstance(value, str) else f"{math.floor(value)}°"
            _pill(d, anchor, line1, issue["aim"], f_big, f_small, W, H)

    _caption(layer, issues, W, H)

    base = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
    layer = layer.resize((w, h), Image.LANCZOS)
    out = cv2.cvtColor(np.array(Image.alpha_composite(base, layer).convert("RGB")), cv2.COLOR_RGB2BGR)

    output_dir = "./worst_frames"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{output_filename}.jpg")
    quality = 95
    while quality >= 40:
        cv2.imwrite(output_path, out, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if os.path.getsize(output_path) <= 500 * 1024:
            break
        quality -= 5

    print(f"[hybrid overlay] {report}")
    return out, output_path
