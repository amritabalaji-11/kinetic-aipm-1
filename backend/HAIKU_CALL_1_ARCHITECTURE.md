# Haiku Call 1 System Prompt Assembly — Architecture & Integration

**Status:** Production-ready  
**Date:** May 25, 2026  
**Version:** 1.0

---

## Overview

This document describes the server-side architecture for **Haiku Call 1**: Claude Haiku's real-time exercise form analysis system. The implementation loads exercise-specific coaching reference markdown files from disk and injects them into a cached system prompt at runtime.

### Key Principles

- **No vector database, embeddings, or RAG** — Pure file-based markdown injection
- **Static cached system prompt** — Loaded once per session, reused across analysis calls
- **Dynamic user prompt** — Exercise session data, biomechanics, images sent per request
- **Modular Python architecture** — Type hints, docstrings, error handling
- **Anthropic Claude Haiku API** — `claude-3-5-haiku-20241022` model

---

## Directory Structure

```
backend/
├── prompts/
│   └── haiku_call_1_system.txt           # Base system prompt template
│
├── coaching_references/
│   ├── goblet_squat_coaching_reference.md
│   ├── deadlift_coaching_reference.md    # (placeholder for future exercises)
│   └── ...
│
├── services/
│   ├── prompt_builder.py                 # Markdown loader + prompt assembly
│   └── haiku_call_1_integration.py       # Haiku client + analysis orchestration
│
├── routes/
│   └── analysis.py                       # HTTP endpoint that uses HaikuCall1
│
└── ...
```

---

## System Prompt Template

**File:** `backend/prompts/haiku_call_1_system.txt`

**Structure:**

1. **Role statement** — Haiku as real-time form analysis assistant
2. **Output schema** — JSON structure for coaching output
3. **Scoring weights** — 35% ROM, 25% stability, 25% posture, 15% movement quality
4. **Root cause priority** — RC1–RC5 diagnosis order
5. **Metric validity rules** — Which metrics are valid by camera angle
6. **Key rules** — One root cause drives multiple symptoms, fatigue vs. technique, etc.
7. **Pain integration** — Mild vs. severe pain handling
8. **Verdict mapping** — Score → label → opening tone
9. **[COACHING_LANGUAGE_REFERENCE]** — **PLACEHOLDER** injected with markdown
10. **Final notes** — Safety, clarity, grounding in reference

**Placeholder Injection:**

```
[COACHING_LANGUAGE_REFERENCE]
↓ (replaced at runtime)
---
# Goblet Squat — Coaching Reference & Gold Standard Angles
...full markdown content...
---
```

---

## Coaching Reference Markdown

**File:** `backend/coaching_references/goblet_squat_coaching_reference.md`

**Content:**

- **PART 1** — Gold standard angle targets (excellent/good/mild/moderate/severe ranges)
- **PART 2** — Root cause taxonomy (RC1–RC5) with signatures, causal chains, drills
- **PART 3** — Per-parameter coaching language (what to affirm, what to observe)
- **PART 4** — Within-set cues (ready-to-use, single-sentence)
- **PART 5** — Drill library (sets × reps × target × when)
- **PART 6** — Verdict language guide (score ranges → labels + tones)
- **PART 7** — Pain integration (mild vs. severe)

**Total:** ~70 KB of coaching knowledge, fully injected into the system prompt at runtime.

---

## Prompt Builder Service

**File:** `backend/services/prompt_builder.py`

### Classes

#### `PromptBuilder`

Assembles the final system prompt by loading template + coaching reference.

**Initialization:**

```python
from backend.services.prompt_builder import PromptBuilder

builder = PromptBuilder(
    prompts_dir="backend/prompts",
    references_dir="backend/coaching_references"
)
```

**Methods:**

```python
def assemble_system_prompt(exercise: str, template_name: str = "haiku_call_1_system.txt") -> str:
    """Assemble final prompt by injecting coaching reference into template."""
    return builder.assemble_system_prompt("goblet_squat")
```

**Error Handling:**

- `SystemPromptTemplateNotFoundError` — template file missing
- `CoachingReferenceNotFoundError` — .md file missing for exercise
- `CoachingReferenceEmptyError` — .md file is empty

### Convenience Functions

```python
# Standard usage (auto-detects paths relative to module)
system_prompt = load_md_files("goblet_squat")

# Custom paths
system_prompt = load_md_files_with_paths(
    exercise="goblet_squat",
    prompts_dir="/custom/path/prompts",
    references_dir="/custom/path/references"
)
```

### Flow

```python
1. load_md_files("goblet_squat")
   ↓
2. PromptBuilder()
   ├─ Load prompts/haiku_call_1_system.txt
   ├─ Load coaching_references/goblet_squat_coaching_reference.md
   └─ Inject markdown into [COACHING_LANGUAGE_REFERENCE] placeholder
   ↓
3. Return final_system_prompt (string)
   ├─ ~15 KB base template
   ├─ ~70 KB coaching reference
   └─ ~85 KB total
```

---

## Haiku Call 1 Integration

