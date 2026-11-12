# Goblet Squat — exercise spec

| | |
|---|---|
| **Exercise ID** | `goblet-squat` (the movement slug; the same one the catalogue uses in its `movement` field) |
| **Spec version** | 1.0.0 |
| **Status** | **draft**: no trainer sign-off yet. Rules marked *draft* below rest on very few labelled clips. |
| **Equipment variants** | DB Goblet Squat (`ex_001`) and KB Goblet Squat (`ex_049`) share this one spec. See section 12. |
| **Family** | squat |
| **Last updated** | 2026-11-12 |

This file is the **single source of truth** for how Kinetic checks a goblet squat: what to film, what we measure, how reps are counted, what we are allowed to say, and what the video and picture show. A second exercise copies this structure (see `../README.md`).

## 0. How the code uses this file

- The block in section 1 (`kinetic-spec`) is **read by the code** at start-up (`exercises/registry.py`). The coaching rules (`services/coaching_signals.py`) and the before/after chooser (`services/comparison.py`) take their thresholds and wording from it. Change a number there, not in the code.
- Some numbers live in code that is not yet driven by this file (the rep counter, the trackers, the frontend). They are written down here too, and **drift tests** (`tests/test_spec_drift.py`) fail if the code and this file disagree.
- **Golden tests** (`tests/golden/goblet-squat/`) replay 17 real clips through the rules and fail if a result changes without this file changing. See section 11.
- Anything you read here that is marked *decision* is waiting for the product owner.

## 1. Machine-readable rules

```json kinetic-spec
{
  "exercise_id": "goblet-squat",
  "spec_version": "1.0.0",
  "status": "draft",
  "family": "squat",
  "aliases": ["goblet_squat", "goblet squat", "db goblet squat", "kb goblet squat"],
  "reference_file_stem": "goblet_squat",
  "views": {
    "side": ["side_left", "side_right"],
    "angled": ["angled"],
    "front": ["front"]
  },
  "modules": {
    "recording_tips": true,
    "measures": true,
    "rep_counting": true,
    "rules": true,
    "visuals": true,
    "prompt_reference": true,
    "golden_tests": true
  },
  "rules": {
    "min_reps": 5,
    "min_reps_with_data": 4,
    "skip_first_rep_when_more_than": 5,
    "max_items_per_list": 2,
    "max_items_when_few_reps": 1,
    "max_words_per_line": 12,
    "lean": {
      "baseline_reps": 3,
      "growth_deg": 5.0,
      "high_deg": 45.0,
      "steady_growth_max_deg": 2.0,
      "steady_rep_margin_deg": 4.0,
      "flag_min_reps": 2
    },
    "lowering": {
      "quick_seconds": 0.6,
      "controlled_min_seconds": 1.5,
      "controlled_max_seconds": 4.5,
      "pace_drop_seconds": 0.3,
      "pace_last_over_first_max": 0.75,
      "quick_min_reps": 2
    },
    "ankle": {"good_deg": 30.0, "limited_deg": 25.0},
    "depth": {"good_ratio": -0.08, "very_shallow_ratio": -0.2},
    "knees": {"inward_ratio": 1.15},
    "work_on_order": ["chest_lean", "knee_tracking", "ankle_mobility", "pace_drift", "lowering_speed"],
    "went_well_order": ["depth", "ankle_mobility", "lowering_speed", "chest_lean"]
  },
  "wording": {
    "work_on": {
      "chest_lean": {
        "headline": "You leaned further forward as the set went on.",
        "why": "More forward lean loads your lower back.",
        "cue": "Sit your hips back as you lower."
      },
      "chest_lean_high": {
        "headline": "You leaned well forward on most reps.",
        "why": "More forward lean loads your lower back.",
        "cue": "Sit your hips back as you lower."
      },
      "knee_tracking": {
        "headline": "Your knees drifted inward as you lowered.",
        "why": "Knees caving in loads the inside of the knee.",
        "cue": "Push your knees out over your little toes."
      },
      "ankle_mobility": {
        "headline": "Your ankle mobility looked limited.",
        "why": "Limited ankle range pushes the knees in or the body forward.",
        "cue": "Keep your whole foot on the floor."
      },
      "pace_drift": {
        "headline": "You rushed more as the set went on.",
        "why": "Rushing costs you control at the bottom.",
        "cue": "Count to two on every lowering."
      },
      "lowering_speed": {
        "headline": "You dropped into the squat on most reps.",
        "why": "Dropping fast means less control at the bottom.",
        "cue": "Lower for about two seconds."
      }
    },
    "went_well": {
      "depth": {"headline": "Your depth was consistent."},
      "ankle_mobility": {"headline": "Your ankle mobility was good."},
      "lowering_speed": {"headline": "You lowered with control."},
      "chest_lean": {"headline": "Your torso position stayed steady."}
    }
  },
  "comparison": {
    "min_reps": 4,
    "pad_seconds": 0.35,
    "arrow_window_seconds": 0.4,
    "slow_target_seconds": 2.0,
    "min_ankle_diff_deg": 5.0,
    "min_depth_diff_ratio": 0.06,
    "min_knee_travel_ratio": 1.5,
    "arrow_labels": {
      "chest_lean": "Torso lean",
      "ankle_mobility": "Ankle mobility",
      "depth": "Depth",
      "knee_tracking": "Knees in"
    }
  },
  "rep_counting": {
    "signal": "hip_angle",
    "threshold_down": 150,
    "threshold_up": 155,
    "min_bottom_hold": 1,
    "threshold_deep": 120,
    "turnaround_min_peak": 135,
    "turnaround_drop": 8,
    "ascent_rise": 30,
    "setup_outlier": {"lean_deg": 30.0, "knee_deg": 35.0, "hands_share": 0.45}
  },
  "reminders": [
    "Breathe in as you lower, out as you stand up.",
    "Push the floor away to drive up. Power comes from your legs, not your knees.",
    "You shouldn't feel this in your lower back. If you do, lighten the weight or stop."
  ],
  "screen": {
    "frontend_min_reps": 5,
    "frontend_quick_below_seconds": 0.6,
    "freeze_seconds": 1.6
  }
}
```

