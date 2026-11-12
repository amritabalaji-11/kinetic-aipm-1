"""The exercise registry: one ID links every module, and an unknown exercise is a loud error, never a quiet squat."""
import unittest

from exercises import registry


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

    def test_spec_matches_its_folder_and_has_every_required_block(self):
        spec = registry.get_spec("goblet_squat")
        self.assertEqual(spec["exercise_id"], "goblet-squat")
        for block in ("rules", "wording", "comparison", "rep_counting", "reminders", "views", "modules"):
            self.assertIn(block, spec, block)
        self.assertEqual(set(spec["modules"]), set(registry.REQUIRED_MODULES))

    def test_every_work_on_topic_has_full_wording_and_every_went_well_topic_a_headline(self):
        wording = registry.get_spec("goblet-squat")["wording"]
        for topic, words in wording["work_on"].items():
            self.assertEqual(set(words), {"headline", "why", "cue"}, topic)
        for topic, words in wording["went_well"].items():
            self.assertIn("headline", words, topic)


if __name__ == "__main__":
    unittest.main()
