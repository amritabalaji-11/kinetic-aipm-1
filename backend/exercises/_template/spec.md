# New exercise — exercise spec (template)

Copy this folder to `exercises/<your-exercise-id>/`, rename the ID everywhere, and fill in every section (there are 14). Every section has one machine block; the validator (`exercises/validate.py`) checks the whole file and the tests replay your labelled clips. Read `exercises/SCHEMA.md` first: it explains every field and the vocabulary. This template is valid as it stands, so `python3 -m unittest tests.test_template` tells you it still follows the structure after you edit it. Everything marked TODO is a placeholder to replace.

Folders that start with an underscore are never registered, so this template is never mistaken for an exercise.

---

## 1. Identity

TODO: why this ID. The ID is the movement slug: split into a new ID only if something would change the rep counter, the measures, the rules or the key moment.

```json kinetic:identity
{
  "exercise_id": "new-exercise",
  "name": "TODO Exercise name",
  "spec_version": "0.1.0",
  "status": "draft",
  "family": "TODO family (squat, hinge, push, pull, lunge, carry)",
  "aliases": ["new exercise"],
  "equipment_variants": [{"catalog_id": "ex_000", "equipment": "bodyweight"}],
  "reference_file_stem": "new_exercise",
  "trainer_signoff": null,
  "updated": "2026-01-01"
}
```

## 2. Goal profiles

TODO: which training goals the rules are valid for. Start with strength only; add another goal only once there are labelled clips for it, and list it under `supported` with its overrides. A goal without a profile is refused, never quietly judged as another goal.

```json kinetic:goal_profiles
{
  "default": "strength",
  "supported": ["strength"],
  "unsupported": {"endurance": "no labelled clips yet"},
  "profiles": {"strength": {"overrides": {}}}
}
```

## 3. Capture

TODO: which camera views show which checks, and what to tell the user before they film.

```json kinetic:capture
{
  "preferred_view": "side",
  "views": {"side": ["side_left", "side_right"], "front": ["front"]},
  "target_reps": [5, 10],
  "tips": [{"bold": "TODO tip", "why": "TODO why this helps"}],
  "view_notes": {"front": "TODO what we can and cannot check from the front"}
}
```

## 4. Landmarks

TODO: which body points matter for this exercise and how much. MediaPipe always finds all 33; a point that is not listed is ignored. Critical points must be seen clearly or the video is not accepted. For a squat the legs count most; for a chest press it would be the shoulders, elbows and wrists. The weights of all tracked points must add up to 1. Every body part a measure or an arrow uses must be tracked here.

```json kinetic:landmarks
{
  "importance_weights": {"critical": 0.4, "important": 0.1, "least_impact": 0.03},
  "critical": ["left_hip", "right_hip"],
  "important": ["left_shoulder", "right_shoulder"],
  "least_impact": [],
  "thresholds": {"visibility": 0.70, "presence": 0.70, "critical_hard_floor": 0.60, "good": 0.85, "acceptable": 0.70},
  "side_views_use": "near_side"
}
```

## 5. Measures

TODO: every number a rule uses, with where it lives in the per-rep data and how it is calculated.

```json kinetic:measures
[
  {"id": "example_measure", "label": "TODO label", "field": "section_name.field_name", "unit": "TODO unit", "views": ["side"], "landmarks": ["hip"],
   "definition": "TODO calculation, naming the landmarks it uses"}
]
```

## 6. Rep counting

TODO: the signal to follow, where a rep starts (top or bottom), thresholds, how setup movements are ignored, one-sided or timed exercises.

```json kinetic:rep_counting
{
  "counter": "TODO counter type",
  "signal": "TODO signal",
  "start_phase": "top",
  "partial_last_rep": true,
  "unilateral": false,
  "timed": false,
  "thresholds": {"example_threshold": 0},
  "setup_outlier": {}
}
```

## 7. Rules

TODO: one rule per thing worth saying. Each rule needs a test from the vocabulary in `exercises/schema.py`, wording, a status (`draft` until labelled clips prove it) and evidence. Add a `comparison` to every rule that should show a before/after video and picture.

```json kinetic:rules
[
  {
    "id": "example_rule", "topic": "example_topic", "kind": "work_on", "views": ["side"], "measure": "example_measure",
    "test": {"type": "share_over", "threshold": 0, "skip_first": true, "min_with_data": 4},
    "requires_enough_reps": true, "status": "draft",
    "evidence": ["none yet"],
    "wording": {"headline": "TODO headline", "why": "TODO why it matters", "cue": "TODO one thing to do"},
    "comparison": {
      "mode": "pair", "labels": ["Your best rep", "A typical rep"],
      "left": {"pick": "min", "measure": "example_measure", "pool": "all"},
      "right": {"pick": "closest_to_median", "measure": "example_measure", "pool": "all"},
      "picture": {"pick": "middle", "pool": "flagged"}
    }
  }
]
```

## 8. Selection

TODO: the fewest reps worth giving feedback on, how many items to show, and the order of topics (safety first).

```json kinetic:selection
{
  "min_reps": 5,
  "min_with_data": 4,
  "skip_first_rep_when_more_than": 5,
  "majority_share": 0.5,
  "max_items_per_list": 2,
  "max_items_when_few_reps": 1,
  "max_words_per_line": 12,
  "work_on_order": ["example_topic"],
  "went_well_order": []
}
```

## 9. Visuals

TODO: what the key moment of a rep is for this exercise (the bottom of a squat, the lockout of a deadlift), and the video settings.

```json kinetic:visuals
{
  "key_moment": {"frame_field": "knee_angle", "pick": "min"},
  "pad_seconds": 0.35,
  "freeze_seconds": 1.6,
  "slow_target_seconds": 2.0,
  "arrow_window_seconds": 0.4,
  "min_reps": 4,
  "single_label": "Your set",
  "picture_style": "arrow_on_frame",
  "reference_clip": null
}
```

## 10. Screen

TODO: the fixed reminders (breathing, bracing, driving force) and the pain line.

```json kinetic:screen
{
  "reminders": ["TODO reminder"],
  "pain_line": "TODO pain line",
  "depth_cards": {}
}
```

## 11. Progression

```json kinetic:progression
{"status": "not_modelled", "notes": "TODO"}
```

## 12. Not measured

```json kinetic:not_measured
[{"item": "TODO something we deliberately do not measure", "reason": "TODO why"}]
```

## 13. Evidence and tests

TODO: label clips at original speed (never a sped-up or re-processed copy), store each clip's per-rep data in `tests/golden/<id>/reps/<clip>.json`, and record what the rules must say in `expected.json`. A rule with a clip it fires on and a clip it is silent on can be marked `tested`.

```json kinetic:evidence
{
  "golden_dir": "tests/golden/new-exercise",
  "clips": [{"id": "example_clip", "view": "side", "reps": 8, "label": null, "source_recording": "TODO file name"}],
  "proof": []
}
```

## 14. Decisions and change log

```json kinetic:decisions
{
  "open": [],
  "changelog": [{"version": "0.1.0", "date": "2026-01-01", "text": "Started from the template."}]
}
```
