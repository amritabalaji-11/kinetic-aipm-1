"""The exercise registry: one ID links every module.

Each exercise lives in its own folder, `exercises/<exercise-id>/spec.md`. The spec is a document with the 13 sections listed in
`schema.SECTIONS`; each section carries one machine block (a fenced ```json kinetic:<section> block). This module finds the spec
for an ID, parses the blocks, validates them once, and tells the rest of the code which exercises exist.

The ID is the *movement slug* (for example `goblet-squat`), written with hyphens. A dumbbell and a kettlebell goblet squat are
different catalogue items but share the one ID, because the analysis never reads the equipment.

An unknown ID raises `UnknownExercise`; an unsupported goal raises `UnsupportedGoal`. Nothing here falls back to goblet squat:
judging a deadlift as a squat quietly is worse than saying "not supported yet".
"""
import copy
import json
import re
from functools import lru_cache
from pathlib import Path

from exercises.schema import SECTIONS

EXERCISES_DIR = Path(__file__).resolve().parent
_BLOCK = re.compile(r"```json kinetic:([a-z_]+)[ \t]*\n(.*?)\n```", re.DOTALL)

# Every module a finished exercise must have. The sections that make them up are all required by the validator; this list is
# what `readiness()` reports on (plus whether the golden test data exists on disk).
REQUIRED_MODULES = ("capture", "measures", "rep_counting", "rules", "visuals", "prompt_reference", "golden_tests")

# The goal every analysis is judged against today. Hard-coded on purpose: only strength has labelled clips.
DEFAULT_GOAL = "strength"


class UnknownExercise(ValueError):
    """The exercise is not in the registry (no spec for it)."""


class UnsupportedGoal(ValueError):
    """The training goal has no profile in this exercise's spec."""


class SpecError(ValueError):
    """The spec file is malformed or fails validation."""


def slug(name) -> str:
    """'Goblet Squat', 'goblet_squat' and 'goblet-squat' all become 'goblet-squat'."""
    return re.sub(r"[\s_]+", "-", str(name or "").strip().lower())


def parse_spec_text(text: str, source: str = "spec") -> dict:
    """{section: parsed block} from the text of a spec document. Raises SpecError on a missing, repeated or invalid block."""
    spec = {}
    for name, body in _BLOCK.findall(text):
        if name in spec:
            raise SpecError(f"{source}: section block 'kinetic:{name}' appears twice")
        try:
            spec[name] = json.loads(body)
        except json.JSONDecodeError as e:
            raise SpecError(f"{source}: block 'kinetic:{name}' is not valid JSON ({e})") from e
    return spec


def _read_spec_file(path: Path) -> dict:
    return parse_spec_text(path.read_text(encoding="utf-8"), source=str(path))


@lru_cache(maxsize=None)
def _index() -> dict:
    """{id or alias: id} for every exercise folder that has a spec."""
    found = {}
    for folder in sorted(EXERCISES_DIR.iterdir()):
        spec_path = folder / "spec.md"
        if folder.name.startswith("_") or not (folder.is_dir() and spec_path.exists()):
            continue
        identity = _read_spec_file(spec_path).get("identity")
        if not identity or identity.get("exercise_id") != folder.name:
            raise SpecError(f"{spec_path}: identity.exercise_id must equal the folder name {folder.name!r}")
        for name in [identity["exercise_id"], *identity.get("aliases", [])]:
            found[slug(name)] = identity["exercise_id"]
    return found


def known_ids() -> list:
    return sorted(set(_index().values()))


def canonical_id(name) -> str:
    """The exercise ID for a name or alias, or `UnknownExercise`."""
    exercise_id = _index().get(slug(name))
    if exercise_id is None:
        raise UnknownExercise(f"No spec for exercise {name!r}. Known exercises: {', '.join(known_ids()) or 'none'}")
    return exercise_id


@lru_cache(maxsize=None)
def _spec(exercise_id: str) -> dict:
    from exercises.validate import validate_spec  # imported here: validate.py imports this module's helpers

    spec = _read_spec_file(EXERCISES_DIR / exercise_id / "spec.md")
    errors = validate_spec(spec, folder=exercise_id)
    if errors:
        raise SpecError(f"exercises/{exercise_id}/spec.md is not valid:\n  - " + "\n  - ".join(errors))
    return spec


# ---- goal profiles ----

def _set_path(spec: dict, path: str, value) -> None:
    """Set 'selection.min_reps' or 'rules[lowering_quick].test.threshold' inside a spec."""
    node = spec
    parts = re.findall(r"[^.\[\]]+|\[[^\]]+\]", path)
    for i, part in enumerate(parts):
        last = i == len(parts) - 1
        if part.startswith("["):
            wanted = part[1:-1]
            matches = [item for item in node if isinstance(item, dict) and item.get("id") == wanted]
            if not matches:
                raise SpecError(f"override path {path!r}: nothing with id {wanted!r}")
            node = matches[0]
        elif last:
            node[part] = value
        else:
            node = node[part]


def get_spec(name, goal=None) -> dict:
    """The validated spec for an exercise (by ID or alias), resolved for a training goal (strength today). Treat as read-only.

    The base spec is the default goal's. Another supported goal's overrides are applied on a copy. A goal with no profile raises
    `UnsupportedGoal`; the caller decides what to tell the user, it is never quietly swapped for strength here.
    """
    base = _spec(canonical_id(name))
    profiles = base["goal_profiles"]
    goal = (goal or profiles["default"]).lower()
    if goal not in profiles["supported"]:
        reason = profiles.get("unsupported", {}).get(goal, "no profile")
        raise UnsupportedGoal(f"{base['identity']['exercise_id']} is not set up for the goal {goal!r} ({reason}). Supported: {', '.join(profiles['supported'])}")
    overrides = profiles.get("profiles", {}).get(goal, {}).get("overrides", {})
    if not overrides:
        return base
    resolved = copy.deepcopy(base)
    for path, value in overrides.items():
        _set_path(resolved, path, value)
    return resolved


def readiness(name) -> dict:
    """{module: True/False} for every required module. A module is present when its section is in the spec; the prompt
    reference and the golden test data must also exist on disk."""
    spec = get_spec(name)
    exercise_id = spec["identity"]["exercise_id"]
    backend = EXERCISES_DIR.parent
    golden = backend / "tests" / "golden" / exercise_id
    reference = backend / "coaching_references" / f"{spec['identity']['reference_file_stem']}_coaching_reference.md"
    result = {m: m in spec for m in REQUIRED_MODULES}
    result["prompt_reference"] = reference.exists()
    result["golden_tests"] = golden.is_dir() and (golden / "expected.json").exists()
    return result


def is_ai_ready(name) -> bool:
    """True only when the exercise is known, its spec is valid and every required module is present. The frontend's list should be
    derived from this."""
    try:
        return all(readiness(name).values())
    except (UnknownExercise, SpecError):
        return False
