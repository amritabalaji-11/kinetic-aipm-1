# Goblet Squat — Coaching Reference & Gold Standard Angles

**Kinetic · Haiku Call 1 · Coaching Language Reference**

*Version 3.0 — May 2026 · Weighted penalty system + threshold refinement*

> **Purpose:** It encodes clinically sourced angle targets, root cause drills, per-parameter coaching language,
> and exercise prescriptions. All angle ranges are in **MediaPipe interior angle convention**
> unless explicitly labelled otherwise. Smaller MediaPipe angle = more deeply bent.

---

## PART 1 — GOLD STANDARD ANGLE TARGETS

### 1.1 Angle Convention Reminder

| Position | MediaPipe interior | Conventional flexion |
|---|---|---|
| Standing upright | ~170–175° | ~5–10° flexion |
| Hip crease at knee level (parallel) | ~95–105° | ~75–85° flexion |
| Hip crease below knee (good depth) | ~65–90° | ~90–115° flexion |
| Full depth / ATG | ~45–65° | ~115–135° flexion |

**Conversion:** `conventional_flexion = 180 − MediaPipe_interior`

**Rule:** When coaching, always cite the MediaPipe number from the JSON (it matches the OpenCV overlay the user sees on screen). Then translate it into plain-language depth description.

---

### 1.2 Front / Angled Camera — Target Ranges

*Frontal-plane metrics (valgus, hip asymmetry, lateral shift) are primary here.
Depth angles are readable but less precise than side view.*

> ⚠️ **Ankle dorsiflexion from front camera:** Shin angle is a sagittal-plane measurement. From a front-facing camera, MediaPipe z-axis estimation is less reliable. The ⚠️ row above uses wider bands. Confirm restriction with heel lift visibility and knee valgus ratio — do not apply severity grading solely from front-camera shin angle.

| Parameter | Excellent | Good | Mild deviation | Moderate deviation | Severe deviation |
|---|---|---|---|---|---|
| **Knee angle at bottom** (interior °) | 65–90° | 91–105° | 106–115° | 116–125° | 126°+ |
| **Trunk lean from vertical** (°) | 5–18° | 19–28° | 29–38° | 39–50° | 51°+ |
| **Ankle dorsiflexion** (shin from vert.) ⚠️ | ≥ 25° | 18–24° | 10–17° | 0–9° | < 0° / heel up |
| **Knee gap / hip gap ratio** | 0.98–1.15 | 0.92–0.97 | 0.85–0.91 | 0.72–0.84 | 0.00–0.71 |
| **Hip height asymmetry** (L vs R mm) | 0–4 mm | 5–8 mm | 9–14 mm | 15–22 mm | 23 mm+ |
| **Lateral trunk shift** (shoulder vs hip) | 0–1.5 cm | 1.6–3 cm | 3.1–5 cm | 5.1–7 cm | 7 cm+ |
| **Descent tempo** (eccentric seconds) | 1.8–2.8 s | 1.4–1.79 s | 1.0–1.39 s | 0.6–0.99 s | <0.6 s |
| **Ascent tempo** (concentric seconds) | 1.0–2.0 s | 0.7–0.99 s | 0.5–0.69 s | 0.3–0.49 s | <0.3 s |
| **Pause at bottom** | 0.5–1.5 s | 0.3–0.49 s | <0.3 s | — | — |

**JSON format for S2 injection (front/angled camera):**
```json
{
  "knee_angle_bottom":          { "excellent": [65, 90],  "good": [91, 105], "unit": "degrees_mediapipe" },
  "trunk_lean_from_vertical":   { "excellent": [5, 18],   "good": [19, 28],  "unit": "degrees" },
  "ankle_dorsiflexion":         { "excellent": [25, 99],  "good": [18, 24],  "unit": "degrees", "note": "front camera — use good range only for weighted deviation" },
  "knee_gap_hip_gap_ratio":     { "excellent": [0.98, 1.15], "good": [0.92, 0.97] },
  "descent_tempo_s":            { "excellent": [1.8, 2.8], "good": [1.4, 1.79] },
  "ascent_tempo_s":             { "excellent": [1.0, 2.0], "good": [0.7, 0.99] }
}
```

---