## 2. Camera and recording

**What we tell the user before they film** (the "filming tips" card on the upload screen):

1. **Side view**, so we can see your back, hip and knee angles.
2. **Head to toe** in the frame, just you.
3. **5 to 10 reps**: at least 5, or we can't tell a pattern from a one-off.

If a clip has fewer than 5 reps, the results screen says so and the upload screen asks for another video. (The backend quality gate already rejects fewer than 3 outright, before any analysis; 3 or 4 reps are analysed and then the screen asks for another video.)

**Which view allows which check:**

| Check | Side | Angled | Front |
|---|---|---|---|
| Torso lean | yes | no | no |
| Depth (hips against knees) | yes | yes | no |
| Ankle range | yes | no | no |
| Knee tracking | no | no | yes (draft) |
| Lowering speed and pace | yes | yes | yes |

From the front, lean, depth and ankle range cannot be judged reliably, so the screen says "Filmed from the front, we check your knees and timing. Film from the side to get feedback on lean, depth and ankle range."

**Not yet built (future):** a check at upload that the whole body is in frame, the lighting is OK and the video is upright, before we spend analysis time.

## 3. What we measure (MediaPipe)

| Measure | How it is computed | Views | Used for |
|---|---|---|---|
| Pose | MediaPipe pose landmarker (heavy model), every 3rd frame of a 30 fps copy. A landmark under 0.70 visibility is ignored. | all | everything |
| Camera view | detected from the pose; the most common view in the clip is used | all | which rules are allowed |
| Hip angle | angle at the hip between shoulder and knee, averaged left and right, smoothed (EMA 0.4) | side, angled | rep counting |
| Thigh angle ("knee angle" in the data) | thigh's angle from vertical. It is **not** the knee joint angle. | side, angled | information only |
| Torso lean at the bottom | torso's angle from vertical at the lowest point of the rep | side | lean rules |
| Ankle range at the bottom | shin's angle from vertical (a stand-in for ankle dorsiflexion) | side | ankle rules |
| Depth | `hip_below_knee_ratio`: how far the hips are below the knees, as a share of the upright torso length (positive = hips lower than knees). Works from the side and from an angle. | side, angled | depth flags |
| Lowering time | movement versus stillness: speed under 15% of the rep's top speed counts as "still"; the "near top/bottom" zone is 25% of the range; ranges under 20 degrees are ignored | all | speed rules |
| Knee gap ÷ ankle gap at the bottom | horizontal distance between the knees divided by the distance between the ankles, at the frames where the hips are lowest | front | knee tracking |
| Knee travel | summed frame-to-frame change of knee gap ÷ ankle gap over the rep | front | choosing which two reps to show (never used to decide whether to give feedback) |

