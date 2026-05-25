#!/usr/bin/env python
"""
Verification script for Haiku Call 1 prompt assembly.

Tests:
  1. Prompt builder imports
  2. System prompt loads successfully
  3. Coaching reference is injected
  4. Key sections are present in final prompt
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.services.prompt_builder import load_md_files, PromptBuilder


def test_imports():
    """Test that prompt builder imports successfully."""
    print("Testing imports...")
    assert PromptBuilder is not None
    print("  ✓ PromptBuilder class imported")
    assert load_md_files is not None
    print("  ✓ load_md_files function imported")


def test_prompt_assembly():
    """Test that system prompt loads and coaching reference is injected."""
    print("\nTesting prompt assembly...")

    # Load system prompt
    system_prompt = load_md_files("goblet_squat")
    print(f"  ✓ System prompt loaded ({len(system_prompt):,} bytes)")

    # Verify coaching reference is injected
    required_sections = [
        "PART 1 — GOLD STANDARD ANGLE TARGETS",
        "PART 2 — ROOT CAUSE TAXONOMY",
        "RC1 — Ankle Dorsiflexion Restriction",
        "RC2 — Glute / Hip Abductor Weakness",
        "RC3 — Hip Flexor Tightness",
        "RC4 — Load-Relative Strength Deficit",
        "RC5 — Thoracic Spine / Upper Back Mobility",
        "PART 3 — PER-PARAMETER COACHING LANGUAGE",
        "PART 4 — WITHIN-SET CUES",
        "PART 5 — NEXT SESSION DRILL LIBRARY",
        "PART 6 — VERDICT LANGUAGE GUIDE",
        "PART 7 — PAIN INTEGRATION",
    ]

    for section in required_sections:
        assert section in system_prompt, f"Missing section: {section}"
        print(f"  ✓ Found: {section[:50]}")

    # Verify placeholder is replaced
    assert "[COACHING_LANGUAGE_REFERENCE]" not in system_prompt
    print("  ✓ Placeholder injected (no placeholder token in final prompt)")

    # Verify base prompt sections are present
    assert "Haiku Call 1" in system_prompt
    assert "JSON schema" in system_prompt
    assert "Scoring Weights" in system_prompt
    print("  ✓ Base system prompt sections intact")


def test_builder_class():
    """Test PromptBuilder class directly."""
    print("\nTesting PromptBuilder class...")

    builder = PromptBuilder()
    print(f"  ✓ PromptBuilder instantiated")

    prompt = builder.assemble_system_prompt("goblet_squat")
    assert len(prompt) > 30000, "Assembled prompt too small"
    print(f"  ✓ Assembled prompt is {len(prompt):,} bytes (expected >30KB)")

    # Verify template placeholder path handling
    from backend.services.prompt_builder import (
        SystemPromptTemplateNotFoundError,
        CoachingReferenceNotFoundError,
    )

    try:
        builder.assemble_system_prompt("nonexistent_exercise")
        assert False, "Should have raised CoachingReferenceNotFoundError"
    except CoachingReferenceNotFoundError:
        print("  ✓ Error handling works (missing exercise)")


def main():
    """Run all verification tests."""
    print("=" * 70)
    print("Haiku Call 1 Prompt Assembly Verification")
    print("=" * 70)

    try:
        test_imports()
        test_prompt_assembly()
        test_builder_class()

        print("\n" + "=" * 70)
        print("✓ ALL TESTS PASSED")
        print("=" * 70)
        print("\nImplementation is ready for production use.")
        print("\nNext steps:")
        print("  1. Integrate HaikuCall1 into backend/routes/analysis.py")
        print("  2. Configure ANTHROPIC_API_KEY environment variable")
        print("  3. Test with real video analysis data")
        print("  4. Deploy to production")
        return 0

    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
