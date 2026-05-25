"""
Example: Complete integration of HaikuCall1 into backend/routes/analysis.py

This demonstrates how to use the Haiku Call 1 system in the existing FastAPI
backend. The system loads coaching reference markdown from disk and injects
it into the cached system prompt before calling Claude Haiku.

NO vector database, embeddings, or RAG — pure markdown injection.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, logger as fastapi_logger
from anthropic import APIError as AnthropicAPIError

from services.haiku_call_1_integration import HaikuCall1
from services.prompt_builder import (
    PromptBuilderError,
    CoachingReferenceNotFoundError,
)

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])

# Configure logger
import logging
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================


class FrameData(BaseModel):
    """Single video frame biomechanics data."""

    frame_number: int
    position: str  # "standing", "mid_descent", "bottom", "mid_ascent"
    knee_angle: float = Field(..., description="MediaPipe interior angle (degrees)")
    trunk_lean: float = Field(..., description="Trunk angle from vertical (degrees)")
    ankle_dorsiflexion: Optional[float] = Field(
        None, description="Shin angle from vertical (degrees)"
    )
    stability_data: Optional[dict] = Field(
        None, description="Valgus, hip asymmetry, lateral shift"
    )


class AggregateMetrics(BaseModel):
    """Session-level aggregated biomechanics."""

    mean_knee_angle_bottom: float
    mean_trunk_lean: float
    mean_ankle_dorsiflexion: float
    descent_tempo_s: float
    ascent_tempo_s: float
    pause_at_bottom_s: float
    reps: int


class BiomechanicsJSON(BaseModel):
    """Raw biomechanics output from video analysis pipeline."""

    session_id: str
    timestamp: str
    frames: List[FrameData]
    aggregates: AggregateMetrics


class FormAnalysisRequest(BaseModel):
    """Request to analyze exercise form."""

    exercise: str = Field("goblet_squat", description="Exercise identifier")
    camera_angle: str = Field(..., description="front|angled|side_left|side_right")
    set_number: int = Field(..., ge=1)
    rep_count: int = Field(..., ge=1)
    load_kg: float = Field(..., gt=0)
    pain_level: int = Field(0, ge=0, le=10)
    user_id: Optional[str] = None
    biomechanics_json: BiomechanicsJSON
    frame_images: Optional[List[str]] = Field(
        None,
        description="Optional 8-frame base64 images or URLs (keyframes at critical phases)",
    )


class RootCauseAnalysis(BaseModel):
    """Root cause identified in form analysis."""

    id: str  # RC1–RC5
    name: str
    severity: str  # none|mild|moderate|severe
    affected_reps: str
    evidence: str


class ParameterScores(BaseModel):
    """Individual parameter scores."""

    range_of_motion: int = Field(..., ge=0, le=100)
    stability: int = Field(..., ge=0, le=100)
    posture: int = Field(..., ge=0, le=100)
    movement_quality: int = Field(..., ge=0, le=100)


class CoachingCorrection(BaseModel):
    """Single correction cue."""

    parameter: str
    issue: str
    cue: str


class FormAnalysisResponse(BaseModel):
    """Coaching output from Haiku Call 1."""

    overall_form_score: int = Field(..., ge=0, le=100)
    verdict_label: str  # Excellent|Maintain|Work on it|Significant issue|Severe
    verdict_summary: str
    parameter_scores: ParameterScores
    root_cause_analysis: List[RootCauseAnalysis]
    coaching_output: dict  # {"affirm": [...], "correct": [...]}
    next_session_focus: List[str]
    session_metadata: dict  # Echo back session context


# ============================================================================
# ROUTES
# ============================================================================


@router.post("/form-analysis", response_model=FormAnalysisResponse)
async def analyze_form_endpoint(request: FormAnalysisRequest) -> FormAnalysisResponse:
    """
    Analyze exercise form using Haiku Call 1.

    This endpoint:
    1. Validates request data
    2. Initializes HaikuCall1 (loads cached system prompt with coaching reference)
    3. Sends session biomechanics to Claude Haiku
    4. Returns coaching output JSON

    Args:
        request: FormAnalysisRequest with exercise, camera angle, biomechanics data

    Returns:
        FormAnalysisResponse with overall_form_score, verdict, root cause analysis, coaching

    Raises:
        HTTPException 400: Invalid exercise or missing coaching reference
        HTTPException 500: Haiku API call failed or response parsing failed
    """
    logger.info(
        f"Analyzing form: {request.exercise} | "
        f"Camera: {request.camera_angle} | "
        f"Set {request.set_number}, {request.rep_count} reps | "
        f"Load: {request.load_kg}kg | Pain: {request.pain_level}/10"
    )

    try:
        # Initialize Haiku Call 1 (loads cached system prompt)
        haiku = HaikuCall1(exercise=request.exercise)
        logger.info(
            f"Haiku Call 1 initialized for {request.exercise} "
            f"(system prompt cached)"
        )

        # Build session data dict
        session_data = {
            "exercise": request.exercise,
            "camera_angle": request.camera_angle,
            "set_number": request.set_number,
            "rep_count": request.rep_count,
            "load_kg": request.load_kg,
            "pain_level": request.pain_level,
            "user_id": request.user_id,
        }

        # Call Haiku with biomechanics + optional images
        coaching_output = haiku.analyze_form(
            session_data=session_data,
            biomechanics_json=request.biomechanics_json.dict(),
            frame_images=request.frame_images,
            max_tokens=2048,
        )

        logger.info(
            f"Form analysis complete: "
            f"score={coaching_output['overall_form_score']}/100 | "
            f"verdict={coaching_output['verdict_label']}"
        )

        # Parse and validate response
        response = FormAnalysisResponse(**coaching_output)
        return response

    except CoachingReferenceNotFoundError as e:
        logger.error(f"Coaching reference not found: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported exercise: {request.exercise}. "
            f"Supported: goblet_squat",
        )

    except PromptBuilderError as e:
        logger.error(f"Prompt builder error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to load coaching reference. Contact support.",
        )

    except ValueError as e:
        # JSON parsing error from Haiku response
        logger.error(f"Failed to parse Haiku response as JSON: {e}")
        raise HTTPException(
            status_code=500,
            detail="Haiku response parsing failed. Please try again.",
        )

    except AnthropicAPIError as e:
        # Haiku API call failed (network, auth, rate limit, etc.)
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Haiku API temporarily unavailable. Please try again.",
        )

    except Exception as e:
        # Unexpected error
        logger.exception(f"Unexpected error in form analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/supported-exercises")
async def get_supported_exercises():
    """
    List supported exercises for form analysis.

    Returns:
        List of exercise identifiers and their coaching reference status
    """
    return {
        "exercises": [
            {
                "id": "goblet_squat",
                "name": "Goblet Squat",
                "status": "available",
            }
        ],
        "note": "More exercises can be added by creating coaching_references/*.md files",
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def health_check():
    """
    Health check for analysis service.

    Verifies:
    - Haiku Call 1 system can be initialized
    - Coaching reference files exist and are readable
    """
    try:
        # Quick check: can we load the coaching reference?
        from backend.services.prompt_builder import load_md_files

        system_prompt = load_md_files("goblet_squat")
        prompt_size_kb = len(system_prompt) / 1024

        return {
            "status": "healthy",
            "service": "Haiku Call 1 Analysis Service",
            "coaching_reference_loaded": True,
            "system_prompt_size_kb": round(prompt_size_kb, 1),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "Haiku Call 1 Analysis Service",
            "error": str(e),
        }


# ============================================================================
# EXAMPLE USAGE (for testing in isolation)
# ============================================================================

if __name__ == "__main__":
    """
    Test the form analysis endpoint locally.

    Run:
        python backend/routes/analysis.py
    """
    import asyncio
    import json

    async def test_form_analysis():
        """Test form analysis with example data."""
        # Example request
        example_request = FormAnalysisRequest(
            exercise="goblet_squat",
            camera_angle="side_right",
            set_number=2,
            rep_count=8,
            load_kg=16.0,
            pain_level=0,
            user_id="test_user_123",
            biomechanics_json=BiomechanicsJSON(
                session_id="sess_12345",
                timestamp="2026-05-25T14:30:00Z",
                frames=[
                    FrameData(
                        frame_number=0,
                        position="standing",
                        knee_angle=175.2,
                        trunk_lean=8.5,
                        ankle_dorsiflexion=28.3,
                    ),
                    FrameData(
                        frame_number=1,
                        position="mid_descent",
                        knee_angle=120.5,
                        trunk_lean=15.2,
                        ankle_dorsiflexion=25.8,
                    ),
                    FrameData(
                        frame_number=2,
                        position="bottom",
                        knee_angle=68.3,
                        trunk_lean=18.0,
                        ankle_dorsiflexion=24.1,
                        stability_data={
                            "knee_gap_hip_gap_ratio": 0.96,
                            "hip_height_asymmetry_mm": 6.2,
                            "lateral_trunk_shift_cm": 1.8,
                        },
                    ),
                ],
                aggregates=AggregateMetrics(
                    mean_knee_angle_bottom=68.5,
                    mean_trunk_lean=17.8,
                    mean_ankle_dorsiflexion=24.3,
                    descent_tempo_s=2.1,
                    ascent_tempo_s=0.9,
                    pause_at_bottom_s=0.8,
                    reps=8,
                ),
            ),
        )

        # Call endpoint
        print("Testing form analysis endpoint...")
        response = await analyze_form_endpoint(example_request)
        print("\n✓ Response received:")
        print(json.dumps(response.dict(), indent=2))

    # Run test
    asyncio.run(test_form_analysis())