**Why these and not others:** the trainer's guidance was that fixed angles vary with mobility, so rules compare a person with **their own start of set** wherever possible, and use cues (tempo, bracing, breathing) rather than angle targets.

## 4. Counting reps

A rep is a hip-angle cycle: standing → descending → bottom → ascending → standing.

- Down starts when the hip angle drops under **150°**; the rep finishes when it climbs back over **155°**.
- **Quick sets:** a rep also finishes when the person turns round on the way up without fully standing, if the hip angle had climbed to at least 135° and then fell 8° from its peak.
- **Leaners:** coming up is also recognised when the hip angle has risen **30°** from this rep's own lowest point, because people who lean forward never open past 150°.
- **Setup and pick-up movements** (picking the weight up, putting it down) are removed by testing each counted rep against the set's own typical rep: lean at the bottom more than 30° away from the set median, or knee more than 35° straighter, or the share of time the hands are above the hips far below the median (0.45).
- A **cut-off last squat** is kept and marked `partial`; partial reps are not used by the rules or the before/after.
- The **first rep is skipped** for depth, ankle and knee checks when there are more than 5 reps (it is often a warm-up).

**Checked against:** the person's own true counts, 10 (side, 12.5 kg) and 9 (side, 17.5 kg), both match. An independent hip-height peak count agrees with the pipeline on the other clips except v3 and v6, where the independent count said 7 and 8 and the pipeline said 6 and 6; no true count exists for those two, so they are unresolved.

**Known limits:** the rep counter is tuned for squats (hip angle). Exercises that start at the bottom (deadlift), are one-sided, or are timed holds need their own counting config (see `../README.md`).

## 5. Coaching rules

**The rules every exercise shares** (these are engine rules, not goblet-specific):

1. **Code decides what can be said; the AI only words it.** The AI may use only the points the code allows, with the rep lists the code gives.
2. A point is **praised or flagged only if it held on more than half the reps considered.**
3. **One topic appears in one list only** (never both "went well" and "work on").
4. **At most 2 items per list** (1 if fewer than 5 reps). Never padded: an empty list is fine, and an empty "work on" with praise shows "You did great!".
5. **Trend language, no rep numbers, no scores** in anything the user reads. Every line is short (10 words on screen, 12 allowed from the code).
6. **Never** say "chest up", "stay tall" or "upright"; never claim the back is "rounding" (we cannot see it); never tell anyone to go deeper.

**The goblet-squat rules:**

| Topic | Kind | Views | Fires when | Status | Evidence |
|---|---|---|---|---|---|
| `chest_lean` (growth) | work on | side | the later reps lean 5° or more further than the person's own first 3 reps, on at least 2 reps. "Later" is the second half of the set, but never reps that are part of the first 3 (so in a 5-rep set it is the last 2). | **draft** | v5 torso-fault clip before it was found to be a constant lean. No clip with exactly 5 reps has been tested. |
| `chest_lean` (high) | work on | side | the lean is 45° or more on more than half the reps after the first (and at least 2) | **draft** | median lean after rep 1: 29–31° for the good torso clip and Amrita's side clips, 38° v2, 41–48° user_002, 46° v1, 50° v5 (torso fault) |
| `chest_lean` | went well | side | lean grew by 2° or less and the reps stayed within 4° of the person's own start | draft | the good torso clip reads 30° throughout |
| `knee_tracking` | work on | front | the knee-to-ankle gap ratio at the bottom is under 1.15 on more than half the reps (first rep skipped) | **draft, weak** | fault clip 1.06–1.15, good clip 1.17–1.26, user_002 1.02–1.08, user_003 1.5+. One labelled fault clip only; the gap to the good clip is about 0.02 |
| `ankle_mobility` | work on | side | under 25° on more than half the reps | **draft** | no labelled ankle clips; cut-offs from the old reference |
| `ankle_mobility` | went well | side | 30° or more on more than half the reps | draft | as above |
| `pace_drift` | work on | any | the last third of the reps are at least 0.3 s quicker than the first third and at most 0.75 of it | draft | none seen yet |
| `lowering_speed` | work on | any | lowering under 0.6 s on more than half the reps (at least 2) | **draft, unproven** | no real-speed clip is that fast (real clips lower in 0.7–1.3 s). The 0.6 s figure was first set from clips that had been saved at 3x speed. |
| `lowering_speed` | went well | any | typical lowering between 1.5 and 4.5 s on more than half the reps | draft | none of the 17 clips reaches 1.5 s |
| `depth` | went well | side, angled | hips at or below 0.08 *above* the knees on more than half the reps | validated against 3 human labels | good-depth sets sit at +0.1 to +0.2; a labelled "depth good" clip at about 0; a labelled "depth fault" clip at −0.26 |
| depth flag: short | (screen decides) | side, angled | more than half the reps are short of that line | as above | shows "Try next: sit a little lower" only if there is nothing to work on |
| depth flag: very shallow | (screen decides) | side, angled | more than half the reps are under −0.20 | as above | shows "bodyweight first" |