**File:** `backend/services/haiku_call_1_integration.py`

### Class: `HaikuCall1`

Orchestrates form analysis by calling Haiku with session data + biomechanics + images.

**Initialization:**

```python
from backend.services.haiku_call_1_integration import HaikuCall1

haiku = HaikuCall1(
    exercise="goblet_squat",
    api_key="sk-..."  # or env var ANTHROPIC_API_KEY
)
```

**Analysis:**

```python
coaching_output = haiku.analyze_form(
    session_data={
        "exercise": "goblet_squat",
        "camera_angle": "side_right",
        "set_number": 2,
        "rep_count": 8,
        "load_kg": 16.0,
        "pain_level": 0
    },
    biomechanics_json={
        "frames": [...],
        "aggregates": {...}
    },
    frame_images=[
        "data:image/jpeg;base64,...",  # Optional 8-frame sequence
        "data:image/jpeg;base64,..."
    ]
)
```

**Response:**

```json
{
  "overall_form_score": 82,
  "verdict_label": "Maintain",
  "verdict_summary": "Depth and posture are solid. Refine ankle mobility.",
  "parameter_scores": {
    "range_of_motion": 80,
    "stability": 85,
    "posture": 88,
    "movement_quality": 75
  },
  "root_cause_analysis": [
    {
      "id": "RC1",
      "name": "Ankle Dorsiflexion Restriction",
      "severity": "mild",
      "affected_reps": "reps 1–8 consistently",
      "evidence": "Ankle dorsiflexion averaged 24.3°; target ≥30° (side camera)"
    }
  ],
  "coaching_output": {
    "affirm": ["Knee angle held strong at bottom—68° consistently"],
    "correct": [
      {
        "parameter": "ankle_dorsiflexion",
        "issue": "Shin angle is 24.3°—lower than optimal. Your ankle isn't tracking your shin forward enough.",
        "cue": "Next set: Wall ankle stretch for 2 minutes before squatting. Focus on pushing your knee forward without the heel lifting."
      }
    ]
  },
  "next_session_focus": [
    "Banded ankle circles: 1×20 reps each foot before squatting. Builds ankle mobility under load.",
    "Wall ankle mobility stretch: 3×30s each side. Prepares dorsiflexion range for depth."
  ],
  "session_metadata": {
    "camera_angle": "side_right",
    "set_number": 2,
    "rep_count": 8,
    "load_kg": 16.0,
    "pain_level": 0
  }
}
```

---

## Integration with Backend Routes

**File:** `backend/routes/analysis.py` (example endpoint)

```python
from fastapi import APIRouter, HTTPException
from backend.services.haiku_call_1_integration import HaikuCall1
from backend.schemas.process_response import FormAnalysisResponse

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])

@router.post("/form-analysis")
async def analyze_form(request: FormAnalysisRequest):
    """
    Analyze exercise form using Haiku Call 1.
    
    Request body:
    {
        "exercise": "goblet_squat",
        "camera_angle": "side_right",
        "set_number": 2,
        "rep_count": 8,
        "load_kg": 16.0,
        "pain_level": 0,
        "biomechanics_json": {...},
        "frame_images": [...]
    }
    """
    try:
        haiku = HaikuCall1(exercise=request.exercise)
        coaching_output = haiku.analyze_form(
            session_data={
                "exercise": request.exercise,
                "camera_angle": request.camera_angle,
                "set_number": request.set_number,
                "rep_count": request.rep_count,
                "load_kg": request.load_kg,
                "pain_level": request.pain_level,
            },
            biomechanics_json=request.biomechanics_json,
            frame_images=request.frame_images
        )
        return FormAnalysisResponse(**coaching_output)
    except Exception as e:
        logger.error(f"Form analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Data Flow

```
User submits video + session metadata
          ↓
Backend video analysis pipeline extracts:
  ├─ Frame keyframes (8 images)
  ├─ Biomechanics JSON (angles, tempos, stability)
  └─ Session context (camera, load, reps, pain)
          ↓
Backend calls: HaikuCall1.analyze_form(...)
          ↓
HaikuCall1.__init__():
  ├─ Load haiku_call_1_system.txt (template)
  ├─ Load goblet_squat_coaching_reference.md (coaching knowledge)
  ├─ Inject markdown into [COACHING_LANGUAGE_REFERENCE]
  └─ Cache final_system_prompt (~85 KB)
          ↓
HaikuCall1.analyze_form():
  ├─ Build user message: session + biomechanics + images
  └─ Call Anthropic:
      POST https://api.anthropic.com/v1/messages
      {
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 2048,
        "system": final_system_prompt,  ← Cached
        "messages": [{"role": "user", "content": user_message}]
      }
          ↓
Haiku responds with JSON:
  {
    "overall_form_score": 82,
    "verdict_label": "Maintain",
    "parameter_scores": {...},
    "root_cause_analysis": [...],
    "coaching_output": {...},
    "next_session_focus": [...]
  }
          ↓
Backend returns to frontend
          ↓