### 1.3 Side Camera (Left or Right) — Target Ranges

*Sagittal-plane metrics are primary here. Valgus cannot be assessed from side view.*

| Parameter | Excellent | Good | Mild deviation | Moderate deviation | Severe deviation |
|---|---|---|---|---|---|
| **Knee angle at bottom** (interior °) | 45–70° | 70–90° | 90–110° | 110–140° | 140°+ |
| **Trunk lean from vertical** (°) | 5–20° | 20–30° | 30–40° | 40–50° | 50°+ |
| **Ankle dorsiflexion** (shin from vert.) | ≥ 30° | 20–29° | 10–19° | 0–9° | <0° / heel lifting |
| **Descent tempo** (eccentric seconds) | 1.8–2.8 s | 1.4–1.79 s | 1.0–1.39 s | 0.6–0.99 s | <0.6 s |
| **Ascent tempo** (concentric seconds) | 1.0–2.0 s | 0.7–0.99 s | 0.5–0.69 s | 0.3–0.49 s | <0.3 s |
| **Pause at bottom** | 0.5–1.5 s | 0.3–0.49 s | <0.3 s | — | — |
| **Hip hinge pattern** | Hips track back slightly then directly down | Mostly vertical path | Forward-biased path | Pronounced forward lean from top | Good-morning pattern |

**Conventional flexion equivalents (for cross-check with image):**

| Depth level | MediaPipe interior | Conventional flexion |
|---|---|---|
| Full depth (ATG) | 45–70° | 110–135° |
| Parallel (hip = knee) | 70–90° | 90–110° |
| Just above parallel | 90–110° | 70–90° |
| Quarter squat | 110–140° | 40–70° |
| Barely bent | 140°+ | <40° |

**JSON format for S2 injection (side camera):**
```json
{
  "knee_angle_bottom":          { "excellent": [45, 70],  "good": [70, 90],  "unit": "degrees_mediapipe" },
  "trunk_lean_from_vertical":   { "excellent": [5, 20],   "good": [20, 30],  "unit": "degrees" },
  "ankle_dorsiflexion":         { "excellent": [30, 99],  "good": [20, 29],  "unit": "degrees" },
  "descent_tempo_s":            { "excellent": [1.8, 2.8], "good": [1.4, 1.79] },
  "ascent_tempo_s":             { "excellent": [1.0, 2.0], "good": [0.7, 0.99] }
}
```

---

### 1.4 Metric Validity by Camera Angle

| Metric | Front | Angled | Side (L or R) |
|---|---|---|---|
| Knee depth angle | ✅ readable | ✅ readable | ✅ most reliable |
| Trunk lean | ✅ readable | ✅ readable | ✅ most reliable |
| Ankle dorsiflexion | ⚠️ less reliable (wider bands; confirm with heel lift + valgus) | ⚠️ less reliable | ✅ most reliable |
| Knee valgus (gap ratio) | ✅ primary metric | ✅ readable | ❌ not assessable |
| Hip height asymmetry | ✅ primary metric | ⚠️ partial | ❌ not assessable |
| Lateral trunk shift | ✅ primary metric | ⚠️ partial | ❌ not assessable |
| Ascent pattern (good morning) | ⚠️ partial | ⚠️ partial | ✅ most reliable |
| Heel rise | ⚠️ partial | ⚠️ partial | ✅ most reliable |

**Rule:** When a metric is marked ❌ for the session's camera angle, do not score or comment on it.
When marked ⚠️, use only if the deviation is large (≥ moderate range) and cross-confirmed with the 8-frame image.

---

### 1.5 Weighted Penalty System

**How deviations are calculated (v3.0):**

For each root cause and parameter:
1. Identify the "good" range from the threshold table
2. Calculate **% deviation** as: (distance from range / range width) × 100
3. Apply **Severity Multiplier** based on % deviation
4. Apply **Rep Affection Multiplier** based on what % of reps are affected
5. Calculate **Weighted Penalty** = Base Penalty × Severity Mult × Rep Affection Mult

**Severity Multiplier (based on mean % deviation):**

| Deviation % | Severity Multiplier |
|---|---|
| ≤ 10% | 0.15 |
| ≤ 25% | 0.35 |
| ≤ 50% | 0.60 |
| ≤ 75% | 0.80 |
| ≤ 100% | 0.95 |
| > 100% | 1.00 |

