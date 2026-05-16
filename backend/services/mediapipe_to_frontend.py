"""
Map MediaPipe / LandmarkQualityFramework output to the JSON shape the frontend expects.
"""

from __future__ import annotations

from typing import Any, Dict, List


_BACK_STATUS_POSTURE = {"GOOD": 88, "ACCEPTABLE": 78, "WARNING": 62}
_DEPTH_MOVEMENT = {"deep": 88, "parallel": 80, "insufficient": 58}


def _clamp_score(v: float) -> int:
    return max(0, min(100, int(round(v))))


def _humanize_exercise_id(exercise_id: str) -> str:
    slug = (exercise_id or "").strip() or "general-squat"
    return slug.replace("-", " ").title()


def _rep_parameter_scores(rep: Dict[str, Any]) -> Dict[str, float]:
    depth_data = rep.get("depth_data") or {}
    back_data = rep.get("back_data") or {}
    stab = rep.get("stability_data") or {}
    tempo = rep.get("tempo_data") or {}

    posture = float(_BACK_STATUS_POSTURE.get(back_data.get("status"), 72))
    movement_quality = float(_DEPTH_MOVEMENT.get(depth_data.get("depth_classification"), 72))

    if stab:
        stability = 86.0 if not stab.get("valgus_flag") else 68.0
    else:
        stability = 78.0

    total = tempo.get("total")
    try:
        total_f = float(total) if total is not None else 3.0
    except (TypeError, ValueError):
        total_f = 3.0
    if 2.0 <= total_f <= 5.0:
        tempo_score = 82.0
    elif total_f < 1.5:
        tempo_score = 68.0
    else:
        tempo_score = 74.0

    return {
        "posture": posture,
        "movement_quality": movement_quality,
        "stability": stability,
        "velocity": tempo_score,
    }


def _rep_form_score(parts: Dict[str, float]) -> int:
    return _clamp_score(sum(parts.values()) / max(len(parts), 1))


def map_quality_gate_error(
    *,
    analysis_id: str,
    session_id: str,
    user_id: str,
    exercise_id: str,
    weight_value: float,
    weight_unit: str,
    raw: Dict[str, Any],
) -> Dict[str, Any]:
    msg = raw.get("message") or "We couldn't analyze this video."
    detail = raw.get("detail") or msg
    neutral = _clamp_score(55)
    neutral_params = {
        "posture": {"score": neutral, "correction": msg},
        "stability": {"score": neutral, "correction": msg},
        "movement_quality": {"score": neutral, "correction": msg},
        "velocity": {"score": neutral, "correction": msg},
    }
    return {
        "analysis_id": analysis_id,
        "session_id": session_id,
        "user_id": user_id,
        "exercise_id": exercise_id,
        "weight_value": weight_value,
        "weight_unit": weight_unit,
        "status": "failed",
        "summary": {
            "overall_form_score": 0,
            "rep_count": 0,
        },
        "reps": [],
        "coaching": {
            "summary_paragraph": msg,
            "parameters": neutral_params,
        },
        "issues": [
            {
                "id": raw.get("error_code") or "analysis_failed",
                "title": "Video quality",
                "severity": "High",
                "detail": detail,
            }
        ],
        "_mediapipe_meta": {"stage": raw.get("error_stage"), "code": raw.get("error_code")},
    }


def map_success_payload(
    *,
    analysis_id: str,
    session_id: str,
    user_id: str,
    exercise_id: str,
    weight_value: float,
    weight_unit: str,
    raw: Dict[str, Any],
) -> Dict[str, Any]:
    session_block = raw.get("session") or {}
    reps_src: List[Dict[str, Any]] = list(raw.get("reps") or [])
    consolidated = raw.get("consolidated") or {}

    rep_rows = []
    sums = {"posture": 0.0, "movement_quality": 0.0, "stability": 0.0, "velocity": 0.0}
    form_scores: List[int] = []

    for rep in reps_src:
        parts = _rep_parameter_scores(rep)
        fs = _rep_form_score(parts)
        form_scores.append(fs)
        rn = rep.get("rep_number") or len(rep_rows) + 1
        rep_rows.append(
            {
                "rep_number": rn,
                "form_score": fs,
                "movement_quality_score": _clamp_score(parts["movement_quality"]),
                "stability_score": _clamp_score(parts["stability"]),
                "posture_score": _clamp_score(parts["posture"]),
                "tempo_score": _clamp_score(parts["velocity"]),
            }
        )
        for k in sums:
            sums[k] += parts[k]

    n = max(len(rep_rows), 1)
    avg_form = _clamp_score(sum(form_scores) / len(form_scores)) if form_scores else 0

    mean_posture = sums["posture"] / n
    mean_mq = sums["movement_quality"] / n
    mean_stab = sums["stability"] / n
    mean_vel = sums["velocity"] / n

    posture_note = _posture_coaching(mean_posture, consolidated)
    stability_note = _stability_coaching(rep_rows, reps_src, consolidated)
    mq_note = _movement_quality_coaching(mean_mq, consolidated)
    vel_note = _tempo_coaching(mean_vel, consolidated)

    coaching = {
        "summary_paragraph": _session_summary(
            exercise_id=exercise_id,
            weight_value=weight_value,
            weight_unit=weight_unit,
            rep_count=len(rep_rows),
            overall=avg_form,
        ),
        "parameters": {
            "posture": {"score": _clamp_score(mean_posture), "correction": posture_note},
            "stability": {"score": _clamp_score(mean_stab), "correction": stability_note},
            "movement_quality": {"score": _clamp_score(mean_mq), "correction": mq_note},
            "velocity": {"score": _clamp_score(mean_vel), "correction": vel_note},
        },
    }

    issues = _collect_issues(reps_src)

    return {
        "analysis_id": analysis_id,
        "session_id": session_id,
        "user_id": user_id,
        "exercise_id": exercise_id,
        "display_name": _humanize_exercise_id(exercise_id),
        "weight_value": weight_value,
        "weight_unit": weight_unit,
        "status": "complete",
        "summary": {
            "overall_form_score": avg_form,
            "movement_quality_score": _clamp_score(mean_mq),
            "stability_score": _clamp_score(mean_stab),
            "posture_score": _clamp_score(mean_posture),
            "tempo_score": _clamp_score(mean_vel),
            "rep_count": len(rep_rows),
            "camera_view": session_block.get("camera_view"),
        },
        "reps": rep_rows,
        "coaching": coaching,
        "issues": issues,
        "_mediapipe_meta": {
            "consolidated": consolidated,
            "raw_rep_keys": list(reps_src[0].keys()) if reps_src else [],
        },
    }


