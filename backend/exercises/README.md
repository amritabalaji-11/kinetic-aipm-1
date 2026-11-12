# Adding an exercise

One **exercise ID** links every module. It is the *movement slug*, hyphenated (`goblet-squat`, `db-deadlift`). The full structure, field by field, is in **`SCHEMA.md`**; the definition the code uses is `schema.py`; `validate.py` enforces it. Read `goblet-squat/spec.md` as the worked example and copy `_template/` to start.

## What is generic today, and what is not

| Part | Generic? | Where | What a new exercise still needs |
|---|---|---|---|
| Exercise lookup, aliases, goals, "is it ready?" | yes | `registry.py` | nothing |
| Structure and checks on every spec | yes | `schema.py`, `validate.py` | a spec that passes |
| Coaching rules (what to flag or praise, on which reps) | **yes** | `services/rule_engine.py` reads the spec's `rules` | rules written in the spec's test vocabulary |
| Wording, caps, order, the "one topic in one list" rule | yes | the spec's `selection` and `apply_signals` | the wording |
| Before/after video and picture (which reps, arrow, labels) | **yes** | `services/comparison.py`, `rep_picking.py`, `focus_overlay.py` read each rule's `comparison` | a `comparison` on each rule |
| Rep counting | **no** | `mediapipe_code/mp_utils/trackers/rep_counter.py` (hip-angle cycle for squats) | its own counter if the movement is not a hip-angle cycle (a deadlift starts at the bottom, one-sided and timed exercises) |
| MediaPipe measures | **no** | `landmark_framework.py` and the trackers write the per-rep data | trackers for any measure the spec names that does not exist yet |
| Prompt | the generic prompt plus the exercise's coaching reference | `prompts/`, `coaching_references/` | a reference file |
| Frontend: filming tips, minimum reps, reminders, depth cards, front-view note | **no**: copies, checked by drift tests | `frontend/src/...` | the same text in the frontend, until it is served from the spec |
| Frontend "AI ready" list (`AI_READY_MOVEMENTS`) | **no** | `frontend/src/utils/analysableExercises.js` | the movement id, only once `is_ai_ready` would say yes |

## Checklist for a new exercise

1. **Feasibility first.** For every fault you want to catch, can MediaPipe see it from a phone? List each fault with the camera view that shows it and a grade (clear, weak, not visible). Drop what it cannot see.
2. **Copy `_template/` to `exercises/<id>/` and fill in the 13 sections.** The template is valid as it stands, so the validator tells you what is missing as you go.
3. **Rep counting.** Choose the signal to follow, where a rep starts, what setup movements to ignore, one-sided exercises, timed holds. If the existing counter does not fit, that is new code, not spec.
4. **Label clips at original speed** (never a sped-up or re-processed copy). Store each clip's per-rep data in `tests/golden/<id>/reps/<clip>.json`, the expectations in `expected.json`, and list the clips and `proof` in the spec's `evidence`.
5. **Make the tests pass:** `python3 -m unittest discover -s tests -t .` from `backend/`. A rule is `tested` only when `proof` names a clip it fires on and a clip it stays silent on.
6. **Trainer sign-off.** `validated` needs `identity.trainer_signoff`. Until then the spec says `draft` or `tested`, and the PR says so.
7. **Switch it on.** Add the movement id to the frontend list, only after the tests pass.

## Known gaps (so nobody is surprised)

- Rep counting and the MediaPipe trackers are still squat-shaped (the table above).
- The stored `exercise_id` column on the analysis row still says `goblet_squat` (underscore). Changing it needs a check of everything that reads it.
- The AI still writes the scores that progression and history use. Moving them into code is planned, not done.
- Weight progression ignores equipment (a kettlebell user could be told a weight that does not exist).
- Only the strength goal exists. A new goal needs labelled clips and a profile in `goal_profiles`.