**Rep Affection Multiplier (based on % of reps affected):**

| Reps Affected | Rep Affection Multiplier |
|---|---|
| ≤ 25% | 0.40 |
| ≤ 50% | 0.70 |
| ≤ 75% | 0.90 |
| > 75% | 1.00 |

**Base Penalties (unchanged):**

| Root Cause Severity | Base Penalty |
|---|---|
| Mild | −8 |
| Moderate | −15 |
| Severe | −25 |

**Example Calculation:**
```
RC1 (ankle restriction), front camera:
  Measurement: 23.5° dorsiflexion
  Good range: 18–24° (width = 6°)
  Deviation: |23.5 − 21| / 6 × 100 = 42%
  Severity mult: 0.60x (for 25–50% range)
  Affected reps: 6 of 7 = 86%
  Rep affection mult: 1.00x (>75%)
  Base penalty: −15 (moderate)
  Weighted: −15 × 0.60 × 1.00 = −9
```

---

## PART 2 — ROOT CAUSE TAXONOMY & DRILLS

### RC1 — Ankle Dorsiflexion Restriction *(most common root cause)*

**Signature:**
- Shin angle < 30° (side camera) or < 25° (front camera) at the bottom of the squat
- Forward lean compensating for restricted ankle mobility
- Heel rise on descent or at bottom
- Possible: knee valgus as a downstream compensation

**Severity assessment (side camera primary):**
- Mild restriction: 20–29° shin angle from vertical — parallel achievable with compensation
- Moderate restriction: 10–19° — cannot reach parallel heels-flat
- Severe restriction: < 10° or visible heel lift — heels rise immediately

**Front camera note:** Use % deviation via weighted penalty system (PART 1.5). Good range is 18–24°.

**Causal chain:** Restricted ankle → shin cannot track forward → hips forced to shift back or torso leans forward → depth becomes insufficient OR trunk leans excessively → can cause valgus as a tertiary compensation

**Key rule:** If forward lean + depth deficit + valgus are all present in the same session → check ankle first. If ankle is restricted, this is ONE root cause driving all three symptoms. Apply one penalty to range_of_motion_score. Do NOT penalise forward lean and depth separately.

**Within-set cue:**
> "Next rep: focus on pushing your knees out and forward over your pinky toe as you sit down. Keep your heels firmly on the floor the entire way."

**Drills — Next Session:**
1. **Banded ankle circles** — 20 reps each foot before squatting. Loop a band around the ankle and around a rack, then move the knee in circles while keeping the heel down.
2. **Wall ankle stretch** — face a wall, toes 5cm away, knee touches wall without heel lifting. Move foot back until you can just touch. 3×30s each side.
3. **Heel-elevated goblet squats (3×8)** — elevate heels 1.5–2.5cm on plates or a wedge. Same weight as session. This allows depth practice while the ankle mobility is being developed. Reduce elevation over 4–6 weeks as mobility improves.
4. **Calf/soleus SMR** — 60-second foam roll each calf before squatting. Focus on the lower calf (soleus), not just the belly of gastrocnemius.

**Coaching language — ankle restriction:**
> "Your shin angle is [X]° — good mobility starts at 30° (the target for a comfortable, full-depth squat). At [X]°, your ankle isn't allowing the shin to track far enough forward over your foot. To compensate, either your heel wants to rise, or your torso leans forward. Both limit depth and shift load onto your lower back instead of your quads and glutes."

---

### RC2 — Glute / Hip Abductor Weakness

**Signature:**
- Knee gap / hip gap ratio < 0.95 (front/angled camera)
- Knees cave inward (valgus), especially on ascent
- Pattern: valgus worsening in later reps = fatigue-driven weakness

**Severity assessment:**
- Mild: ratio 0.85–0.94 (use weighted penalty: ~30% deviation from 0.92–0.97 range)
- Moderate: ratio 0.70–0.84 (use weighted penalty: ~80% deviation)
- Severe: ratio < 0.70 (use weighted penalty: >100% deviation, clamped to 1.00x)

