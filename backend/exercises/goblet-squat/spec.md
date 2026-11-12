# Goblet Squat — exercise spec

**Exercise ID:** `goblet-squat` · **Spec version:** 2.1.0 · **Status:** draft · **Goal:** strength only

This file is the **single source of truth** for how Kinetic checks a goblet squat. It follows the 14-section structure every exercise uses (`exercises/SCHEMA.md`). Each section has a short explanation for people and one machine block that the code reads (a fenced `json kinetic:<section>` block). The validator (`exercises/validate.py`) refuses to load a spec that breaks the structure, and the tests replay 17 real clips against it.

Change a number or a line of wording **here**, never in the code. Anything marked *draft* rests on very little evidence.

---

## 1. Identity

The movement slug is the ID. The dumbbell and kettlebell goblet squats share it, because the analysis never reads the equipment. Split into a new ID only if something would change the rep counter, the measures, the rules or the key moment.

```json kinetic:identity
{
  "exercise_id": "goblet-squat",
  "name": "Goblet Squat",
  "spec_version": "2.1.0",
  "status": "draft",
  "family": "squat",
  "aliases": ["goblet_squat", "goblet squat", "db goblet squat", "kb goblet squat"],
  "equipment_variants": [
    {"catalog_id": "ex_001", "equipment": "dumbbell"},
    {"catalog_id": "ex_049", "equipment": "kettlebell"}
  ],
  "reference_file_stem": "goblet_squat",
  "trainer_signoff": null,
  "updated": "2026-11-12"
}
```

## 2. Goal profiles

Only **strength** is supported: heavier weight, about 5 to 10 controlled reps, a deliberate tempo. Endurance (lighter, more reps, faster) would need different tempo rules, a different rep range and different progression, and we have no endurance clips to set any of it from. A goal without a profile is refused; it is never quietly judged as strength. The goal is hard-coded to strength for now.

```json kinetic:goal_profiles
{
  "default": "strength",
  "supported": ["strength"],
  "unsupported": {"endurance": "no labelled endurance clips yet, so no thresholds can be set"},
  "profiles": {"strength": {"overrides": {}}}
}
```

## 3. Capture: what we tell the user before they film

Side view is preferred because lean, depth and ankle range can only be read from the side. From the front only knee tracking and timing can be read.

| Check | Side | Angled | Front |
|---|---|---|---|
| Torso lean | yes | no | no |
| Depth (hips against knees) | yes | yes | no |
| Ankle range | yes | no | no |
| Knee tracking | no | no | yes (draft) |
| Lowering speed and pace | yes | yes | yes |

```json kinetic:capture
{
  "preferred_view": "side",
  "views": {
    "side": ["side_left", "side_right"],
    "angled": ["angled"],
    "front": ["front"]
  },
  "target_reps": [5, 10],
  "tips": [
    {"bold": "Side view", "why": "so we can see your back, hip and knee angles"},
    {"bold": "Head to toe", "why": "fill ~70% of the screen, so nothing gets cut off"},
    {"bold": "Portrait view, hip height", "why": "so your body stays big and your depth looks true"},
    {"bold": "Just you", "why": "we can only track one person: no mirrors, no one else"},
    {"bold": "5 to 10 reps", "why": "at least 5, or we can't tell a pattern from a one-off. Only the reps: less to upload"},
    {"bold": "Fitted clothes", "why": "Baggy can hide your joints"}
  ],
  "view_notes": {
    "front": "Filmed from the front, we check your knees and timing. Film from the side to get feedback on lean, depth and ankle range."
  }
}
```

Fewer than 5 reps: the results screen says so and the upload screen asks for another video. The backend quality gate already rejects fewer than 3 outright, before any analysis. Not built yet: a check at upload that the whole body is in frame and the light is OK.

## 4. Landmarks

MediaPipe always finds all 33 body points. This section says which of them matter for *this* exercise and how much, because the video-quality check judges "can we see enough of this person" by looking at the points that matter. For a squat the legs count most; for a chest press it would be the shoulders, elbows and wrists, and the feet would be ignored. A point that is not listed is ignored.

- **Critical** points (the hips, knees and heels) must be seen clearly or the video is not accepted. **Important** points count less, and **least impact** points hardly count. Each level has a weight, and the weights of all tracked points add up to 1.
- From the **side**, only the points on the side nearest the camera are judged (plus the nose), because the far side is hidden by the body.
- Every body part a measure or an arrow uses (`landmarks` in section 5, the arrow anchors in section 7) must be tracked here; the validator checks it.
- **Where this is read today:** the video-quality check still reads the same list from code (`landmark_quality_configuration.py`). A test proves the two are identical, so when the quality check moves to read this section nothing changes for squats.