def _session_summary(
    *,
    exercise_id: str,
    weight_value: float,
    weight_unit: str,
    rep_count: int,
    overall: int,
) -> str:
    name = _humanize_exercise_id(exercise_id)
    if rep_count == 0:
        return f"No complete reps detected for your {name}."
    unit = (weight_unit or "kg").strip()
    return (
        f"{name} at {weight_value} {unit}: completed {rep_count} rep(s). "
        f"Overall form score {overall}/100 based on depth, torso angle, stability, and tempo."
    )


def _posture_coaching(mean_posture: float, consolidated: Dict[str, Any]) -> str:
    dist = (consolidated.get("posture") or {}).get("status_distribution") or {}
    if dist.get("WARNING", 0) >= dist.get("GOOD", 0):
        return "Torso angle flagged warnings on several reps — film from the side and keep chest taller."
    if mean_posture >= 82:
        return "Torso position stayed controlled across reps."
    return "Torso was acceptable — prioritize consistent bracing at heavier loads."


def _stability_coaching(
    rep_rows: List[Dict[str, Any]],
    reps_src: List[Dict[str, Any]],
    consolidated: Dict[str, Any],
) -> str:
    flags = sum(1 for r in reps_src if (r.get("stability_data") or {}).get("valgus_flag"))
    if flags:
        return f"Knee tracking: inward movement suggested on {flags} rep(s) — push knees out over toes."
    stab = consolidated.get("stability") or {}
    if stab.get("heel_lift_reps"):
        return "Watch for heel lift at the bottom — keep full foot pressure."
    return "Stability looked solid for the visible camera angle."


def _movement_quality_coaching(mean_mq: float, consolidated: Dict[str, Any]) -> str:
    mq = consolidated.get("movement_quality") or {}
    if mq.get("depth_insufficient_reps", 0) >= 2:
        return "Depth was shallow on multiple reps — aim hips below knee joint when safe."
    dist = mq.get("depth_distribution") or {}
    if dist.get("insufficient", 0) >= dist.get("parallel", 0):
        return "Try pausing slightly longer at depth to reach consistent range."
    if mean_mq >= 82:
        return "Depth and ROM looked strong across the set."
    return "Depth was workable — focus on hitting the same bottom position each rep."


def _tempo_coaching(mean_vel: float, consolidated: Dict[str, Any]) -> str:
    tempo = consolidated.get("tempo") or {}
    total_mean = tempo.get("total_mean")
    if isinstance(total_mean, (int, float)) and total_mean > 6:
        return "Eccentric/concentric phases ran long — try a steady 3-count down, drive up with intent."
    if isinstance(total_mean, (int, float)) and total_mean < 1.5:
        return "Reps looked rushed — control the descent to feel positions."
    if mean_vel >= 80:
        return "Tempo stayed controlled across reps."
    return "Tempo was acceptable — keep the same rhythm set to set."


def _collect_issues(reps_src: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []

    valgus_reps = sum(1 for r in reps_src if (r.get("stability_data") or {}).get("valgus_flag"))
    if valgus_reps:
        issues.append(
            {
                "id": "knee-valgus",
                "title": "Knee valgus",
                "severity": "Medium",
                "detail": f"Inward knee movement suggested on {valgus_reps} rep(s).",
            }
        )

    depth_bad = sum(
        1
        for r in reps_src
        if (r.get("depth_data") or {}).get("depth_classification") == "insufficient"
    )
    if depth_bad >= max(1, len(reps_src) // 2):
        issues.append(
            {
                "id": "depth-insufficient",
                "title": "Limited depth",
                "severity": "Medium",
                "detail": "Several reps stopped above parallel — increase ROM if mobility allows.",
            }
        )

    warn_reps = sum(1 for r in reps_src if (r.get("back_data") or {}).get("status") == "WARNING")
    if warn_reps >= max(1, len(reps_src) // 2):
        issues.append(
            {
                "id": "torso-angle",
                "title": "Torso collapse risk",
                "severity": "Low",
                "detail": "Back angle warnings on multiple reps — keep chest proud and core braced.",
            }
        )

    return issues


def map_pipeline_output(
    *,
    analysis_id: str,
    session_id: str,
    user_id: str,
    exercise_id: str,
    weight_value: float,
    weight_unit: str,
    raw: Dict[str, Any],
) -> Dict[str, Any]:
    if raw.get("event") == "error":
        return map_quality_gate_error(
            analysis_id=analysis_id,
            session_id=session_id,
            user_id=user_id,
            exercise_id=exercise_id,
            weight_value=weight_value,
            weight_unit=weight_unit,
            raw=raw,
        )
    return map_success_payload(
        analysis_id=analysis_id,
        session_id=session_id,
        user_id=user_id,
        exercise_id=exercise_id,
        weight_value=weight_value,
        weight_unit=weight_unit,
        raw=raw,
    )