**Causal chain:** Weak glutes/abductors → insufficient lateral force to keep knees tracking over toes → knees collapse inward during descent and especially on ascent drive

**Key rule:** Distinguish from RC1-driven valgus. If valgus appears only in later reps (from rep 5+) with clean reps 1–4 → RC2 (fatigue). If valgus is present from rep 1 alongside ankle restriction → likely RC1 causing both.

**Within-set cue:**
> "Next rep: as you start to stand back up, actively push your knees outward — think about spreading the floor apart with your feet. Squeeze your glutes hard at the top."

**Drills — Next Session:**
1. **Banded goblet squats (3×8–10)** — place a light resistance band just above the knees. The band provides tactile feedback; push against it throughout the set. Use the same weight.
2. **Clamshells (2×15 each side)** — lying on side, feet together, knees at 45°, rotate top knee upward. Add a band above the knee for progression.
3. **Lateral band walks (2×12 each direction)** — band above knees, slight hip hinge, walk laterally maintaining hip width. Keep toes forward.
4. **Glute bridge (3×12)** — drive through heels, full hip extension at top, 2-second hold. Progress to single-leg if bodyweight is easy.

**Metric note — distance vs ratio:**
The biomechanics JSON passes two equivalent fields for valgus. Use the ratio for severity grading against the thresholds above:
- `knee_gap_hip_gap_ratio` — use this for severity grading (matches the thresholds above)
- `knee_valgus_distance` — alternative format: distance ≈ 1 − ratio (e.g. distance 0.20 = ratio 0.80 = moderate)
- `valgus_severity` — pre-computed grade (none / mild / moderate / severe) — use this directly

**Side camera — valgus handling:**
Valgus cannot be assessed from a side-facing camera (frontal-plane measurement, not visible from the side). `stability_data` will be null for side-camera sessions.
- Do NOT score or comment on valgus from side-camera sessions.
- Exception: if RC1 (ankle restriction) is confirmed, note valgus as a *potential downstream risk* only: *"Ankle restriction at this level often causes knees to cave inward on the ascent — a front-camera session would confirm whether this is happening."* Do not assign a severity score.

**Coaching language — valgus / glute weakness:**
> "Your knee gap / hip gap ratio averaged [X] — the target is ≥0.95. What this means: your knees are tracking [X cm/degree] inside your hip line at the bottom. This shifts shear force onto the inner knee structures and reduces power transfer from your glutes. The fix is targeted abductor and glute work outside of squatting, not just cueing during the set."

---

### RC3 — Hip Flexor Tightness / Hip Mobility Deficit

**Signature (side camera best for this):**
- Butt wink at the bottom (posterior pelvic tilt, lumbar rounding)
- Hips rise faster than shoulders on ascent ("good morning" pattern)
- Trunk lean that appears predominantly at the hip, not the ankle

**Severity thresholds:**
- Mild: pelvic tilt only at very bottom, spine mostly neutral
- Moderate: pelvic tilt beginning before parallel depth
- Severe: consistent good-morning pattern throughout ascent

**Causal chain:** Tight hip flexors / limited hip internal rotation → pelvis tilts posteriorly under load → lumbar spine rounds to compensate → either limits depth or creates back-dominant ascent pattern

**Key rule:** Only flag RC3 if forward lean is present WITHOUT ankle restriction. If both ankle restriction and forward lean are present, RC1 is the primary cause. RC3 acts independently when the shin angle is adequate (≥20°) but lean/butt-wink still occurs.

**Within-set cue:**
> "Next rep: as you hit the bottom, brace your core hard and think 'chest up' before you drive up. Hips and shoulders should rise together — don't let your hips shoot first."

**Drills — Next Session:**
1. **Hip flexor stretch (kneeling)** — lunge position, rear knee on floor, push hips forward while keeping torso tall. 3×45s each side before squatting.
2. **90/90 hip stretch** — seated, one leg in front (90°), one behind (90°), rotate toward front leg while keeping chest tall. 2×60s each side.
3. **Goblet squat with pause at bottom (3×6)** — same weight, sit into the bottom for 3 seconds, focus on keeping lumbar neutral. This builds the hip mobility pattern under load.
4. **Dead bugs (2×10 each side)** — anti-extension core work to support pelvic control under the squat load.