**Depth is never a "work on".** A short depth shows a gentle "Try next" card; a very shallow depth shows "Your squats were quite shallow. Try bodyweight squats first, then add the weight back."

**Fixed coach's reminder** (shown on every goblet-squat result, spoken by the Listen button): see `reminders` in section 1. The third line is the permanent pain line.

## 6. The results screen

- **Top:** the before/after video (section 7), or the plain picture when nothing needs fixing, with "▶ Watch the whole set".
- **Under it:** "What went well" and "Work on" (each item: headline, one-line why for work-on items, a dot strip with one dot per rep, and a Listen button), then the coach's reminder, then the per-rep lowering chart.
- **Cards:** "Try next" (depth), a gentle weight nudge when earned, and a "Film another video" card when there are fewer than 5 reps.
- **Not shown:** scores, rep numbers, degree numbers, ideal ranges.

## 7. The before/after video and the picture

The app plays the **user's own video twice side by side**, each copy jumping to a chosen rep. The server renders nothing. The backend only says *which issue, which two reps, when each starts, bottoms out and ends, and where the arrow goes*. Both copies **freeze together at the bottom of the rep for about 1.6 s** with an arrow and a short label, then play on. A note under the video repeats the first "Work on" line and its why.

| Focus (first "work on", or depth) | Left | Right | Arrow label and target |
|---|---|---|---|
| `chest_lean` (growth) | a typical early rep | the most-leaned rep | "Torso lean", between shoulder and hip |
| `chest_lean` (high) | the least-leaned rep after rep 1 | the most-leaned rep | same |
| `lowering_speed` | a typical rep at real speed | the same rep with the lowering slowed to 2 s, with a 1-2 count | none |
| `pace_drift` | a typical early rep | the fastest-lowered rep | none |
| `ankle_mobility` | the best rep | a typical rep (one picture if under 5° apart) | "Ankle mobility", on the shin |
| `depth` | the deepest rep | a typical rep (one picture if under 0.06 apart) | "Depth", at the hip |
| `knee_tracking` | the steadiest rep (knees move least) | the rep where the knees move most, if at least 1.5x as much; otherwise one typical rep | "Knees in", on the left knee |
| nothing to fix | none: the original video | | |

**Key moment:** the bottom of the rep (the lowest hip position). Arrows appear on side views for lean, ankle and depth, and on the front view for knees.

**Needs:** a browser-playable (H.264) video link, which the app's upload compression produces. If the video cannot play, the still picture (one arrow and a label, drawn on your own frame by `focus_overlay.py`) is shown.

