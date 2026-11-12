# Adding an exercise

One **exercise ID** links every module. It is the *movement slug*, hyphenated (`goblet-squat`, `db-deadlift`). Equipment variants share the ID (a dumbbell and a kettlebell goblet squat are one ID); a new ID is needed when something would change the **rep counter, the measures, the rules or the key moment**.

Everything for an exercise starts in `exercises/<id>/spec.md`. Copy `goblet-squat/spec.md` and keep its sections in the same order.

## What is driven by the spec today, and what is not

| Module | Driven by the spec? | What a new exercise still needs |
|---|---|---|
| Exercise lookup, aliases, "is it ready?" | **yes** (`registry.py`) | nothing |
| Coaching rule **thresholds and wording** | **yes** (`services/coaching_signals.py` reads them) | the numbers in the spec |
| Rule **logic** (which measurement, which aggregation) | **no**: `compute_signals` is written for the squat | a rules function for the new exercise (or generalise the engine: see below) |
| Before/after **numbers and arrow labels** | **yes** (`services/comparison.py`) | the numbers; the choosing logic is squat-shaped (typical rep vs extreme rep) |
| Rep counting | **no**, but checked by a drift test | its own counter config and state machine if the movement is not a hip-angle cycle |
| MediaPipe measures (trackers) | **no**, but documented in the spec | trackers for the new exercise's measures |
| Prompt | the generic prompt plus `coaching_references/<stem>_coaching_reference.md` | a reference file |
| Recording tips, minimum reps (frontend) | **no**, checked by a drift test | the tips card and the constants |
| Frontend "AI ready" list (`AI_READY_MOVEMENTS`) | **no** | add the movement id only when `registry.is_ai_ready` would say yes |

## Checklist for a new exercise

1. **Feasibility first.** For every fault you want to catch, can MediaPipe see it from a phone? List each fault with the camera view that shows it and a grade (clear, weak, not visible). Drop what it cannot see.
2. **Write the spec** (`exercises/<id>/spec.md`): identity, camera and recording tips, measures, rep counting, rules (each with status *draft* or *validated* and its evidence), the before/after table, reminders, what is not measured, test clips, equipment notes.
3. **Rep counting.** Choose the signal to follow, where a rep starts (a deadlift starts at the bottom), what setup movements to ignore, one-sided exercises, timed holds.
4. **Label clips.** At least one clip per fault and one good clip per view, at **original speed** (never the old `processed_videos` files, which are 3x too fast), plus the person's own true rep count for a few. Store each clip's per-rep data in `tests/golden/<id>/reps/` and the expectations in `tests/golden/<id>/expected.json`.
5. **Make the tests pass:** `python3 -m unittest discover -s tests -t .` from `backend/`. A fault clip must be flagged and a good clip must not be.
6. **Trainer sign-off.** A rule is *validated* only after its labelled fault is flagged, its labelled good clip is not, and a trainer has agreed. Until then the spec says *draft* and the PR says so.
7. **Switch it on.** Set `status` in the spec, then add the movement id to the frontend list. Never before the golden tests pass.

## The "ready" standard

`registry.is_ai_ready(id)` is true only when the spec declares every required module and golden test data exists. It does not replace a trainer's review.

## Known gaps in the design (so nobody is surprised)

- `compute_signals` and `choose_comparison` are squat-shaped. A second exercise means either a second module with the same shape, or generalising them into a small rule engine driven by a `rules` list in the spec (metric, view, aggregation, threshold, wording). Do that when the second exercise shows what really differs.
- The stored `exercise_id` column in `analyses` still says `goblet_squat` (underscore). Changing it needs a check of everything that reads it.
- Weight progression ignores equipment.
