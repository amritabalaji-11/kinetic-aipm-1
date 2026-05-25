"""
Example: Haiku Call 1 Integration with Anthropic Client

Demonstrates how to use prompt_builder.py to assemble the system prompt
and call Claude Haiku for exercise form analysis.

ARCHITECTURE:
  1. prompt_builder.load_md_files("goblet_squat")
     → Loads base system prompt template
     → Loads goblet_squat_coaching_reference.md
     → Injects markdown into [COACHING_LANGUAGE_REFERENCE] placeholder
     → Returns final system prompt (cached, static)

  2. Construct user message with session data + biomechanics JSON + 8-frame images

  3. Call Anthropic Claude Haiku with:
     - system=final_system_prompt (cached, reusable)
     - messages=[{"role": "user", "content": user_message}]

  4. Parse JSON response to coaching output

NO vector database. NO embeddings. NO RAG. Pure markdown injection.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional
import os
import re

from anthropic import Anthropic

# Import the prompt builder service
from services.prompt_builder import load_md_files

logger = logging.getLogger(__name__)


class HaikuCall1:
    """
    Haiku Call 1: Real-time exercise form analysis via Claude Haiku.

    Loads exercise-specific coaching reference markdown and calls Haiku
    with session biomechanics data + 8-frame images.

    Attributes:
        client (Anthropic): Initialized Anthropic API client
        system_prompt (str): Cached system prompt with coaching reference injected
        exercise (str): Exercise identifier (e.g., "goblet_squat")
    """

    def __init__(self, exercise: str = "goblet_squat", api_key: Optional[str] = None):
        """
        Initialize Haiku Call 1 with exercise-specific prompt.

        Args:
            exercise: Exercise identifier (default: "goblet_squat")
            api_key: Anthropic API key (defaults to env var ANTHROPIC_API_KEY)

        Raises:
            FileNotFoundError: If coaching reference not found for exercise
            CoachingReferenceError: If markdown loading fails
        """
        self.client = Anthropic(api_key=api_key)
        self.exercise = exercise

        # Load and cache system prompt (static, reusable across calls)
        logger.info(f"Loading system prompt for exercise: {exercise}")
        self.system_prompt = load_md_files(exercise)
        logger.info(
            f"System prompt cached ({len(self.system_prompt)} bytes) "
            f"with {exercise} coaching reference"
        )

    def analyze_form(
        self,
        session_data: dict[str, Any],
        biomechanics_json: dict[str, Any],
        frame_images: Optional[list[str]] = None,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """
        Analyze exercise form and return coaching output.

        Args:
            session_data: Session metadata (exercise, camera_angle, set_number,
                         rep_count, load_kg, pain_level, user_id, etc.)
            biomechanics_json: Raw angle measurements and metrics from video analysis
                              (knee_angle, trunk_lean, ankle_dorsiflexion, etc.)
            frame_images: Optional list of 8-frame base64 images or image URLs
                         (keyframes at critical movement phases)
            max_tokens: Max tokens for Haiku response (default: 2048)

        Returns:
            Parsed coaching output dict with:
              - overall_form_score (0–100)
              - verdict_label (Excellent|Maintain|Work on it|...)
              - verdict_summary
              - parameter_scores (ROM, stability, posture, movement_quality)
              - root_cause_analysis (RC1–RC5 with severity + evidence)
              - coaching_output (affirm + correct cues)
              - next_session_focus (drills + explanations)
              - session_metadata

        Raises:
            ValueError: If response is not valid JSON
            anthropic.APIError: If Haiku API call fails
        """
        logger.info(f"Analyzing form for {session_data.get('exercise', 'unknown')}")

        # Build user message with session context + biomechanics + images
        user_message = self._build_user_message(
            session_data, biomechanics_json, frame_images
        )

        # Call Haiku with cached system prompt
        logger.debug(f"Calling Haiku with {len(user_message['content'])} tokens")
        response = self.client.messages.create(
            #model="claude-3-5-haiku-20241022",
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            system=self.system_prompt,  # Cached, static
            messages=[{"role": "user", "content": user_message["content"]}],
        )

        # Parse response JSON
        response_text = response.content[0].text
        logger.debug(f"Haiku response: {len(response_text)} chars")

        try:
            # STEP 1: remove markdown fences
            cleaned = re.sub(r"```json", "", response_text)
            cleaned = cleaned.replace("```", "").strip()
            # STEP 2: extract JSON safely (handles truncation)
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start == -1 or end == -1:
                raise ValueError("No JSON found in response")

            cleaned_json = cleaned[start:end+1]

            # STEP 3: parse
            coaching_output = json.loads(cleaned_json)

            logger.info(
                f"Form analysis complete: score={coaching_output.get('overall_form_score')}, "
                f"verdict={coaching_output.get('verdict_label')}"
            )
            return coaching_output

        except json.JSONDecodeError as e:
            logger.error("RAW RESPONSE (first 2000 chars):")
            logger.error(response_text[:2000])
            raise ValueError(f"Invalid JSON from model: {e}") from e
            

    def _build_user_message(
        self,
        session_data: dict[str, Any],
        biomechanics_json: dict[str, Any],
        frame_images: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Build user message content with session metadata + biomechanics + images.

        Args:
            session_data: Session metadata (exercise, camera_angle, set_number, etc.)
            biomechanics_json: Raw angle measurements
            frame_images: Optional list of image base64 strings or URLs

        Returns:
            User message dict with text + optional image content blocks
        """
        # Construct markdown context for the session
        context = f"""
## Session Context

**Exercise:** {session_data.get('exercise', 'unknown')}
**Camera Angle:** {session_data.get('camera_angle', 'unknown')}
**Set {session_data.get('set_number', 'N/A')} | Rep Count: {session_data.get('rep_count', 'N/A')}
**Load:** {session_data.get('load_kg', 'N/A')} kg
**Pain Level:** {session_data.get('pain_level', 0)}/10

## Raw Biomechanics Data

```json
{json.dumps(biomechanics_json, indent=2)}
```

## Analysis Request

Analyze this session according to the coaching reference framework. Provide coaching output
in the exact JSON schema specified in the system prompt. Use the gold standard angle targets,
root cause taxonomy, and weighted penalty system from the coaching reference.

Return JSON only, no additional text.
"""

        content = [{"type": "text", "text": context}]

        # Add frame images if provided
        if frame_images:
            for i, image in enumerate(frame_images):
                if image.startswith("data:image"):
                    # Base64-encoded image
                    media_type, data = image.split(",", 1)
                    media_type = media_type.replace("data:", "").replace(";base64", "")
                    content.append(
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": data,
                            },
                        }
                    )
                else:
                    # URL reference
                    content.append({"type": "image", "source": {"type": "url", "url": image}})
                logger.debug(f"Added frame image {i+1}/{len(frame_images)}")

        return {"content": content}


