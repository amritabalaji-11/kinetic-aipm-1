"""Code decides WHAT can be said; the AI only words it.

This module sits between the rule engine and the AI:

  compute_signals   runs the exercise's rules (the engine, services/rule_engine.py) over a set's per-rep measurements and returns the
                    coaching points that are allowed, each with the reps it rests on and suggested wording.
  signals_for_ai    the compact version the AI is shown. It may use only those points, with those rep lists.
  apply_signals     after the AI answers: topics that were not allowed are dropped, rep lists are overwritten with the real ones,
                    allowed points the AI left out are filled from the spec's wording, over-long wording is replaced, and the lists are capped.

It knows nothing about any one exercise. Every number, line of wording, priority and cap comes from the exercise spec
(`exercises/<exercise-id>/spec.md`): change them there. The tests replay real clips and fail if a result changes.

The rules every exercise shares are enforced by the engine and by `apply_signals`:
  - a point is flagged or praised only if it held on MORE THAN HALF the reps it considers (selection.majority_share);
  - one topic appears in one list only; at most `max_items_per_list` per list (`max_items_when_few_reps` if there are too few reps);
  - depth-like points that must never be a "work on" are flags: the engine reports them in `flags` and the app decides what to show.
"""
from exercises.registry import get_spec
from services.rule_engine import evaluate

DEFAULT_EXERCISE_ID = "goblet-squat"


def compute_signals(reps: list, exercise_id: str = DEFAULT_EXERCISE_ID, goal=None) -> dict:
    """reps = the per-rep list from the biomechanics JSON. Returns the allowed coaching points (see rule_engine.evaluate)."""
    spec = get_spec(exercise_id, goal)
    result = evaluate(reps, spec)
    result["goal"] = (goal or spec["goal_profiles"]["default"]).lower()
    result["spec_version"] = spec["identity"]["spec_version"]
    return result


def signals_for_ai(sig: dict) -> dict:
    """The compact version the AI sees. It may use only these points, with these rep lists."""
    return {
        "rep_count": sig["rep_count"],
        "enough_reps": sig["enough_reps"],
        "allowed": [
            {"kind": s["kind"], "topic": s["topic"], "reps_flagged": s["reps_flagged"], "evidence": s["numbers"], "suggested_wording": s["wording"]}
            for s in sig["signals"]
        ],
        "note": "Only the points in 'allowed' may appear. Copy reps_flagged exactly. Anything not listed was checked and is not to be mentioned.",
    }


def _words(text):
    return len(str(text or "").split())


def _sharp(item, wording, fields, max_words):
    for f in fields:
        if f not in wording:
            continue
        if not item.get(f) or _words(item.get(f)) > max_words:
            item[f] = wording[f]


def apply_signals(coaching_output: dict, sig: dict) -> dict:
    """Make the AI's feedback_items obey the code: allowed topics only, real rep lists, sharp wording, caps."""
    spec = get_spec(sig["exercise_id"], sig.get("goal"))
    sel = spec["selection"]
    allowed = {(s["kind"], s["topic"]): s for s in sig["signals"]}
    items = coaching_output.get("feedback_items") or {}
    keep = {"went_well": {}, "work_on": {}}
    for kind in ("went_well", "work_on"):
        for it in items.get(kind) or []:
            s = allowed.get((kind, it.get("topic")))
            if not s or it.get("topic") in keep[kind]:
                continue
            it["reps_flagged"] = s["reps_flagged"]
            it.pop("reps_with", None)
            keep[kind][it["topic"]] = it
    # anything allowed that the AI left out is added from the short wording
    for (kind, topic), s in allowed.items():
        if topic not in keep[kind]:
            keep[kind][topic] = {"topic": topic, "reps_flagged": s["reps_flagged"], **s["wording"]}
    for kind in keep:
        for topic, it in keep[kind].items():
            _sharp(it, allowed[(kind, topic)]["wording"], ("headline", "why", "cue") if kind == "work_on" else ("headline",), sel["max_words_per_line"])
            if kind == "went_well":
                it.setdefault("detail", "")

    cap = sel["max_items_per_list"] if sig["enough_reps"] else sel["max_items_when_few_reps"]
    order_w = [t for t in sel["went_well_order"] if t in keep["went_well"]]
    order_k = [t for t in sel["work_on_order"] if t in keep["work_on"]]
    coaching_output["feedback_items"] = {
        "went_well": [keep["went_well"][t] for t in order_w][:cap],
        "work_on": [keep["work_on"][t] for t in order_k][:cap],
    }
    # What the app reads later: the camera view, the flags (for example depth_short), the numbers behind each point, which rule fired for
    # each topic (the before/after chooser needs it), and which version of the spec produced all of this.
    coaching_output["signals"] = {
        "exercise_id": sig["exercise_id"],
        "spec_version": sig.get("spec_version"),
        "goal": sig.get("goal"),
        "camera_view": sig.get("camera_view"),
        **{name: bool(value) for name, value in (sig.get("flags") or {}).items()},
        "numbers": {**(sig.get("numbers") or {}), **{f"{s['kind']}:{s['topic']}": s["numbers"] for s in sig["signals"]}},
        "allowed": [f"{s['kind']}:{s['topic']}" for s in sig["signals"]],
        "rules": {f"{s['kind']}:{s['topic']}": s["rule"] for s in sig["signals"]},
        "fired_flags": [name for name, value in (sig.get("flags") or {}).items() if value],
    }
    return coaching_output