**Coaching language — hip mobility:**
> "Your hips are rising ahead of your shoulders on the way up — this is a 'good morning' pattern. At a [trunk lean]° lean, the movement is shifting load from your quads and glutes to your lower back and hamstrings. The root cause is hip flexor tightness limiting full hip flexion at depth, which forces the pelvis to tip back and the torso to follow."

---

### RC4 — Load-Relative Strength Deficit

**Signature:**
- Form is clean in reps 1–3, deteriorates progressively across the set
- NOT a mobility or stability issue — technique is present when fresh

**Severity assessment:**
- Mild: deterioration in final 1–2 reps only
- Moderate: deterioration from rep 4–5 onward
- Severe: deterioration from rep 2–3

**Causal chain:** Weight is above current strength threshold for full-set quality → muscular fatigue causes progressive breakdown in depth, posture, or stability

**Key rule:** This is a weight selection issue ONLY. Do NOT prescribe corrective exercises — the athlete has the movement. Recommendation = reduce weight by 10–20% next set to maintain quality across the full set. If set_number is 2nd or 3rd and rep count is high (8+), late-rep breakdown is more likely fatigue than RC4 — note this distinction.

**Within-set cue:**
> "Next set: drop the weight by 2–4kg and focus on maintaining the form quality you had in rep 1 all the way through the last rep."

**Coaching language — load deficit:**
> "Reps 1–[X] look strong — good depth, upright torso. From rep [Y] onward, [specific deterioration]. This isn't a technique problem; you have the movement pattern. The weight is slightly above your current capacity to hold that standard for the full set. Reduce by [X kg] next set and see if you can maintain rep 1 quality all the way through."

---

### RC5 — Thoracic Spine / Upper Back Mobility *(rare in goblet squat)*

**Signature:**
- Upper back rounding and chest dropping forward
- Trunk lean is concentrated in upper thoracic region, not hip
- Shoulder rounding, elbows dropping

**Note:** The goblet squat's front-loaded counterbalance naturally promotes an upright torso. RC5 is only present when:
1. Ankle dorsiflexion is adequate (≥20°) — RC1 not responsible for lean
2. Hip mobility is adequate — RC3 not responsible
3. A distinct upper-back rounding pattern is visible in the 8-frame image

**Severity thresholds:**
- Mild: slight upper back rounding at depth only
- Moderate: chest drop from standing to bottom throughout
- Severe: significant kyphosis, elbows cannot maintain cup-of-dumbbell position

**Within-set cue:**
> "Next rep: before you descend, take a big breath in, brace your core, and squeeze your shoulder blades together. Keep your elbows pointing down throughout — don't let them flare."

**Drills — Next Session:**
1. **Thoracic spine foam roll (60s)** — extension over the roller at mid-back, 5–6 positions from lower-thoracic to upper-thoracic.
2. **Cat-cow (2×10 slow)** — controlled lumbar and thoracic segmental movement to open the spine before loading.
3. **Wall slide (2×10)** — stand with back against wall, arms in goalpost, slide arms overhead while maintaining contact. Builds thoracic extension under load.
4. **Reduce weight slightly** — use a lighter load to allow bracing and positioning before adding load again.

**Coaching language — thoracic mobility:**
> "The forward lean is concentrated in your upper back rather than your hips — your chest is dropping forward, not your hips shooting back. The goblet squat's front load should naturally counterbalance this, but limited thoracic extension is preventing you from keeping your chest up through the full range."

---

## PART 3 — PER-PARAMETER COACHING LANGUAGE

### 3.1 Range of Motion (weight: 35%)

**What to affirm when good:**
- "Depth is consistent — hip crease below knee on [X] of [Y] reps."
- "Your hips are hitting full depth across [X–Y] reps — that's exactly where your glutes switch on."
- "Depth held through the final reps — you're maintaining quality under fatigue, which is the harder part."

**What to observe when limited:**
- "Your hips stayed above your knees on [X] reps. The target is hips below knee level. At this height, your quads and glutes aren't getting the full stimulus they need."
- "Depth was inconsistent — early reps [X, Y] went deeper, but later reps [Z, W] got shallower. Fatigue is cutting the range short."
- "Your ankle mobility is limiting how far your shins can track forward, which is preventing you from reaching full depth without forward lean compensation."

