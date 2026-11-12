"""The exercise registry: one exercise ID links every module.

Each exercise lives in its own folder, `exercises/<exercise-id>/spec.md`. The spec is a human-readable document with one
machine-readable block (a fenced ```json kinetic-spec block). This module finds the spec for an ID, parses that block, and
tells the rest of the code which exercises exist and whether each one has everything it needs.

The ID is the *movement slug* (for example `goblet-squat`), written with hyphens. A dumbbell and a kettlebell goblet squat
are different catalogue items but share the one ID, because the analysis never reads the equipment.

An unknown ID raises `UnknownExercise`. Nothing here falls back to goblet squat: judging a deadlift as a squat quietly is
worse than saying "not supported yet".
"""
import json
import re
from functools import lru_cache
from pathlib import Path

EXERCISES_DIR = Path(__file__).resolve().parent
_BLOCK = re.compile(r"```json kinetic-spec\s*\n(.*?)\n```", re.DOTALL)

# Every module a finished exercise must have. The spec's "modules" block says which are done.
REQUIRED_MODULES = ("recording_tips", "measures", "rep_counting", "rules", "visuals", "prompt_reference", "golden_tests")


class UnknownExercise(ValueError):
    """The exercise is not in the registry (no spec for it)."""


def slug(name) -> str:
    """'Goblet Squat', 'goblet_squat' and 'goblet-squat' all become 'goblet-squat'."""
    return re.sub(r"[\s_]+", "-", str(name or "").strip().lower())


def _read_spec_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = _BLOCK.search(text)
    if not match:
        raise ValueError(f"{path}: no ```json kinetic-spec block found")
    spec = json.loads(match.group(1))
    if spec.get("exercise_id") != path.parent.name:
        raise ValueError(f"{path}: exercise_id {spec.get('exercise_id')!r} does not match its folder {path.parent.name!r}")
    return spec


@lru_cache(maxsize=None)
def _index() -> dict:
    """{id or alias: id} for every exercise folder that has a spec."""
    found = {}
    for folder in sorted(EXERCISES_DIR.iterdir()):
        spec_path = folder / "spec.md"
        if not (folder.is_dir() and spec_path.exists()):
            continue
        spec = _read_spec_file(spec_path)
        for name in [spec["exercise_id"], *spec.get("aliases", [])]:
            found[slug(name)] = spec["exercise_id"]
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
    return _read_spec_file(EXERCISES_DIR / exercise_id / "spec.md")


def get_spec(name) -> dict:
    """The parsed `kinetic-spec` block for an exercise (by ID or alias). Treat it as read-only."""
    return _spec(canonical_id(name))


def readiness(name) -> dict:
    """{module: True/False} for every required module, plus whether the golden test data exists on disk."""
    exercise_id = canonical_id(name)
    declared = _spec(exercise_id).get("modules", {})
    result = {m: bool(declared.get(m)) for m in REQUIRED_MODULES}
    golden = EXERCISES_DIR.parent / "tests" / "golden" / exercise_id
    result["golden_tests"] = result["golden_tests"] and golden.is_dir() and any(golden.rglob("*.json"))
    return result


def is_ai_ready(name) -> bool:
    """True only when the exercise is known and every required module is present. The frontend's list should be derived from this."""
    try:
        return all(readiness(name).values())
    except UnknownExercise:
        return False