```json kinetic:landmarks
{
  "importance_weights": {"critical": 0.083, "important": 0.044, "least_impact": 0.030},
  "critical": ["left_hip", "right_hip", "left_knee", "right_knee", "left_heel", "right_heel"],
  "important": ["left_shoulder", "right_shoulder", "left_ankle", "right_ankle", "left_foot_index", "right_foot_index", "left_ear", "right_ear"],
  "least_impact": ["left_elbow", "right_elbow", "left_eye", "right_eye", "nose"],
  "thresholds": {"visibility": 0.70, "presence": 0.70, "critical_hard_floor": 0.60, "good": 0.85, "acceptable": 0.70},
  "side_views_use": "near_side"
}
```

## 5. Measures

Every number a rule uses is a named measure that lives at a fixed place in the per-rep data. Rules refer to measures by `id`, never to data paths.

- **Pose:** the MediaPipe pose landmarker (heavy model), every 3rd frame of a 30 fps copy of the video. A landmark below 0.70 visibility is ignored. The most common camera view in the clip is used.
- **Why these measures:** the trainer's guidance was that fixed angles vary with mobility, so rules compare a person with their own start where they can, and use tempo and cues rather than angle targets.

```json kinetic:measures
[
  {"id": "lean_at_bottom", "label": "Torso lean at the bottom", "field": "back_data.back_angle_at_bottom", "unit": "degrees from vertical", "views": ["side"], "landmarks": ["shoulder", "hip"],
   "definition": "Torso's angle from vertical at the lowest point of the rep (shoulder to hip, world landmarks)."},
  {"id": "ankle_deg", "label": "Ankle range at the bottom", "field": "ankle_data.dorsiflexion_at_bottom", "unit": "degrees from vertical", "views": ["side"], "landmarks": ["knee", "ankle"],
   "definition": "Shin's angle from vertical at the lowest point of the rep (knee to ankle). A stand-in for ankle dorsiflexion."},
  {"id": "depth_ratio", "label": "Depth: hips against knees", "field": "depth_data.hip_below_knee_ratio", "unit": "share of upright torso length", "views": ["side", "angled"], "landmarks": ["shoulder", "hip", "knee"],
   "definition": "How far the hips are below the knees at the bottom, divided by the longest upright torso length seen (positive = hips lower than knees). Works from the side and from an angle; a front view shifts it by about 0.3 so it is not used."},
  {"id": "lowering_s", "label": "Lowering time", "field": "tempo_data.eccentric", "unit": "seconds", "views": ["any"], "valid_above": 0, "landmarks": ["shoulder", "hip", "knee"],
   "definition": "Time spent moving down: speed above 15% of the rep's top speed counts as moving, the near-top and near-bottom zones are 25% of the range, ranges under 20 degrees are ignored."},
  {"id": "knee_ankle_ratio", "label": "Knee gap against ankle gap at the bottom", "field": "stability_data.knee_ankle_ratio_at_bottom", "unit": "ratio", "views": ["front"], "landmarks": ["knee", "ankle"],
   "definition": "Horizontal distance between the knees divided by the distance between the ankles, at the frames where the hips are lowest. Knees normally travel out as you sit, so a ratio near 1.0 means the knees stayed as close as the feet."},
  {"id": "knee_travel", "label": "How much the knees move in and out", "field": "stability_data.knee_travel", "unit": "summed change in the ratio over the rep", "views": ["front"], "landmarks": ["knee", "ankle"],
   "definition": "Sum of the frame-to-frame change in knee gap divided by ankle gap over the rep. Only used to choose which two reps to show; it does not separate a good clip from a faulty one."}
]
```

## 6. Rep counting

A rep is a hip-angle cycle: standing, descending, bottom, ascending, standing.

- **Down** starts under 150 degrees at the hip; the rep finishes back over 155.
- **Quick sets:** a rep also finishes when the person turns round on the way up without standing fully (the hip angle had climbed to 135 and then fell 8).
- **People who lean forward** never open past 150, so coming up is also recognised when the hip angle has risen 30 degrees from this rep's own lowest point.
- **Setup and pick-up movements** (lifting the weight, putting it down) are removed by testing each counted rep against the set's own typical rep: lean at the bottom more than 30 degrees away from the set median, or knee more than 35 degrees straighter, or the share of time the hands are above the hips far below the median.
- A **cut-off last squat** is kept and marked partial; partial reps are not used by the rules or the before/after.
- **Checked against** the person's own true counts, 10 (side, 12.5 kg) and 9 (side, 17.5 kg): both match. An independent hip-height peak count agrees on the other clips except v3 and v6, where it said 7 and 8 and the pipeline said 6 and 6; no true count exists for those two, so they are unresolved.
- **Known limit:** this counter follows the hip angle. An exercise that starts at the bottom, is one-sided or is a timed hold needs its own counter.