User sees coaching output on screen
```

---

## Performance & Caching

### System Prompt Caching

- **Loaded once per exercise** — In `HaikuCall1.__init__()`
- **Reused across analysis calls** — Multiple sets/reps within same session
- **Total size:** ~85 KB (15 KB template + 70 KB markdown)
- **Haiku context window:** 200K tokens → minimal impact

### Example: 3-Set Session

```
HaikuCall1("goblet_squat")          → Load + cache system prompt (1 disk read)
  │
  ├─ Set 1: analyze_form(...)       → 1 API call (system cached)
  ├─ Set 2: analyze_form(...)       → 1 API call (system cached)
  └─ Set 3: analyze_form(...)       → 1 API call (system cached)
  
Total: 3 API calls, 1 system prompt load
```

### Token Efficiency

- **System prompt:** ~20K tokens (static, cached)
- **User message:** ~1–2K tokens (session + biomechanics)
- **Response:** ~500–1K tokens (JSON coaching output)
- **Total per call:** ~22K tokens (Haiku context window: 200K)

---

## Error Handling

### Prompt Builder Errors

```python
try:
    system_prompt = load_md_files("goblet_squat")
except SystemPromptTemplateNotFoundError:
    # prompts/haiku_call_1_system.txt missing
except CoachingReferenceNotFoundError:
    # coaching_references/goblet_squat_coaching_reference.md missing
except CoachingReferenceEmptyError:
    # Markdown file is empty
```

### Haiku API Errors

```python
try:
    coaching_output = haiku.analyze_form(...)
except ValueError:
    # Response is not valid JSON
except anthropic.APIError:
    # Haiku API call failed (network, auth, rate limit, etc.)
```

### Logging

All operations logged at INFO/DEBUG levels:

```
INFO     PromptBuilder initialized with prompts_dir=...
DEBUG    Loaded template: haiku_call_1_system.txt (15,234 bytes)
DEBUG    Loaded coaching reference for goblet_squat (72,456 bytes)
INFO     Final system prompt assembled (87,690 bytes)
INFO     Analyzing form for goblet_squat
INFO     Form analysis complete: score=82, verdict=Maintain
```

---

## Adding New Exercises

To support a new exercise:

1. **Create coaching reference markdown**

   ```
   backend/coaching_references/deadlift_coaching_reference.md
   ```

   Contains:
   - PART 1: Angle targets (excellent/good/mild/moderate/severe)
   - PART 2: Root cause taxonomy (RC1–RC5)
   - PART 3: Per-parameter coaching language
   - PART 4: Within-set cues
   - PART 5: Drill library
   - PART 6: Verdict language
   - PART 7: Pain integration

2. **Use prompt builder with new exercise**

   ```python
   system_prompt = load_md_files("deadlift")
   haiku = HaikuCall1(exercise="deadlift")
   ```

3. **No changes to template or builder required** — Fully generic.

---

## Testing

### Unit Test: Prompt Assembly

```python
from backend.services.prompt_builder import PromptBuilder

def test_prompt_assembly():
    builder = PromptBuilder()
    system_prompt = builder.assemble_system_prompt("goblet_squat")
    
    # Verify coaching reference is injected
    assert "PART 1 — GOLD STANDARD ANGLE TARGETS" in system_prompt
    assert "RC1 — Ankle Dorsiflexion Restriction" in system_prompt
    assert len(system_prompt) > 80000  # ~85 KB
```

### Integration Test: Haiku Call

```python
from backend.services.haiku_call_1_integration import HaikuCall1
import json

def test_haiku_analysis():
    haiku = HaikuCall1(exercise="goblet_squat")
    coaching_output = haiku.analyze_form(
        session_data={...},
        biomechanics_json={...}
    )
    
    # Verify response schema
    assert "overall_form_score" in coaching_output
    assert "verdict_label" in coaching_output
    assert "root_cause_analysis" in coaching_output
    assert isinstance(coaching_output["overall_form_score"], int)
    assert 0 <= coaching_output["overall_form_score"] <= 100
```

---

## Production Checklist

- [ ] `haiku_call_1_system.txt` created and verified
- [ ] `goblet_squat_coaching_reference.md` created and verified
- [ ] `prompt_builder.py` tested with unit tests
- [ ] `haiku_call_1_integration.py` tested with mock Haiku responses
- [ ] API route integrated and tested
- [ ] Error handling for missing files / invalid JSON
- [ ] Logging configured for monitoring
- [ ] Environment variable `ANTHROPIC_API_KEY` set
- [ ] Performance tested with real biomechanics data
- [ ] Response latency acceptable (<2s per call)

---

## References

- **Prompt Builder:** `backend/services/prompt_builder.py`
- **Haiku Integration:** `backend/services/haiku_call_1_integration.py`
- **System Prompt Template:** `backend/prompts/haiku_call_1_system.txt`
- **Coaching Reference:** `backend/coaching_references/goblet_squat_coaching_reference.md`
- **Example Route:** `backend/routes/analysis.py` (see integration section above)

---

*Kinetic · Haiku Call 1 · System Prompt Assembly · May 25, 2026*
