"""
Haiku Call 1 System Prompt Assembly Service

Loads markdown coaching references from disk and injects them into the
system prompt template at runtime. This module provides modular,
type-safe construction of the final system prompt for Claude Haiku API calls.

Architecture:
  1. Load base system prompt template (haiku_call_1_system.txt)
  2. Load exercise-specific coaching reference (markdown file)
  3. Inject markdown into [COACHING_LANGUAGE_REFERENCE] placeholder
  4. Return final assembled prompt for use with Anthropic client

No vector database, embeddings, or retrieval framework. Pure file-based
markdown injection into the static cached system prompt.
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class PromptBuilderError(Exception):
    """Base exception for prompt builder errors."""

    pass


class CoachingReferenceNotFoundError(PromptBuilderError):
    """Raised when coaching reference markdown file does not exist."""

    pass


class CoachingReferenceEmptyError(PromptBuilderError):
    """Raised when coaching reference markdown file is empty or whitespace only."""

    pass


class SystemPromptTemplateNotFoundError(PromptBuilderError):
    """Raised when system prompt template file does not exist."""

    pass


class PromptBuilder:
    """
    Assembles the Haiku Call 1 system prompt by injecting exercise-specific
    coaching reference markdown into the base system prompt template.

    Attributes:
        prompts_dir (Path): Directory containing system prompt templates
        references_dir (Path): Directory containing exercise-specific coaching references
    """

    def __init__(
        self,
        prompts_dir: Optional[str] = None,
        references_dir: Optional[str] = None,
    ):
        """
        Initialize PromptBuilder with paths to prompt and reference directories.

        Args:
            prompts_dir: Path to directory containing haiku_call_1_system.txt.
                        Defaults to backend/prompts/ relative to current module.
            references_dir: Path to directory containing coaching reference .md files.
                           Defaults to backend/coaching_references/ relative to current module.

        Raises:
            FileNotFoundError: If prompt or reference directories do not exist.
        """
        module_dir = Path(__file__).parent.parent
        self.prompts_dir = Path(prompts_dir) if prompts_dir else module_dir / "prompts"
        self.references_dir = (
            Path(references_dir) if references_dir else module_dir / "coaching_references"
        )

        if not self.prompts_dir.exists():
            raise FileNotFoundError(
                f"Prompts directory does not exist: {self.prompts_dir}"
            )
        if not self.references_dir.exists():
            raise FileNotFoundError(
                f"Coaching references directory does not exist: {self.references_dir}"
            )

        logger.info(f"PromptBuilder initialized with prompts_dir={self.prompts_dir}")
        logger.info(f"PromptBuilder initialized with references_dir={self.references_dir}")

    def _load_template(self, template_name: str = "haiku_call_1_system.txt") -> str:
        """
        Load the base system prompt template from disk.

        Args:
            template_name: Filename of the template (default: haiku_call_1_system.txt)

        Returns:
            Raw template string with [COACHING_LANGUAGE_REFERENCE] placeholder.

        Raises:
            SystemPromptTemplateNotFoundError: If template file does not exist.
        """
        template_path = self.prompts_dir / template_name
        if not template_path.exists():
            logger.error(f"System prompt template not found: {template_path}")
            raise SystemPromptTemplateNotFoundError(
                f"System prompt template not found at {template_path}"
            )

        try:
            content = template_path.read_text(encoding="utf-8")
            logger.debug(f"Loaded template: {template_name} ({len(content)} bytes)")
            return content
        except Exception as e:
            logger.error(f"Failed to load template {template_path}: {e}")
            raise

    def _load_coaching_reference(self, exercise: str) -> str:
        """
        Load exercise-specific coaching reference markdown from disk.

        Converts exercise name to filename by appending .md extension
        and converting underscores to underscores (no change).
        e.g., "goblet_squat" -> "goblet_squat_coaching_reference.md"

        Args:
            exercise: Exercise identifier (e.g., "goblet_squat", "deadlift")

        Returns:
            Raw markdown string containing coaching reference.

        Raises:
            CoachingReferenceNotFoundError: If .md file does not exist for exercise.
            CoachingReferenceEmptyError: If .md file is empty or whitespace only.
        """
        filename = f"{exercise}_coaching_reference.md"
        reference_path = self.references_dir / filename

        if not reference_path.exists():
            available = list(self.references_dir.glob("*_coaching_reference.md"))
            available_str = ", ".join([f.stem for f in available]) if available else "none"
            logger.error(
                f"Coaching reference not found for {exercise}. "
                f"Available: {available_str}"
            )
            raise CoachingReferenceNotFoundError(
                f"Coaching reference not found at {reference_path}. "
                f"Supported exercises: {available_str}"
            )

        try:
            content = reference_path.read_text(encoding="utf-8")
            if not content.strip():
                logger.error(f"Coaching reference is empty: {reference_path}")
                raise CoachingReferenceEmptyError(
                    f"Coaching reference file is empty: {reference_path}"
                )
            logger.debug(
                f"Loaded coaching reference for {exercise} ({len(content)} bytes)"
            )
            return content
        except Exception as e:
            if isinstance(e, CoachingReferenceEmptyError):
                raise
            logger.error(f"Failed to load coaching reference {reference_path}: {e}")
            raise

    def assemble_system_prompt(
        self, exercise: str, template_name: str = "haiku_call_1_system.txt"
    ) -> str:
        """
        Assemble the final system prompt by injecting coaching reference into template.

        Steps:
          1. Load base system prompt template from disk
          2. Load exercise-specific coaching reference markdown
          3. Inject markdown into [COACHING_LANGUAGE_REFERENCE] placeholder
          4. Return final prompt string

        Args:
            exercise: Exercise identifier (e.g., "goblet_squat")
            template_name: Filename of system prompt template (default: haiku_call_1_system.txt)

        Returns:
            Final assembled system prompt with coaching reference injected.

        Raises:
            SystemPromptTemplateNotFoundError: If template file does not exist.
            CoachingReferenceNotFoundError: If coaching reference file does not exist.
            CoachingReferenceEmptyError: If coaching reference file is empty.
        """
        logger.info(f"Assembling system prompt for exercise: {exercise}")

        template = self._load_template(template_name)
        reference = self._load_coaching_reference(exercise)

        placeholder = "[COACHING_LANGUAGE_REFERENCE]"
        if placeholder not in template:
            logger.warning(
                f"Placeholder '{placeholder}' not found in template. "
                "Coaching reference will not be injected."
            )

        final_prompt = template.replace(placeholder, reference)
        logger.info(
            f"Final system prompt assembled ({len(final_prompt)} bytes) "
            f"with {exercise} coaching reference"
        )
        return final_prompt


def load_md_files(exercise: str) -> str:
    """
    Convenience function to load and assemble coaching reference.

    This is the public entry point for loading coaching reference markdown
    and assembling the final system prompt for Haiku Call 1.

    Args:
        exercise: Exercise identifier (e.g., "goblet_squat")

    Returns:
        Final system prompt with coaching reference injected.

    Raises:
        PromptBuilderError: If assembly fails (missing files, empty content, etc.)

    Example:
        >>> system_prompt = load_md_files("goblet_squat")
        >>> # Use system_prompt with Anthropic client
        >>> client.messages.create(
        ...     model="claude-3-5-haiku-20241022",
        ...     max_tokens=2048,
        ...     system=system_prompt,
        ...     messages=[{"role": "user", "content": user_input}]
        ... )
    """
    builder = PromptBuilder()
    return builder.assemble_system_prompt(exercise)


# Alternative factory function with custom directories
def load_md_files_with_paths(
    exercise: str, prompts_dir: str, references_dir: str
) -> str:
    """
    Load and assemble coaching reference with custom directory paths.

    Useful for testing or deployments with non-standard directory structures.

    Args:
        exercise: Exercise identifier
        prompts_dir: Path to directory containing system prompt templates
        references_dir: Path to directory containing coaching references

    Returns:
        Final system prompt with coaching reference injected.

    Raises:
        PromptBuilderError: If assembly fails
    """
    builder = PromptBuilder(prompts_dir=prompts_dir, references_dir=references_dir)
    return builder.assemble_system_prompt(exercise)