def example_usage():
    """
    Example: Load coaching reference and call Haiku.

    This demonstrates the full flow without external dependencies.
    """
    # 1. Initialize Haiku with coaching reference
    haiku = HaikuCall1(exercise="goblet_squat")
    print(f"✓ System prompt loaded ({len(haiku.system_prompt)} bytes)")

    # 2. Example session data
    session_data = {
        "exercise": "goblet_squat",
        "camera_angle": "side_right",
        "set_number": 2,
        "rep_count": 8,
        "load_kg": 16.0,
        "pain_level": 0,
        "user_id": "user_12345",
    }

    # 3. Example biomechanics JSON (from video analysis pipeline)
    biomechanics_json = {
        "session_id": "sess_12345",
        "timestamp": "2026-05-25T14:30:00Z",
        "frames": [
            {
                "frame_number": 0,
                "position": "standing",
                "knee_angle": 175.2,
                "trunk_lean": 8.5,
                "ankle_dorsiflexion": 28.3,
            },
            {
                "frame_number": 1,
                "position": "mid_descent",
                "knee_angle": 120.5,
                "trunk_lean": 15.2,
                "ankle_dorsiflexion": 25.8,
            },
            {
                "frame_number": 2,
                "position": "bottom",
                "knee_angle": 68.3,
                "trunk_lean": 18.0,
                "ankle_dorsiflexion": 24.1,
                "stability_data": {
                    "knee_gap_hip_gap_ratio": 0.96,
                    "hip_height_asymmetry_mm": 6.2,
                    "lateral_trunk_shift_cm": 1.8,
                },
            },
        ],
        "aggregates": {
            "mean_knee_angle_bottom": 68.5,
            "mean_trunk_lean": 17.8,
            "mean_ankle_dorsiflexion": 24.3,
            "descent_tempo_s": 2.1,
            "ascent_tempo_s": 0.9,
            "pause_at_bottom_s": 0.8,
            "reps": 8,
        },
    }

    # 4. Call Haiku
    print("\n📊 Calling Haiku Call 1...")
    try:
        coaching_output = haiku.analyze_form(
            session_data=session_data,
            biomechanics_json=biomechanics_json,
            frame_images=None,  # No images for this example
        )

        # 5. Display results
        print(f"\n✓ Analysis complete!")
        print(f"Overall Form Score: {coaching_output['overall_form_score']}/100")
        print(f"Verdict: {coaching_output['verdict_label']}")
        print(f"\nSummary: {coaching_output['verdict_summary']}")
        print(
            f"\nRoot Causes: {[rc['id'] + ' (' + rc['severity'] + ')' for rc in coaching_output['root_cause_analysis']]}"
        )
        print(f"\nFull output:")
        print(json.dumps(coaching_output, indent=2))

    except ValueError as e:
        print(f"✗ Error: {e}")
    except Exception as e:
        print(f"✗ API Error: {e}")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run example
    example_usage()