**Feedback language:**
- Pair the measurement with the physical consequence, then give the fix.
- Never say "you need to go deeper" without explaining why depth matters for this individual.
- **Don't highlight single-rep outliers as observations** — if rep 1 is shallow but reps 2+ are good, frame it as a warm-up pattern, not a form issue.
- **Avoid technical terms** (MediaPipe, interior angle, RC1, RC2, etc.) — use plain language (knee angle, hip position, shin angle). RC1-5 are internal reference docs, NOT user-facing language.
- **Prioritize the main pattern** — focus coaching on what matters across the majority of reps, not anomalies.
- **Never have contradictory affirmation + observation in the same parameter** — if affirmation says "controlled," observation cannot say "elevated across all reps." Choose one clear message.
- **If an issue affects only 1-2 reps out of 8-10, it's an outlier** — don't mention it unless it's a learning pattern (e.g., "reps 1-2 were shallower, but you found depth by rep 3").

---

### 3.2 Stability (weight: 25%)

**What to affirm when good:**
- "Knee tracking is solid — your knees stayed in line with your toes throughout."
- "Lateral stability is consistent — no trunk shift detected across all reps."
- "Valgus ratio [X] — knees are tracking at hip width or wider. Good control."

**What to observe when limited:**
- "Knee gap / hip gap ratio averaged [X] — your knees are tracking inside your hips at the bottom. Target is ≥0.95. At [X] ratio, you're getting medial knee loading on every rep."
- "Valgus appeared in reps [X, Y, Z] — [early/mid/late] phase of each rep. The pattern [worsening in later reps / consistent from rep 1] suggests [fatigue-driven weakness / positional habit]."
- "Lateral trunk shift of approximately [X] cm was visible — this suggests one hip is compensating for the other."

---

### 3.3 Posture (weight: 25%)

**What to affirm when good:**
- "Torso stayed upright — trunk lean averaged [X]°, which is excellent for a goblet squat."
- "Lumbar position held neutral throughout — no butt wink detected."
- "Core bracing looked solid — torso angle stayed consistent rep to rep."

**What to observe when limited:**
- "Trunk lean reached [X]° by rep [Y] — the ideal range is [Z]° ([camera]). At [X]°, your lower back is taking over from your glutes and quads as the primary driver."
- "Butt wink appeared at the bottom position — your pelvis is tilting posteriorly at depth, which increases lumbar flexion under load."
- "Trunk lean is increasing as the set progresses — reps 1–3 averaged [A]°, reps [B–C] averaged [D]°. Fatigue is reducing the thoracic bracing that keeps you upright."

---

### 3.4 Movement Quality (weight: 15%)

**What to affirm when good:**
- "Descent control is excellent — [X]s average is exactly the target range."
- "Ascent is smooth — no hips-first pattern detected."
- "Tempo is consistent across all reps — you're not rushing under fatigue."

**What to observe when limited:**
- "Descent averaged [X]s — the target is 1.8–2.8s. At [X]s, you're lowering too quickly to build eccentric tension, which reduces the strength stimulus and makes the bottom position harder to control."
- "Ascent averaged [X]s — faster than the target range. The initial drive is hips-first, which shifts load to the posterior chain and away from the quads."
- "Tempo dropped in later reps — descent went from [A]s in reps 1–3 to [B]s in reps [X–Y]. Fatigue is causing you to rush through the harder part of the movement."

---

## PART 4 — WITHIN-SET CUES (ready-to-use by parameter)

These are single, specific cues the athlete can apply **on the very next rep or next set within the same session**. Use exactly one cue that targets the primary root cause.

### Depth / Range of Motion Cues
- "Sit *down*, not back — keep your weight balanced across your whole foot."
- "Find the floor with your heels before you descend, then stay there."
- "Think about your hip crease dropping below your kneecap — that's the target position."
- "On the way down, count two seconds minimum before you change direction."
- "Push your knees apart over your pinky toe as you sit — this creates space for your hips."

