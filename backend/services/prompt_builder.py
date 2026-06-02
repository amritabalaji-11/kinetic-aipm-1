"""
Haiku Call 1 System Prompt Assembly Service

Loads the coaching system prompt markdown file from disk at runtime.
No vector database or complex retrieval required.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


# Keep these exception classes for compatibility with routes that import them
class PromptBuilderError(Exception):
    pass


class CoachingReferenceNotFoundError(PromptBuilderError):
    pass


def load_md_files(exercise: str = "goblet_squat") -> str:
    """
    Load the static coaching system prompt from the prompts directory.

    Args:
        exercise: Exercise identifier (retained for signature compatibility)

    Returns:
        The content of prompts/coaching_system.md as a string.
    """
    module_dir = Path(__file__).parent.parent
    prompt_path = module_dir / "prompts" / "coaching_system.md"

    if not prompt_path.exists():
        logger.error(f"Coaching system prompt not found at: {prompt_path}")
        raise FileNotFoundError(f"Coaching system prompt not found at {prompt_path}")

    try:
        content = prompt_path.read_text(encoding="utf-8")
        logger.info(f"Loaded coaching system prompt successfully ({len(content)} bytes)")
        return content
    except Exception as e:
        logger.error(f"Failed to read prompt file: {str(e)}")
        raise
