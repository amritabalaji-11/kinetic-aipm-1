# The exercise spec: structure and vocabulary

Every exercise Kinetic can check is one folder, `exercises/<exercise-id>/spec.md`, written to **one fixed structure**. The engine is shared and written once; an exercise is only data. If adding an exercise seems to need new engine code, the structure is missing a field or a word of vocabulary: add it here and in `schema.py`, once, for every exercise.

`exercises/schema.py` holds the definition the code uses. `exercises/validate.py` enforces it. This file explains it. The tests fail if they disagree.

Start from `exercises/_template/spec.md` (a valid, filled-in skeleton) and read `exercises/goblet-squat/spec.md` as the worked example.

## The exercise ID

The ID is the **movement slug**, lowercase and hyphenated (`goblet-squat`, `db-deadlift`). It is the folder name and `identity.exercise_id`. A dumbbell and a kettlebell goblet squat share one ID because the analysis never reads the equipment. Give something a **new ID** only if it would change the rep counter, the measures, the rules or the key moment. Unknown IDs and unsupported goals are errors, never quietly treated as another exercise.

## The file

A spec is a document with 13 numbered sections, **in this order**. Each section has prose for people and exactly one machine block, a fenced block whose first line is `json kinetic:<section>`. Only the blocks are read by code.

| # | Section | What it holds |
|---|---|---|
| 1 | `identity` | `exercise_id`, `name`, `spec_version` (like 1.0.0), `status` (`draft`, `validated` or `retired`), `family`, `aliases`, `equipment_variants` (catalogue id and equipment), `reference_file_stem` (the coaching reference file), `trainer_signoff` (null, or name and date), `updated` |
| 2 | `goal_profiles` | `default`, `supported` goals, `unsupported` goals with the reason, and `profiles`: for each supported goal, `overrides` (paths to change from the base spec). A goal that is not supported is refused. Strength is the only goal today. |
| 3 | `capture` | `preferred_view`, `views` (which camera_view values each view group holds), `target_reps`, `tips` (each a bold line and its reason), `view_notes` (what a view cannot show) |
| 4 | `measures` | The named measurements. Each has an `id`, `label`, `field` (where it is in the per-rep data, as `section.key`), `unit`, `views`, `definition` (landmarks and calculation), and optionally `valid_above` (values at or below it count as missing) |
| 5 | `rep_counting` | `counter` type, `signal`, `start_phase` (top or bottom), `partial_last_rep`, `unilateral`, `timed`, `thresholds`, `setup_outlier` |
| 6 | `rules` | The coaching rules (below) |
| 7 | `selection` | How rule results become a short screen: `min_reps`, `min_with_data`, `skip_first_rep_when_more_than`, `majority_share`, `max_items_per_list`, `max_items_when_few_reps`, `max_words_per_line`, `work_on_order`, `went_well_order` |
| 8 | `visuals` | `key_moment` (which frame field and min or max), `pad_seconds`, `freeze_seconds`, `slow_target_seconds`, `arrow_window_seconds`, `min_reps`, `single_label`, `picture_style`, `reference_clip` |
| 9 | `screen` | `reminders`, `pain_line`, `depth_cards` (a gentle "try next" and a "bodyweight first" card, or empty) |
| 10 | `progression` | `status` (not_modelled or modelled) and `notes` |
| 11 | `not_measured` | What is deliberately left out, each with the reason |
| 12 | `evidence` | `golden_dir`, the `clips` (id, view, reps, label, source recording, true rep count if known), and `proof` |
| 13 | `decisions` | `open` questions (number, text, recommendation, status) and the `changelog` (the last entry must match `identity.spec_version`) |

## Rules

A rule says what to say, and when. Every rule has:

- `id` (snake_case, unique), `topic` (what the user sees: the same topic can have a work-on rule and a went-well rule), `kind`, `views`, `measure`, `test`, `status`, `evidence`.
- `wording`: a work-on rule needs `headline`, `why` and `cue`; a went-well rule needs `headline`; a flag has none. Every line is at most `selection.max_words_per_line` words, contains no digits, and contains none of the forbidden phrases in `schema.py`.
- optionally `group` and `group_order`, `requires_enough_reps` (default true), `flag` (the name, for a flag rule), and `comparison`.

**Kinds.** `work_on` goes in "Work on". `went_well` goes in "What went well". A `flag` says nothing: it sets a named true or false (for example `depth_short`) for the app to act on.

**Status.** `draft`: no labelled clip proves the rule. `tested`: `evidence.proof` names a clip it fires on and a clip it stays silent on, and the tests check it. `validated`: tested, and a trainer has signed the spec off (`identity.trainer_signoff`).

**Groups.** Rules in the same group are tried in `group_order`; the first one that fires wins and the rest are skipped. A topic with both a work-on and a went-well rule must put them in one group, so a topic can never be in both lists.

**Views.** A rule names view groups (`side`, `angled`, `front`) or `any`. `capture.views` says which camera_view values each group contains.

### The test vocabulary

Every test judges the reps the rule considers: all counted reps, minus the first when `skip_first` is set and the set has more reps than `selection.skip_first_rep_when_more_than`. Reps with no usable value are not counted. A rule needs `min_with_data` reps with a value (default `selection.min_with_data`) before it can fire. Keep this list small; add a word only when a real exercise needs one.

| Test | Fires when |
|---|---|
| `share_over` | more than `share` (default `selection.majority_share`) of the considered reps are at or above `threshold`, and at least `min_flagged` |
| `share_under` | the same, for reps strictly below `threshold` |
| `share_between` | the same, for reps between `min` and `max` (and, with `typical_within`, the median is too) |
| `growth_vs_start` | the later reps are `growth` or more above the median of the person's own first `baseline_reps` reps, on at least `min_flagged` reps. "Later" is the second half of the set, but never reps that make up the start |
| `steady_vs_start` | the later reps are within `growth_max` of the person's own start; the reps within `margin` of it are listed |
| `drop_over_thirds` | the last third is `drop` or more below the first third and at most `last_over_first_max` of it, and the typical value is at least `typical_min` |

### The comparison (before/after video and picture)

A rule can carry a `comparison` that says what the before/after video and the still picture show when that rule is the focus (the first work-on item, or the first flag that fired).

- `mode`: `pair` (two reps side by side), `slow` (one rep at real speed next to the same rep slowed), or `single` (one picture).
- `labels`: the two captions, `[left, right]`.
- `left`, `right`: a pick of `{pick, measure, pool}`. Picks: `typical_early`, `min`, `max`, `closest_to_median`, `middle`. Pools: `all`, `flagged`, `after_first`, `first_third`, `last_third`.
- `pair_if`: the pair is only shown if the two reps differ clearly on a measure (`gap_at_least` or `ratio_at_least`); otherwise one picture is shown, using `else_single` if given.
- `arrow`: a short label (1 to 3 words), which view groups it applies to, and an `anchor`: one or two landmarks (`nose`, `shoulder`, `hip`, `knee`, `ankle`, or `knee_image_left` for the front view), `t` between them, offsets, and which side the tail comes from.
- `picture`: which rep the still picture shows (a pick).

## Statuses and sign-off at a glance

A new spec starts as `draft`. Label clips at **original speed**, store their per-rep data in `tests/golden/<id>/`, add `proof` entries, and mark rules `tested`. Only a trainer's sign-off (in `identity.trainer_signoff`) allows `validated`.

## Checking a spec

```
python3 -m unittest discover -s tests -t .      # from the backend folder
```

The validator runs whenever a spec is first loaded, so an invalid spec stops the backend at start-up instead of failing in the middle of an analysis.