### Stability / Valgus Cues
- "Spread the floor apart with your feet — external rotation thought, even if your feet don't move."
- "Push your knees out over your little toe the moment you start to rise."
- "Squeeze your glutes hard before you push up — don't let the knees lead the movement."
- "Imagine you're trying to widen the space between your knees throughout the whole rep."

### Posture / Torso Cues
- "Big breath in at the top, brace hard before you descend — stay braced until you're back up."
- "Keep the weight between your hands at chest height, not drifting down to your belly."
- "Chest up — think about showing the logo on your shirt to someone in front of you."
- "On the ascent: chest and hips rise together — not hips first."

### Tempo / Movement Quality Cues
- "Slow the descent to a 2-count — don't drop into the bottom."
- "Pause one full second at the bottom before driving up."
- "Drive through both heels equally on the way up — feel the floor."

---

## PART 5 — NEXT SESSION DRILL LIBRARY

### Mobility Prep (pre-squat — every session)
| Drill | Sets × Reps | Target | When |
|---|---|---|---|
| Banded ankle circles | 1 × 20 each | Ankle dorsiflexion | Pre-session |
| Wall ankle mobility | 2 × 30s each | Ankle dorsiflexion | Pre-session |
| Kneeling hip flexor stretch | 2 × 45s each | Hip flexor | Pre-session |
| 90/90 hip rotations | 2 × 60s each | Hip internal rotation | Pre-session |
| Thoracic foam roll | 1 × 60s | Thoracic extension | Pre-session |
| Cat-cow (slow) | 2 × 10 | Spinal segmentation | Pre-session |

### Corrective Loading Drills
| Drill | Sets × Reps | Target RC | Load |
|---|---|---|---|
| Heel-elevated goblet squat | 3 × 8 | RC1 | Same as session weight |
| Banded goblet squat | 3 × 10 | RC2 | Same as session weight |
| Goblet squat with pause at bottom | 3 × 6 | RC3 | Same as session weight |
| Lateral band walks | 2 × 12 each dir | RC2 | Bodyweight + band |
| Glute bridge | 3 × 12 | RC2 | Bodyweight or single-leg |
| Clamshells | 2 × 15 each | RC2 | Bodyweight or banded |
| Wall slides | 2 × 10 | RC5 | Bodyweight |
| Hip flexor stretch | 2 × 45s | RC3 | Bodyweight |
| Thoracic foam roll | 1 × 60s | RC5 | Bodyweight |

---

## PART 6 — VERDICT LANGUAGE GUIDE

**Map your overall_form_score to a verdict label and opening sentence:**

| Score Range | Label | Opening Tone | Example Structure |
|---|---|---|---|
| 90–100 | Excellent | Affirm + single cue for progression | "Form is excellent across all parameters. [Specific praise]. Next challenge: [progression cue]." |
| 80–89 | Maintain | Affirm + one minor refinement | "Depth and posture are solid. The one thing to refine for the next set is [specific cue]." |
| 75–79 | Maintain | Affirm + one issue to address | "Good work on [parameter]. The issue is [specific fault]. Fix: [cue]." |
| 60–74 | Work on it | Lead with strength + one root cause | "Your [param] is strong. The limiting factor is [root cause]. Address: [cue]." |
| 40–59 | Significant issue | Honest + causal chain | "Form shows [fault1] and [fault2], but they share one root cause: [RC]. Fix the root cause first." |
| 0–39 | Severe | Safety-first + medical referral if needed | "This isn't safe at this load. [Specific danger]. Reduce weight significantly or consult a professional." |

---

## PART 7 — PAIN INTEGRATION

If user_pain_level is reported (1–3 mild, 4+ severe), integrate into next_session_focus as the FIRST point:

**Mild pain (1–3):**
- FIRST point: "Monitor your discomfort — go lighter on the next set and assess how it feels. Stop immediately if pain persists or worsens."
- Then add 1–2 corrective drills.
- Total = 2–3 points.

**Severe pain (4+):**
- ONLY point: "Consult a physiotherapist or sports medicine professional before continuing this exercise. Do not work through severe pain without proper supervision."
- Skip all drills.
- Total = 1 point (medical referral only).

---

*Kinetic · Goblet Squat Coaching Reference · v3.0 · May 2026*
*Weighted penalty system for proportional scoring based on deviation magnitude and rep affection.*
