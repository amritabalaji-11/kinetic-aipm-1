"""The exercise registry: one ID links every module, goals are explicit, and an unknown exercise is a loud error."""
import copy
import unittest

from exercises import registry
from exercises.schema import SECTIONS


class RegistryTests(unittest.TestCase):
    def test_goblet_squat_is_known_and_ready(self):
        self.assertIn("goblet-squat", registry.known_ids())
        self.assertTrue(registry.is_ai_ready("goblet-squat"))
        self.assertTrue(all(registry.readiness("goblet-squat").values()))

    def test_names_and_aliases_resolve_to_one_id(self):
        for name in ("goblet-squat", "goblet_squat", "Goblet Squat", " GOBLET-SQUAT ", "DB Goblet Squat", "kb goblet squat"):
            self.assertEqual(registry.canonical_id(name), "goblet-squat", name)

    def test_unknown_exercise_is_a_loud_error(self):
        for name in ("deadlift", "barbell-row", "", None, "goblet-squat-2"):
            with self.assertRaises(registry.UnknownExercise, msg=repr(name)):
                registry.canonical_id(name)
        self.assertFalse(registry.is_ai_ready("deadlift"))

    def test_template_folder_is_never_registered(self):
        self.assertNotIn("new-exercise", registry.known_ids())
        with self.assertRaises(registry.UnknownExercise):
            registry.canonical_id("new-exercise")

    def test_the_spec_has_every_section_in_order(self):
        spec = registry.get_spec("goblet_squat")
        self.assertEqual(list(spec), list(SECTIONS))
        self.assertEqual(spec["identity"]["exercise_id"], "goblet-squat")

    def test_strength_is_the_goal_and_other_goals_are_refused(self):
        self.assertEqual(registry.DEFAULT_GOAL, "strength")
        base = registry.get_spec("goblet-squat")
        self.assertEqual(base["goal_profiles"]["default"], "strength")
        self.assertIs(registry.get_spec("goblet-squat", "Strength"), base)          # case does not matter
        for goal in ("endurance", "power", "nonsense"):
            with self.assertRaises(registry.UnsupportedGoal, msg=goal):
                registry.get_spec("goblet-squat", goal)

    def test_overrides_change_a_copy_and_never_the_shared_spec(self):
        base = registry.get_spec("goblet-squat")
        before = copy.deepcopy(base)
        resolved = copy.deepcopy(base)
        registry._set_path(resolved, "selection.min_reps", 8)
        registry._set_path(resolved, "rules[lowering_quick].test.threshold", 0.4)
        self.assertEqual(resolved["selection"]["min_reps"], 8)
        self.assertEqual(next(r for r in resolved["rules"] if r["id"] == "lowering_quick")["test"]["threshold"], 0.4)
        self.assertEqual(base, before)
        with self.assertRaises(registry.SpecError):
            registry._set_path(resolved, "rules[no_such_rule].test.threshold", 1)

    def test_a_spec_with_a_repeated_or_broken_block_is_rejected(self):
        good = '```json kinetic:identity\n{"a": 1}\n```\n'
        with self.assertRaises(registry.SpecError):
            registry.parse_spec_text(good + good)
        with self.assertRaises(registry.SpecError):
            registry.parse_spec_text('```json kinetic:identity\n{"a": 1,}\n```\n')
        self.assertEqual(registry.parse_spec_text(good), {"identity": {"a": 1}})


if __name__ == "__main__":
    unittest.main()
