"""The template must be a valid skeleton, and the docs must describe exactly the structure the code enforces."""
import re
import unittest
from pathlib import Path

from exercises import schema as S
from exercises.registry import parse_spec_text
from exercises.validate import validate_spec

EXERCISES = Path(__file__).resolve().parents[1] / "exercises"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def prose(text):
    """The document with its machine blocks removed."""
    return re.sub(r"```json kinetic:.*?```", "", text, flags=re.DOTALL)


class TemplateTests(unittest.TestCase):
    TEMPLATE = parse_spec_text(read(EXERCISES / "_template" / "spec.md"), "template")

    def test_the_template_has_every_section_in_order(self):
        self.assertEqual(list(self.TEMPLATE), list(S.SECTIONS))

    def test_the_template_is_a_valid_spec_so_a_copy_starts_valid(self):
        self.assertEqual(validate_spec(self.TEMPLATE, folder="new-exercise", check_files=False), [])

    def test_the_template_stays_a_draft_with_no_signoff(self):
        self.assertEqual(self.TEMPLATE["identity"]["status"], "draft")
        self.assertIsNone(self.TEMPLATE["identity"]["trainer_signoff"])


class DocsMatchTheCode(unittest.TestCase):
    SCHEMA_DOC = read(EXERCISES / "SCHEMA.md")

    def test_the_schema_doc_names_every_section_test_pick_pool_mode_kind_status_and_landmark(self):
        for word in (*S.SECTIONS, *S.TESTS, *S.PICKS, *S.POOLS, *S.MODES, *S.KINDS, *S.SPEC_STATUSES, *S.RULE_STATUSES, *S.LANDMARKS, *S.FRONT_ANCHORS):
            self.assertIn(f"`{word}`", self.SCHEMA_DOC, f"SCHEMA.md does not mention {word}")

    def test_the_schema_doc_says_the_sections_are_thirteen(self):
        self.assertEqual(len(S.SECTIONS), 13)
        self.assertIn("13 numbered sections", self.SCHEMA_DOC)

    def test_the_goblet_squat_document_has_a_numbered_heading_for_every_section(self):
        text = read(EXERCISES / "goblet-squat" / "spec.md")
        headings = re.findall(r"^## (\d+)\. ", text, flags=re.MULTILINE)
        self.assertEqual(headings, [str(i) for i in range(1, len(S.SECTIONS) + 1)])

    def test_every_rule_is_explained_in_the_goblet_squat_prose(self):
        text = read(EXERCISES / "goblet-squat" / "spec.md")
        spec = parse_spec_text(text)
        explained = prose(text)
        for r in spec["rules"]:
            self.assertIn(f"`{r['id']}`", explained, f"rule {r['id']} is in the machine block but not explained in the text")

    def test_the_goblet_squat_prose_agrees_with_the_headline_numbers(self):
        text = read(EXERCISES / "goblet-squat" / "spec.md")
        spec = parse_spec_text(text)
        rules = {r["id"]: r for r in spec["rules"]}
        explained = prose(text)
        self.assertIn(f"{int(rules['lean_high']['test']['threshold'])} degrees or more", explained)
        self.assertIn(str(rules["knee_tracking"]["test"]["threshold"]), explained)
        self.assertIn(f"under {int(rules['ankle_limited']['test']['threshold'])} degrees", explained)
        self.assertIn(f"under {rules['lowering_quick']['test']['threshold']} s", explained)

    def test_readme_points_at_the_schema(self):
        self.assertIn("SCHEMA.md", read(EXERCISES / "README.md"))


if __name__ == "__main__":
    unittest.main()