**Not built yet:** an "ideal vs yours" reference clip (the website's Short can only be embedded, not processed), narration, and "how to correct" visuals.

## 8. The old coaching reference

`coaching_references/goblet_squat_coaching_reference.md` is still injected into the AI's prompt. It holds the root-cause notes (RC1–RC5), drills, and an old scoring system. For the user-facing text its "feedback overrides" block wins. **Superseded and not used by the rules:** the fixed angle bands, the weighted penalty system, and the valgus ratio rule (knee gap ÷ hip gap of 0.95 or more, which reads 1.6–2.9 for everyone in a 2D video, so it cannot separate good from faulty). RC1–RC5 and the drills stay as next-session advice. *Decision (recommended): fold the drills into this spec and retire the rest in the next PR.*

## 9. Scores and progression

The AI still writes a form score and per-rep scores. They are **not shown** on the Analysis tab, but the **Progression** tab, history and the next-weight recommendation still use them. *Decision (recommended): the code computes the scores from these same rules so the AI stops inventing them.* Not done in this PR. The progression logic ignores equipment, so a kettlebell user could be told a weight that does not exist (see section 12).

## 10. Measured but not used, and not measured

| Item | Why not used |
|---|---|
| Knee valgus from the old tracker (knee gap against shoulder width) | the flag is true on both faulty and good clips |
| Ascent speed, pause at the bottom | no validation yet |
| Hip height difference, lateral shift in cm | cannot be measured in cm from a phone video |
| Butt wink, heel lift, neck and eye position, breathing | MediaPipe cannot see them reliably |
| Foot turnout | measured, never used |

## 11. Test clips and the golden tests

17 clips, all at **original speed** (the old `processed_videos` v1–v6 files are saved at 3x speed and must never be used). Per-rep data from each clip is stored in `tests/golden/goblet-squat/reps/`; `expected.json` holds what the rules must say.

| Clip | View | Reps | Human label |
|---|---|---|---|
| v1_depth_fault | side | 7 | depth fault |
| v2_depth_good | side | 7 | depth good |
| v3_knee_fault | front | 6 | knee fault |
| v4_knee_good | front | 6 | knee good |
| v5_torso_fault | side | 8 | torso fault |
| v6_torso_good | side | 6 | torso good |
| amrita_side_12.5 | side | 10 | true count 10 |
| amrita_side_15 | side | 11 | |
| amrita_side_17.5 | side | 9 | true count 9 |
| amrita_front_17.5 | front | 8 | |
| u2_side_4.5 | side | 6 | |
| u2_side_9.07 | side | 6 | |
| u2_front_11 | front | 8 | |
| u2_front_4.5 | front | 6 | |
| u3_video_1 | front | 10 | |
| u3_video_2 | front | 8 | |
| u3_video_3 | front | 10 | |

Run: `python3 -m unittest discover -s tests -v` from the `backend` folder.

**A rule is only "validated" when** its labelled fault clip is flagged, its labelled good clip is not, and a trainer has signed it off. Today only depth has labels; everything else stays *draft*.

## 12. Equipment variants

The DB and KB goblet squat share this spec: the analysis never reads the equipment. Three things do differ and are **not** yet handled: (1) weight suggestions (kettlebells come in fixed sizes), (2) the how-to-hold wording in the guide and audio, (3) we have no labelled kettlebell clip, so the pose model's behaviour with a hanging bell is untested. **When to split into a new slug:** if something would change the rep counter, the measures, the rules or the key moment. A barbell front squat is a new slug; a kettlebell goblet squat is not.

## 13. Decision log (waiting for the product owner)

| # | Decision | Recommended | Status |
|---|---|---|---|
| 1 | One spec per exercise, thresholds read by the code | yes | done in this PR |
| 2 | Code computes the scores, the AI stops inventing them | yes | **not done**, later PR |
| 3 | Keep the 45° lean safety line | yes | in place, draft |
| 4 | Depth by hips against knees, not knee-angle bands | yes | in place |
| 5 | Add "count two on the way down" to the fixed reminder instead of flagging 0.6–1.5 s lowerings | yes | **not done** (needs the reminder text agreed) |
| 6 | Ankle: show work-on, hide the praise until a trainer checks 25°/30° | yes | **not done** (praise still shows) |
| 7 | Knee tracking stays live as a labelled draft | keep | in place, weak |
| 8 | RC1–RC5 kept as next-session drills only | yes | not done |
| 9 | A clean set autoplays the original video | yes | **not done** (shows the plain picture with a watch button) |

## 14. Change log

- **1.0.0 (2026-11-12):** first spec. Thresholds and wording moved out of code into this file; drift and golden tests added.