```json kinetic:rep_counting
{
  "counter": "hip_angle_cycle",
  "signal": "hip_angle",
  "start_phase": "top",
  "partial_last_rep": true,
  "unilateral": false,
  "timed": false,
  "thresholds": {
    "threshold_down": 150,
    "threshold_up": 155,
    "min_bottom_hold": 1,
    "threshold_deep": 120,
    "turnaround_min_peak": 135,
    "turnaround_drop": 8,
    "ascent_rise": 30
  },
  "setup_outlier": {"lean_deg": 30.0, "knee_deg": 35.0, "hands_share": 0.45}
}
```

## 7. Rules

**The engine rules every exercise shares:**

1. **Code decides what can be said; the AI only words it.** The AI may use only the points the code allows, with the rep lists the code gives.
2. A point is flagged or praised only if it held on **more than half** the reps it considers (`selection.majority_share`).
3. **One topic appears in one list only.**
4. **At most 2 items per list** (1 if fewer than 5 reps). Never padded: an empty list is fine.
5. **Trend language** in anything the user reads. No rep numbers, no scores, no degrees, no ideal ranges.
6. **Never** "chest up", "stay tall" or "upright"; never claim the back is "rounding" (we cannot see it); never tell anyone to go deeper.

**The goblet-squat rules** (each says which camera views it needs; status *draft* means no labelled clip proves it yet, *tested* means a labelled clip makes it fire and another keeps it silent, *validated* adds a trainer's sign-off):

| Rule id | Topic | Kind | Fires when | Status |
|---|---|---|---|---|
| `lean_high` | chest_lean | work on | lean is 45 degrees or more on more than half the reps after the first (and at least 2) | tested, weak |
| `lean_growth` | chest_lean | work on | the later reps lean 5 degrees or more further than the person's own first 3 reps, on at least 2 reps. "Later" is the second half of the set but never the first 3 reps, so in a 5-rep set it is the last 2 | draft |
| `lean_steady` | chest_lean | went well | the later reps are within 2 degrees of the person's own start | tested |
| `knee_tracking` | knee_tracking | work on | knee gap / ankle gap at the bottom under 1.15 on more than half the reps (front only) | tested, weak |
| `ankle_limited` | ankle_mobility | work on | ankle range under 25 degrees on more than half the reps | draft |
| `ankle_good` | ankle_mobility | went well | 30 degrees or more on more than half the reps (only if not limited) | draft |
| `pace_drift` | pace_drift | work on | the last third of the reps lower 0.3 s or more quicker than the first third, and at most 0.75 of it | draft |
| `lowering_quick` | lowering_speed | work on | lowering under 0.6 s on more than half the reps (and at least 2) | draft, unproven |
| `lowering_controlled` | lowering_speed | went well | typical lowering between 1.5 and 4.5 s, on more than half the reps | draft |
| `depth_good` | depth | went well | hips at or below 0.08 *above* the knees on more than half the reps | tested |
| `depth_short` | depth | flag | more than half the reps short of that line | tested |
| `depth_very_shallow` | depth | flag | more than half the reps under −0.20 | tested |

Where several rules share a group, the first that fires wins: lean (`lean_high`, `lean_growth`, `lean_steady`), ankle (`ankle_limited`, `ankle_good`), lowering (`pace_drift`, `lowering_quick`, `lowering_controlled`).

**Depth is never a "work on".** The two depth rules are flags the app turns into a gentle "Try next" card or a "bodyweight first" card (section 10).

**What the evidence says, honestly:**
- `lowering_quick`: no real-speed clip is that fast (real clips lower in 0.7 to 1.3 s). The 0.6 s figure was first set from clips that had been saved at 3x speed.
- `lowering_controlled`: none of the 17 clips reaches 1.5 s.
- `knee_tracking`: one labelled fault clip. Through the pipeline it reads 1.06 to 1.15 against 1.17 to 1.26 for the good clip, so the gap is about 0.02.
- `lean_high`: median lean after rep 1 is 29 to 31 for the good torso clip and Amrita's side clips, 38 for v2, 41 to 48 for user_002, 46 for v1 and 50 for v5 (the torso fault).
- `depth_*`: good-depth sets sit at +0.1 to +0.2, a labelled "depth good" clip near 0, a labelled "depth fault" clip at −0.26.
- Nothing has a trainer's sign-off yet.

The `comparison` of each rule says what the before/after video shows (section 9). `picture` says which rep the still picture shows.

```json kinetic:rules
[
  {
    "id": "lean_high", "topic": "chest_lean", "kind": "work_on", "views": ["side"], "measure": "lean_at_bottom",
    "test": {"type": "share_over", "threshold": 45.0, "skip_first": true, "min_with_data": 4, "min_flagged": 2},
    "group": "lean", "group_order": 1, "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled torso-fault clip (v5, median lean 50), silent on the labelled good clip (v6, 30).", "Weak: only one fault clip; user_002 at 41 to 48 sits close to the line."],
    "wording": {"headline": "You leaned well forward on most reps.", "why": "More forward lean loads your lower back.", "cue": "Sit your hips back as you lower."},
    "comparison": {
      "mode": "pair", "labels": ["Your best rep", "Leaning furthest"],
      "left": {"pick": "min", "measure": "lean_at_bottom", "pool": "after_first"},
      "right": {"pick": "max", "measure": "lean_at_bottom", "pool": "after_first"},
      "arrow": {"label": "Torso lean", "views": ["side"], "anchor": {"landmarks": ["shoulder", "hip"], "t": 0.5, "back_offset": 0.07}},
      "picture": {"pick": "max", "measure": "lean_at_bottom", "pool": "flagged"}
    }
  },
  {
    "id": "lean_growth", "topic": "chest_lean", "kind": "work_on", "views": ["side"], "measure": "lean_at_bottom",
    "test": {"type": "growth_vs_start", "baseline_reps": 3, "growth": 5.0, "min_with_data": 4, "min_flagged": 2},
    "group": "lean", "group_order": 2, "requires_enough_reps": true, "status": "draft",
    "evidence": ["No labelled clip makes it fire today: the torso-fault clip leans high from the start and does not grow."],
    "wording": {"headline": "You leaned further forward as the set went on.", "why": "More forward lean loads your lower back.", "cue": "Sit your hips back as you lower."},
    "comparison": {
      "mode": "pair", "labels": ["How it was", "How it is now"],
      "left": {"pick": "typical_early", "measure": "lean_at_bottom", "pool": "all"},
      "right": {"pick": "max", "measure": "lean_at_bottom", "pool": "flagged"},
      "arrow": {"label": "Torso lean", "views": ["side"], "anchor": {"landmarks": ["shoulder", "hip"], "t": 0.5, "back_offset": 0.07}},
      "picture": {"pick": "max", "measure": "lean_at_bottom", "pool": "flagged"}
    }
  },
  {
    "id": "lean_steady", "topic": "chest_lean", "kind": "went_well", "views": ["side"], "measure": "lean_at_bottom",
    "test": {"type": "steady_vs_start", "baseline_reps": 3, "growth_max": 2.0, "margin": 4.0, "min_with_data": 4},
    "group": "lean", "group_order": 3, "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled good torso clip (v6, lean 30 throughout), silent on the torso-fault clip (v5)."],
    "wording": {"headline": "Your torso position stayed steady."}
  },
  {
    "id": "knee_tracking", "topic": "knee_tracking", "kind": "work_on", "views": ["front"], "measure": "knee_ankle_ratio",
    "test": {"type": "share_under", "threshold": 1.15, "skip_first": true, "min_with_data": 4},
    "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled knee-fault clip (v3, 1.06 to 1.15), silent on the labelled good clip (v4, 1.17 to 1.26).", "Weak: one fault clip, a gap of about 0.02, and the ratio depends on stance width. user_002 front also fires (1.02 to 1.08)."],
    "wording": {"headline": "Your knees drifted inward as you lowered.", "why": "Knees caving in loads the inside of the knee.", "cue": "Push your knees out over your little toes."},
    "comparison": {
      "mode": "pair", "labels": ["Your steadiest rep", "Knees moving most"],
      "left": {"pick": "min", "measure": "knee_travel", "pool": "after_first"},
      "right": {"pick": "max", "measure": "knee_travel", "pool": "after_first"},
      "pair_if": {"measure": "knee_travel", "ratio_at_least": 1.5},
      "else_single": {"pick": "closest_to_median", "measure": "knee_ankle_ratio", "pool": "flagged"},
      "arrow": {"label": "Knees in", "views": ["front"], "anchor": {"landmarks": ["knee_image_left"], "x_offset": -0.02, "tail": "left"}},
      "picture": {"pick": "middle", "measure": "knee_ankle_ratio", "pool": "flagged"}
    }
  },
  {
    "id": "ankle_limited", "topic": "ankle_mobility", "kind": "work_on", "views": ["side"], "measure": "ankle_deg",
    "test": {"type": "share_under", "threshold": 25.0, "skip_first": true, "min_with_data": 4},
    "group": "ankle", "group_order": 1, "requires_enough_reps": true, "status": "draft",
    "evidence": ["No labelled ankle clips; the 25 and 30 degree lines come from the old reference."],
    "wording": {"headline": "Your ankle mobility looked limited.", "why": "Limited ankle range pushes the knees in or the body forward.", "cue": "Keep your whole foot on the floor."},
    "comparison": {
      "mode": "pair", "labels": ["Your best rep", "A typical rep"],
      "left": {"pick": "max", "measure": "ankle_deg", "pool": "all"},
      "right": {"pick": "closest_to_median", "measure": "ankle_deg", "pool": "all"},
      "pair_if": {"measure": "ankle_deg", "gap_at_least": 5.0},
      "arrow": {"label": "Ankle mobility", "views": ["side"], "anchor": {"landmarks": ["ankle", "knee"], "t": 0.35, "back_offset": 0.05}},
      "picture": {"pick": "min", "measure": "ankle_deg", "pool": "flagged"}
    }
  },
  {
    "id": "ankle_good", "topic": "ankle_mobility", "kind": "went_well", "views": ["side"], "measure": "ankle_deg",
    "test": {"type": "share_over", "threshold": 30.0, "skip_first": true, "min_with_data": 4},
    "group": "ankle", "group_order": 2, "requires_enough_reps": true, "status": "draft",
    "evidence": ["No labelled ankle clips. Decision pending: hide this praise until a trainer checks the lines."],
    "wording": {"headline": "Your ankle mobility was good."}
  },
  {
    "id": "pace_drift", "topic": "pace_drift", "kind": "work_on", "views": ["any"], "measure": "lowering_s",
    "test": {"type": "drop_over_thirds", "drop": 0.3, "last_over_first_max": 0.75, "typical_min": 0.6, "min_with_data": 3},
    "group": "lowering", "group_order": 1, "requires_enough_reps": true, "status": "draft",
    "evidence": ["Not seen on any of the 17 clips."],
    "wording": {"headline": "You rushed more as the set went on.", "why": "Rushing costs you control at the bottom.", "cue": "Count to two on every lowering."},
    "comparison": {
      "mode": "pair", "labels": ["How it was", "How it is now"],
      "left": {"pick": "closest_to_median", "measure": "lowering_s", "pool": "first_third"},
      "right": {"pick": "min", "measure": "lowering_s", "pool": "last_third"},
      "picture": {"pick": "middle", "measure": "lowering_s", "pool": "flagged"}
    }
  },
  {
    "id": "lowering_quick", "topic": "lowering_speed", "kind": "work_on", "views": ["any"], "measure": "lowering_s",
    "test": {"type": "share_under", "threshold": 0.6, "min_with_data": 3, "min_flagged": 2},
    "group": "lowering", "group_order": 2, "requires_enough_reps": false, "status": "draft",
    "evidence": ["Unproven: no real-speed clip lowers in under 0.6 s (real clips: 0.7 to 1.3 s). First set from clips saved at 3x speed."],
    "wording": {"headline": "You dropped into the squat on most reps.", "why": "Dropping fast means less control at the bottom.", "cue": "Lower for about two seconds."},
    "comparison": {
      "mode": "slow", "labels": ["Your pace", "A 2-second lowering"],
      "left": {"pick": "closest_to_median", "measure": "lowering_s", "pool": "flagged"},
      "picture": {"pick": "middle", "measure": "lowering_s", "pool": "flagged"}
    }
  },
  {
    "id": "lowering_controlled", "topic": "lowering_speed", "kind": "went_well", "views": ["any"], "measure": "lowering_s",
    "test": {"type": "share_between", "min": 1.5, "max": 4.5, "typical_within": true, "min_with_data": 3},
    "group": "lowering", "group_order": 3, "requires_enough_reps": false, "status": "draft",
    "evidence": ["None of the 17 clips lowers for 1.5 s or more, so it has never fired."],
    "wording": {"headline": "You lowered with control."}
  },
  {
    "id": "depth_good", "topic": "depth", "kind": "went_well", "views": ["side", "angled"], "measure": "depth_ratio",
    "test": {"type": "share_over", "threshold": -0.08, "skip_first": true, "min_with_data": 4},
    "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled depth-good clip (v2), silent on the labelled depth-fault clip (v1).", "Good-depth sets sit at +0.1 to +0.2; v2 near 0; v1 at -0.26."],
    "wording": {"headline": "Your depth was consistent."}
  },
  {
    "id": "depth_short", "topic": "depth", "kind": "flag", "flag": "depth_short", "views": ["side", "angled"], "measure": "depth_ratio",
    "test": {"type": "share_under", "threshold": -0.08, "skip_first": true, "min_with_data": 4},
    "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled depth-fault clip (v1), silent on the labelled depth-good clip (v2)."],
    "comparison": {
      "mode": "pair", "labels": ["Your deepest rep", "A typical rep"],
      "left": {"pick": "max", "measure": "depth_ratio", "pool": "all"},
      "right": {"pick": "closest_to_median", "measure": "depth_ratio", "pool": "all"},
      "pair_if": {"measure": "depth_ratio", "gap_at_least": 0.06},
      "arrow": {"label": "Depth", "views": ["side"], "anchor": {"landmarks": ["hip"], "back_offset": 0.06}},
      "picture": {"pick": "min", "measure": "depth_ratio", "pool": "all"}
    }
  },
  {
    "id": "depth_very_shallow", "topic": "depth", "kind": "flag", "flag": "depth_very_shallow", "views": ["side", "angled"], "measure": "depth_ratio",
    "test": {"type": "share_under", "threshold": -0.2, "skip_first": true, "min_with_data": 4},
    "requires_enough_reps": true, "status": "tested",
    "evidence": ["Fires on the labelled depth-fault clip (v1, -0.22 to -0.30), silent on the labelled depth-good clip (v2).", "The very shallow user_002 side clip also fires."],
    "comparison": {
      "mode": "pair", "labels": ["Your deepest rep", "A typical rep"],
      "left": {"pick": "max", "measure": "depth_ratio", "pool": "all"},
      "right": {"pick": "closest_to_median", "measure": "depth_ratio", "pool": "all"},
      "pair_if": {"measure": "depth_ratio", "gap_at_least": 0.06},
      "arrow": {"label": "Depth", "views": ["side"], "anchor": {"landmarks": ["hip"], "back_offset": 0.06}},
      "picture": {"pick": "min", "measure": "depth_ratio", "pool": "all"}
    }
  }
]
```

## 8. Selection: how rule results become a short screen

`min_reps` is the smallest set we give feedback on; the backend quality gate rejects under 3 reps before that. The first rep is skipped for the "share" rules when the set has more than `skip_first_rep_when_more_than` reps (it is often a warm-up). A rule needs `min_with_data` reps with a usable value before it may fire. The topic order is priority: safety first, then pace.

```json kinetic:selection
{
  "min_reps": 5,
  "min_with_data": 4,
  "skip_first_rep_when_more_than": 5,
  "majority_share": 0.5,
  "max_items_per_list": 2,
  "max_items_when_few_reps": 1,
  "max_words_per_line": 12,
  "work_on_order": ["chest_lean", "knee_tracking", "ankle_mobility", "pace_drift", "lowering_speed"],
  "went_well_order": ["depth", "ankle_mobility", "lowering_speed", "chest_lean"]
}
```

## 9. Visuals: the before/after video and the picture

The app plays the **user's own video twice side by side**, each copy jumping to a chosen rep. The server renders nothing. The backend only says which issue, which two reps, when each starts, bottoms out and ends, and where the arrow goes. Both copies **freeze together at the bottom of the rep** with an arrow and a short label, then play on; a note under the video repeats the first "Work on" line and its why. Each rule's `comparison` (section 7) chooses the reps with these picks and pools:

- **Picks:** `typical_early` (closest to the median of the person's early reps), `min`, `max`, `closest_to_median`, `middle`.
- **Pools:** `all`, `flagged` (the reps the rule flagged, or all if none), `after_first`, `first_third`, `last_third`. A pool with no usable value falls back to all reps.
- **Pair or single:** a pair needs two different reps, and `pair_if` can require a clear gap or ratio between them; otherwise one picture of the chosen rep is shown.
- **Key moment:** the frame with the smallest thigh angle in the rep (the bottom).
- **Needs** a browser-playable (H.264) video link, which the app's upload compression produces. If the video cannot play, the still picture (one arrow and a label, drawn on your own frame) is shown. With nothing to fix, the original video or plain picture is shown.
- **Not built yet:** a reference ("ideal vs yours") clip, narration, "how to correct" visuals.

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

Fixed lines under the results, spoken by the Listen button. The third reminder is the permanent pain line, shown separately. Depth cards: a very shallow depth shows "bodyweight first" even when there is something to work on; a short depth shows "sit a little lower" only when there is nothing else to work on. The frontend still holds copies of this text; the drift tests fail if they differ.

```json kinetic:screen
{
  "reminders": [
    "Breathe in as you lower, out as you stand up.",
    "Push the floor away to drive up. Power comes from your legs, not your knees."
  ],
  "pain_line": "You shouldn't feel this in your lower back. If you do, lighten the weight or stop.",
  "depth_cards": {
    "very_shallow": {
      "title": "Your squats were quite shallow.",
      "why": "Building range first makes every rep stronger and safer.",
      "cue": "Try bodyweight squats first, then add the weight back."
    },
    "short": {
      "title": "You could try sitting a little lower.",
      "why": "More range works your legs and glutes through more of the movement.",
      "cue": "Only if it feels comfortable, and keep it controlled: lower slowly, sit your hips back, keep your back steady, and push the floor away as you stand."
    }
  }
}
```

## 11. Progression

The AI still writes a form score and per-rep scores. They are not shown on the Analysis tab, but the Progression tab, history and the next-weight recommendation still use them. Progression ignores equipment, so a kettlebell user could be told a weight that does not exist (kettlebells come in fixed sizes). Not modelled in this spec yet.

```json kinetic:progression
{
  "status": "not_modelled",
  "notes": "Scores and the next-weight recommendation come from the AI's second call and ignore equipment. Moving the scores into code is a later change."
}
```

## 12. Not measured

```json kinetic:not_measured
[
  {"item": "Knee valgus from the old tracker (knee gap against shoulder width)", "reason": "the flag is true on both the faulty and the good clips"},
  {"item": "Knee gap divided by hip gap (the old reference rule, 0.95 or more)", "reason": "reads 1.6 to 2.9 for everyone in a 2D video, so it cannot separate good from faulty"},
  {"item": "Ascent speed and the pause at the bottom", "reason": "no validation yet"},
  {"item": "Hip height difference and lateral shift in cm", "reason": "cannot be measured in cm from a phone video"},
  {"item": "Butt wink, heel lift, neck and eye position, breathing", "reason": "MediaPipe cannot see them reliably"},
  {"item": "Foot turnout", "reason": "measured but never used"},
  {"item": "Endurance sets (light, fast, many reps)", "reason": "no clips, so no thresholds; the goal is fixed to strength"}
]
```

## 13. Evidence and tests

17 clips, all at **original speed**. The old `processed_videos` v1 to v6 files are saved at 3x speed and must never be used. Per-rep data from each clip is in `tests/golden/goblet-squat/reps/`, and `expected.json` records what the rules must say. `proof` lists, for each *tested* rule, a clip it fires on and a clip it stays silent on; the tests check every one. Run: `python3 -m unittest discover -s tests -t .` from the `backend` folder.

```json kinetic:evidence
{
  "golden_dir": "tests/golden/goblet-squat",
  "clips": [
    {"id": "v1_depth_fault", "view": "side", "reps": 7, "label": "depth fault", "source_recording": "Testing/videos/v1_depth_fault.mp4"},
    {"id": "v2_depth_good", "view": "side", "reps": 7, "label": "depth good", "source_recording": "Testing/videos/v2_depth_good.mp4"},
    {"id": "v3_knee_fault", "view": "front", "reps": 6, "label": "knee fault", "source_recording": "Testing/videos/v3_knee_fault.mp4"},
    {"id": "v4_knee_good", "view": "front", "reps": 6, "label": "knee good", "source_recording": "Testing/videos/v4_knee_good.mp4"},
    {"id": "v5_torso_fault", "view": "side", "reps": 8, "label": "torso fault", "source_recording": "Testing/videos/v5_torso_fault.mp4"},
    {"id": "v6_torso_good", "view": "side", "reps": 6, "label": "torso good", "source_recording": "Testing/videos/v6_torso_good.mp4"},
    {"id": "amrita_side_12.5", "view": "side", "reps": 10, "label": null, "source_recording": "Amrita_user_001_side_12.5kg.mp4", "true_rep_count": 10},
    {"id": "amrita_side_15", "view": "side", "reps": 11, "label": null, "source_recording": "Amrita_user_001_side_15kg.mp4"},
    {"id": "amrita_side_17.5", "view": "side", "reps": 9, "label": null, "source_recording": "Amrita_user_001_side_17.5kg.mp4", "true_rep_count": 9},
    {"id": "amrita_front_17.5", "view": "front", "reps": 8, "label": null, "source_recording": "Amrita_user_001_front_17.5.mp4"},
    {"id": "u2_side_4.5", "view": "side", "reps": 6, "label": null, "source_recording": "user_002_side_4.5kg.mov"},
    {"id": "u2_side_9.07", "view": "side", "reps": 6, "label": null, "source_recording": "user_002_side_9.07kg.mov"},
    {"id": "u2_front_11", "view": "front", "reps": 8, "label": null, "source_recording": "user_002_front_11.33kg.mov"},
    {"id": "u2_front_4.5", "view": "front", "reps": 6, "label": null, "source_recording": "user_002_front_4.5kg.mov"},
    {"id": "u3_video_1", "view": "front", "reps": 10, "label": null, "source_recording": "user_003_video_1.mp4"},
    {"id": "u3_video_2", "view": "front", "reps": 8, "label": null, "source_recording": "user_003_video_2.mp4"},
    {"id": "u3_video_3", "view": "front", "reps": 10, "label": null, "source_recording": "user_003_video_3.mp4"}
  ],
  "proof": [
    {"rule": "lean_high", "fires_on": "v5_torso_fault", "silent_on": "v6_torso_good"},
    {"rule": "lean_steady", "fires_on": "v6_torso_good", "silent_on": "v5_torso_fault"},
    {"rule": "knee_tracking", "fires_on": "v3_knee_fault", "silent_on": "v4_knee_good"},
    {"rule": "depth_good", "fires_on": "v2_depth_good", "silent_on": "v1_depth_fault"},
    {"rule": "depth_short", "fires_on": "v1_depth_fault", "silent_on": "v2_depth_good"},
    {"rule": "depth_very_shallow", "fires_on": "v1_depth_fault", "silent_on": "v2_depth_good"}
  ]
}
```

## 14. Decisions and change log

The product owner has not answered these yet; I used the recommendations and marked what is done. The goal is hard-coded to strength (section 2).

```json kinetic:decisions
{
  "open": [
    {"n": 1, "text": "One spec per exercise in a fixed structure, thresholds and wording read by the code", "recommended": "yes", "status": "done"},
    {"n": 2, "text": "The code computes the scores and the AI stops inventing them", "recommended": "yes", "status": "not done: later change"},
    {"n": 3, "text": "Keep the lean safety line at 45 degrees", "recommended": "yes", "status": "in place, tested but weak"},
    {"n": 4, "text": "Depth by hips against knees, not knee-angle bands", "recommended": "yes", "status": "in place"},
    {"n": 5, "text": "Add 'count two on the way down' to the fixed reminder instead of flagging 0.6 to 1.5 s lowerings", "recommended": "yes", "status": "not done: the reminder text is not agreed"},
    {"n": 6, "text": "Ankle: show the work-on, hide the praise until a trainer checks the 25 and 30 degree lines", "recommended": "yes", "status": "not done: the praise still shows"},
    {"n": 7, "text": "Knee tracking stays live as a labelled draft", "recommended": "keep", "status": "in place, weak"},
    {"n": 8, "text": "The old reference's drills stay as next-session drills; the penalty weights are dropped", "recommended": "yes", "status": "not done"},
    {"n": 9, "text": "A clean set autoplays the original video", "recommended": "yes", "status": "not done: shows the plain picture with a watch button"},
    {"n": 10, "text": "Copy 'Built for strength sets: 5 to 10 controlled reps' on the filming tips, and a note on the results screen", "recommended": "yes", "status": "waiting for the owner to approve the wording"},
    {"n": 11, "text": "On sets of 12 or more reps, skip the timing comments and keep the form comments", "recommended": "yes (draft guess)", "status": "waiting for the owner"}
  ],
  "changelog": [
    {"version": "1.0.0", "date": "2026-11-12", "text": "First spec: thresholds and wording moved out of the code."},
    {"version": "2.0.0", "date": "2026-11-12", "text": "13-section structure with a declarative rules list, a validator and a template. Goal profiles (strength only). Rule status draft, tested or validated."},
    {"version": "2.1.0", "date": "2026-11-12", "text": "New landmarks section (14 sections): which body points matter and how much, plus the visibility thresholds, recorded exactly as the video-quality check uses them today. Each measure now names the body parts it uses."}
  ]
}
```
