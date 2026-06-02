# Frontend SSE Event Contract & Error Reference

**Kinetic · Squad 1 Integration Spec**
*Updated: W8 — adds Haiku Call 2 events*

---

## SSE Endpoint

```
GET /analysis/{analysis_id}/stream
```

Stream remains **open** until a terminal event fires. Reconnecting replays the most recent event.

---

## Full Event Sequence

```
upload_received          (10%)   → in_progress
mediapipe_started        (20%)   → in_progress
mediapipe_complete       (40%)   → in_progress
biomechanics_complete    (55%)   → in_progress
haiku_started            (65%)   → in_progress
analysis_ready           (80%)   → in_progress   ← Tab 1 unlocks here
haiku_call_2_queued      (85%)   → in_progress   ← Tab 2 skeleton appears
haiku_call_2_started     (87%)   → in_progress
    ↓ (one of the following closes the stream)
haiku_call_2_complete    (100%)  → completed     ← Tab 2 data ready
haiku_call_2_no_history  (100%)  → completed     ← Tab 2 shows locked/empty state
job_failed               (100%)  → failed        ← Tab 2 shows error state
```

Error events (`event: "error"`) can fire at any stage and also close the stream.

---

## Shared Payload Fields

Every event includes:

| Field         | Type    | Notes                                              |
|---------------|---------|----------------------------------------------------|
| `analysis_id` | string  | Primary key for this analysis                      |
| `event`       | string  | Event name (see tables below)                      |
| `percentage`  | integer | Pipeline progress 0–100                            |
| `status`      | string  | `in_progress` · `completed` · `failed`             |
| `session_id`  | string  | User session reference                             |
| `user_id`     | string  | User reference                                     |

---

## Haiku Call 1 Events (W7 — unchanged)

### `upload_received`
```json
{
  "analysis_id": "...", "event": "upload_received", "percentage": 10,
  "status": "in_progress", "filename": "squat.mp4", "size_mb": 42.1,
  "created_at": "2026-05-22T10:00:00Z"
}
```

### `mediapipe_started`
```json
{ "analysis_id": "...", "event": "mediapipe_started", "percentage": 20,
  "status": "in_progress", "video_url": "gs://..." }
```

### `mediapipe_complete`
```json
{ "analysis_id": "...", "event": "mediapipe_complete", "percentage": 40,
  "status": "in_progress", "rep_count": 8, "fps": 30,
  "keypoints_detected": 33, "frames_processed": 240 }
```

### `biomechanics_complete`
```json
{ "analysis_id": "...", "event": "biomechanics_complete", "percentage": 55,
  "status": "in_progress", "rep_count": 8, "joints_computed": 6,
  "avg_confidence": 0.94 }
```

### `haiku_started`
```json
{ "analysis_id": "...", "event": "haiku_started", "percentage": 65,
  "status": "in_progress" }
```

### `analysis_ready` — Tab 1 unlocks
```json
{ "analysis_id": "...", "event": "analysis_ready", "percentage": 80,
  "status": "in_progress", "overall_score": 74 }
```

---

## Haiku Call 2 Events (W8 — NEW)

All five events share these additional fields:

| Field          | Type        | Notes                                           |
|----------------|-------------|-------------------------------------------------|
| `job_id`       | string      | Equals `analysis_id` for Haiku Call 2           |
| `timestamp_ms` | integer     | UTC epoch milliseconds at time of emission      |
| `output`       | object/null | Progression payload (only on `complete`)        |
| `error`        | string/null | Error message (only on `job_failed`)            |

### `haiku_call_2_queued`

Fired immediately after Haiku Call 1 completes, before the job starts executing.
Frontend: show Tab 2 skeleton loader / "Generating recommendations…" state.

```json
{
  "analysis_id":  "abc-123",
  "event":        "haiku_call_2_queued",
  "percentage":   85,
  "status":       "in_progress",
  "job_id":       "abc-123",
  "timestamp_ms": 1748870400000,
  "output":       null,
  "error":        null,
  "session_id":   "sess-xyz",
  "user_id":      "user-xyz"
}
```

### `haiku_call_2_started`

Fired when the job enters `running` state (DB updated to `running`).

```json
{
  "analysis_id":  "abc-123",
  "event":        "haiku_call_2_started",
  "percentage":   87,
  "status":       "in_progress",
  "job_id":       "abc-123",
  "timestamp_ms": 1748870401000,
  "output":       null,
  "error":        null
}
```

### `haiku_call_2_complete` ★ terminal

