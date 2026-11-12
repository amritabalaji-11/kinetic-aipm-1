"""The structure every exercise spec must follow. One definition, used by the validator, the rule engine and the docs.

An exercise spec (`exercises/<id>/spec.md`) is a document with 13 numbered sections. Each section holds prose for people
and exactly one machine block, a fenced ```json kinetic:<section> block. The engine and the validator read only the blocks.
Adding an exercise means filling in the 13 sections; it must never need new engine code. If it does, this file is missing
a field or a word of vocabulary (add it here, once, and document it in SCHEMA.md).
"""

# The sections, in the order they must appear in the document.
SECTIONS = (
    "identity",        # who this is: ID, name, aliases, family, equipment variants, status, version, sign-off
    "goal_profiles",   # which training goals the rules are valid for (strength today), and per-goal overrides
    "capture",         # what the user is told before filming: views, tips, target reps
    "measures",        # named measurements: where each lives in the per-rep data, its unit, the views it works in
    "rep_counting",    # how reps are counted for this movement
    "rules",           # the coaching rules: what to flag or praise, how it is worded, what the before/after shows
    "selection",       # how rule results become a short screen: caps, order, majority share
    "visuals",         # before/after video and picture settings
    "screen",          # fixed reminders, pain line, depth cards
    "progression",     # load progression (not modelled yet)
    "not_measured",    # what is deliberately left out, and why
    "evidence",        # the clips and labels the rules were checked against
    "decisions",       # open questions and the change log
)

# Camera views. Spec rules name view GROUPS; `capture.views` says which concrete camera_view values each group contains.
VIEW_GROUPS = ("side", "angled", "front")
ANY_VIEW = "any"

SPEC_STATUSES = ("draft", "validated", "retired")
# draft     = no labelled clip proves the rule yet
# tested    = a labelled clip makes it fire and another labelled clip keeps it silent (evidence.proof, checked by the tests)
# validated = tested, and a trainer has signed the spec off (identity.trainer_signoff)
RULE_STATUSES = ("draft", "tested", "validated")
GOAL_STATUSES = ("active", "unsupported")

# A rule says what to say; `kind` says where it goes. A `flag` says nothing: it sets a named true/false for the app to use.
KINDS = ("work_on", "went_well", "flag")

# --- the test vocabulary: how a rule decides to fire. Keep this small; add a word only when a real exercise needs it. ---
# Every test is judged on the "considered" reps of the rule: all counted reps, minus the first rep when `skip_first` is set
# and the set has more reps than selection.skip_first_rep_when_more_than. Reps with no value for the measure are not counted.
TESTS = {
    # more than `share` of the considered reps are at or above / below the threshold
    "share_over": {"required": ("threshold",), "optional": ("skip_first", "min_with_data", "min_flagged", "share")},
    "share_under": {"required": ("threshold",), "optional": ("skip_first", "min_with_data", "min_flagged", "share")},
    # more than `share` of the reps are inside [min, max]; with `typical_within` the median must be inside too
    "share_between": {"required": ("min", "max"), "optional": ("typical_within", "skip_first", "min_with_data", "min_flagged", "share")},
    # the later reps are `growth` or more above the median of the person's own first `baseline_reps` reps
    "growth_vs_start": {"required": ("baseline_reps", "growth"), "optional": ("min_with_data", "min_flagged")},
    # the later reps are within `growth_max` of the person's own start (praise); reps within `margin` of it are listed
    "steady_vs_start": {"required": ("baseline_reps", "growth_max", "margin"), "optional": ("min_with_data",)},
    # the last third is `drop` or more below the first third, and no more than `last_over_first_max` of it
    "drop_over_thirds": {"required": ("drop", "last_over_first_max", "typical_min"), "optional": ("min_with_data",)},
}

RULE_FIELDS_REQUIRED = ("id", "topic", "kind", "views", "measure", "test", "status", "evidence")
RULE_FIELDS_OPTIONAL = ("group", "group_order", "requires_enough_reps", "flag", "wording", "comparison")

# --- how the before/after video and the still picture choose reps ---
PICKS = ("typical_early", "min", "max", "closest_to_median", "middle")
POOLS = ("all", "flagged", "after_first", "first_third", "last_third")
MODES = ("pair", "slow", "single")

# Landmarks an arrow may anchor to: name -> (left index, right index) in the pose. "knee_image_left" is the knee on the left of
# the picture (front view). Side views use the side nearest the camera.
LANDMARKS = {"nose": (0, 0), "shoulder": (11, 12), "hip": (23, 24), "knee": (25, 26), "ankle": (27, 28)}
FRONT_ANCHORS = ("knee_image_left",)

# Words that must never appear in anything the user reads (checked against all wording and screen text).
FORBIDDEN_PHRASES = ("stay tall", "chest up", "upright", "rounding", "go deeper", "deeper", "valgus", "dorsiflexion", "eccentric")

SEMVER = r"^\d+\.\d+\.\d+$"