Fired when the progression job completes successfully.
Frontend: replace Tab 2 skeleton with full progression output.

```json
{
  "analysis_id":  "abc-123",
  "event":        "haiku_call_2_complete",
  "percentage":   100,
  "status":       "completed",
  "job_id":       "abc-123",
  "timestamp_ms": 1748870410000,
  "output": {
    "progression_verdict":    "Your overall form improved 6 points — keep the weight and dial in depth.",
    "progress_direction":     "up",
    "weight_recommendation": {
      "action":           "hold",
      "target_weight_kg": 20.0,
      "reason":           "Form improving — one more session at this weight before progressing."
    },
    "focus_this_week":        "Push knees out over pinky toe on every rep.",
    "posture_trend":          "up",
    "stability_trend":        "stable",
    "range_of_motion_trend":  "up",
    "movement_quality_trend": "stable"
  },
  "error": null
}
```

### `haiku_call_2_no_history` ★ terminal

Fired when the pre-condition check finds no previous session.
**This is not an error** — the job exits cleanly. Frontend: resolve skeleton and show
"Complete another session to unlock your progress view" (locked/empty state, no retry).

```json
{
  "analysis_id":  "abc-123",
  "event":        "haiku_call_2_no_history",
  "percentage":   100,
  "status":       "completed",
  "job_id":       "abc-123",
  "timestamp_ms": 1748870402000,
  "output":       null,
  "error":        null
}
```

### `job_failed` ★ terminal

Fired when the progression job fails (API error, timeout, or unexpected exception).
Frontend: Tab 2 shows a non-blocking error state (Tab 1 is unaffected).

```json
{
  "analysis_id":  "abc-123",
  "event":        "job_failed",
  "percentage":   100,
  "status":       "failed",
  "job_id":       "abc-123",
  "job_type":     "haiku_call_2",
  "error_code":   "HAIKU_CALL_2_TIMEOUT",
  "timestamp_ms": 1748870431000,
  "output":       null,
  "error":        "Progression job timed out."
}
```

**`error_code` values for `job_failed` with `job_type="haiku_call_2"`:**

| `error_code`           | Cause                                              | Retryable |
|------------------------|----------------------------------------------------|-----------|
| `HAIKU_CALL_2_TIMEOUT` | Haiku API did not respond within 30 s              | Yes       |
| `HAIKU_CALL_2_FAILED`  | Unexpected exception (parse error, DB error, etc.) | Maybe     |

---

## Error Events (any stage)

`event: "error"` fires on fatal pipeline failures that block the whole result.
Stream closes immediately. Distinct from `job_failed` which is Tab 2–only.

```json
{
  "analysis_id": "abc-123",
  "event":       "error",
  "error_code":  "BIOMECHANICS_COMPUTE_ERROR",
  "error_stage": "biomechanics",
  "retryable":   "true",
  "message":     "Something went wrong reading your movement data.",
  "status":      "failed"
}
```

**`error_stage` values:**

| `error_stage`   | What failed                                    | Tab 1 | Tab 2 |
|-----------------|------------------------------------------------|-------|-------|
| `quality_gate`  | Bad video (occlusion, out of frame, too short) | ✗     | ✗     |
| `biomechanics`  | MediaPipe computation crash                    | ✗     | ✗     |
| `haiku_call_1`  | Form analysis (Haiku Call 1) failed            | ✗     | ✗     |
| `opencv_part_2` | Frame extraction failed (partial)              | ✓     | ✓     |
| `haiku_call_2`  | *Use `job_failed` — not this event*            | ✓     | ✗     |
| `pipeline`      | Worker crash / unhandled exception             | ✗     | ✗     |

---

## Frontend Integration Checklist (Squad 1)

- [ ] Watch SSE stream for `haiku_call_2_queued` → show Tab 2 skeleton / "Generating recommendations…"
- [ ] On `haiku_call_2_started` → optionally pulse / animate the skeleton
- [ ] On `haiku_call_2_complete` → replace skeleton with `output` payload; render progression UI
- [ ] On `haiku_call_2_no_history` → resolve skeleton; show "Complete another session to unlock your progress view" (no retry, no error icon)
- [ ] On `job_failed` (where `job_type === "haiku_call_2"`) → Tab 2 shows non-blocking error; Tab 1 unaffected
- [ ] Stream closes on any terminal event (`status === "completed"` or `status === "failed"`) — no manual close needed

---

*Kinetic · S2-W8-04 · June 2026*
