# DB Deadlift — guide content (DRAFT, not reviewed by a trainer)

Catalogue entries this covers: `ex_025` DB Deadlift.
Status: **draft**. Nothing here is shown to users until it is marked reviewed.
Items marked **[CONFIRM]** are choices where sources differ or a trainer should decide.

Updated with the chosen video (Live Lean TV, "Perfect Dumbbell Deadlift Form for Beginners (5-Step Checklist)") and its captions. The captions are paraphrased here, not copied.

## Where each part goes on the page (same structure as the Goblet Squat)

| Part of the page | Field in `exerciseGuides.js` | Deadlift content below |
|---|---|---|
| Title, one-line summary, pills (level, equipment, category) | `summary`, `level` | Top of page |
| Video beside "3 key cues", Listen button | `video`, `keyCues` | Video + 3 key cues |
| **Stance** card | `stance` | Stance |
| **Depth** card (for the deadlift: "How low") | `depth` | How low to go |
| Breathing / Tempo / Sets and reps tiles | `breathing`, `tempo`, `setsReps` | Quick view |
| Muscle map | `muscles` | Top of page |
| Folded: How to do it (setup, movement, weight) | `setup`, `movement`, `startWeight` | How to do it |
| Folded: Common mistakes | `mistakes` | Common mistakes |
| Folded: Too hard? Too easy? | `easier`, `harder` | Make it easier / harder |
| Folded: Safety, and the draft note | `safety`, `status` | Safety |
| Audio: Listen button (about 50 s) and Next up card (about 30 s) | scripts in Neon, written from all the fields above | Written after you approve this text |

## Top of page
- **One-line summary:** Push your hips back, lower the weights down your legs with a flat back, then stand tall by driving through your heels.
- **Level:** Beginner – Intermediate. Learn the hip hinge with no weight first.
- **Equipment:** Two dumbbells.
- **Main muscles:** Glutes, hamstrings.
- **Helping muscles:** Lower back (holds your position), upper back, core, forearms (grip).
- **Starting weight:** Light. A weight you can control for 8–12 reps (ACE). Add weight slowly once the hinge feels automatic.

## Video
- **Chosen:** https://www.youtube.com/shorts/YQgs03p3UxE (Live Lean TV, vertical Short, about 75 seconds). It allows embedding (checked).
- **[CONFIRM]** I have read its captions, not watched it. Please check: it is filmed from the side, the dumbbells are held where the captions say, and the form matches this guide. The captions mention both "at your sides" and "in front of your thighs".

## Stance
Feet hip-width apart, toes turned out slightly, knees soft. Brace your core, as if you were about to take a punch.
*(video: stance; draft had hip-width only)*

## 3 key cues
1. Push your hips back, like closing a car door behind you with your bottom. This is a hinge, not a squat. *(video, ACE)*
2. Keep the weights close to your legs and your back long and flat, from head to tailbone. Neck in line with your spine. *(video, ACE)*
3. Drive through your heels to stand tall. Squeeze your glutes and pull your shoulder blades back at the top. Don't lean back. *(video, ACE)*

## Quick view
- **Breathing:** In and brace as you start to hinge, out as you stand. **[CONFIRM]** The video says breathe in as you hinge down. The earlier draft said brace before lowering. ACE gives no instruction. Same wording as the Goblet Squat, for consistency.
- **Tempo:** 2 seconds down, 1 second reset at the bottom, up in about 1 second. *(the video says "slowly" down and "with control" at the top)*
- **Sets and reps:** 2–3 sets of 8–12 *(ACE)*.

## How low to go (the "Depth" card)
- **Goal:** About knee height, or just past it, as far as you can keep your back flat. It depends on your hamstring and hip mobility, so it is a goal, not a must.
- **Stop going down when:** your back starts to round, your knees start to bend a lot (it is turning into a squat), or the weights drift away from your legs.
- **After the stop point:** That is your depth for today. Reset for one second, then stand. Don't chase more depth.
- **Posture note:** Chest stays up and your core stays tight the whole way.
- **[CONFIRM] depth target:** the video says lower "just past your knees". The earlier draft (from ACE and fitness articles) said "about mid-shin". Mid-shin is deeper and needs more mobility. I used the video's shallower target because the audience is beginners, and mid-shin can be a "when you're ready" note. A trainer should decide.

## How to do it
**Setup**
1. Stand tall with feet about hip-width apart, toes slightly out, a soft bend in your knees.
2. Dumbbells: at your sides if you are just starting (easier to balance), or in front of your thighs, palms facing you, for more glute and hamstring work. **[CONFIRM]** which one is the default. The earlier draft used "in front".
3. Shoulders back and down, chest up, neck in line with your spine. Picture a broomstick running from your head to your tailbone.
4. Breathe in and brace your core.

**Movement**
1. Push your hips straight back. Let the dumbbells slide down your legs, close to your body.
2. Knees stay soft, not locked, and bend only a little. Back long and flat.
3. Lower to about knee height or just past it, or as far as you can keep your back flat. Stop there.
4. Drive through your heels and push your hips forward to stand. Shoulders and hips rise together.
5. At the top, squeeze your glutes and pull your shoulder blades back. Stand tall, don't lean back.

## Common mistakes
| Mistake | Fix |
|---|---|
| Rounding the back | Keep your shoulder blades, back and hips in one straight line. If you can't, stop a little higher and practise the hinge with no weight first. **[CONFIRM]** The straight-line cue is from Amrita, not from the video or ACE. A trainer should check the wording. |
| Turning it into a squat (knees bend a lot, hips drop low) | Push your hips back first; your shins stay almost vertical. |
| Locking the knees | Keep a soft bend. Don't lock them straight. |
| Dumbbells drift away from your legs | Keep them brushing your legs the whole way. |
| Pulling with the arms or shoulders | Arms stay long and loose. The strength comes from your legs and hips. |
| Leaning back at the top | Stand tall and squeeze your glutes. Stop when your hips are fully forward. |
| Looking up or craning the neck | Keep your neck in line with your spine. Look at the floor a few steps ahead. |

## Make it easier
| Step | What changes | Pick this if… |
|---|---|---|
| **Wall Hip Hinge** (new) | No weight. Stand a foot from a wall with your back to it, push your hips back until your bottom taps the wall, then stand. | You can't keep your back flat, or feel it in your lower back. Do 10–15 good hinges before adding weights (ACE). |
| **Raised Deadlift** (new) | Rest the dumbbells on blocks or sturdy books so you start higher. | You can hinge with no weight but can't reach knee height with a flat back. |
| **KB Deadlift** (`ex_095`) | One kettlebell or vertical dumbbell, held between your feet. | Two dumbbells feel awkward or you want a lighter start. |

## Make it harder
| Step | What changes | Pick this if… |
|---|---|---|
| **Barbell Deadlift** (`ex_015`) | The same hinge with a barbell. With dumbbells, your arms and grip tend to give way before your legs and hips do. A barbell carries more weight, so your legs and hips can lift heavier. | You can do 12 clean reps and the dumbbells you have feel too light, or your arms tire first. |
| **One-Arm DB Deadlift** (new) | One dumbbell at your side, same hinge. The uneven load works your hips and core harder. | You can do 12 clean reps with two dumbbells. Do the same reps each side. |

## Safety
- Stop if you feel sharp pain in your back, or pain running down a leg.
- If you've had back pain or an injury, ask a doctor or physio before loading this.
- ACE's advice: "If the weight doesn't feel right, leave it on the floor." Control the weights; don't drop them from height.
- If you have high blood pressure or a heart condition, ask your doctor before bracing hard and holding your breath.

## What the video added to the earlier draft
- **Stance:** toes slightly out, and the "about to take a punch" brace.
- **Dumbbell position:** at the sides for beginners, in front of the thighs for more glute and hamstring work.
- **Cues:** the "closing a car door with your bottom" image, "broomstick from head to tailbone", "soft, not locked" knees, and "don't squat".
- **Finish:** squeeze the glutes and pull the shoulder blades back at the top.
- **Depth:** "just past your knees", which is shallower than the earlier mid-shin.

## Sources
- Live Lean TV, "Perfect Dumbbell Deadlift Form for Beginners (5-Step Checklist)" (YouTube Short): stance, dumbbell position, hinge cues, drive, finish. Auto-captions read; the video itself not yet watched. https://www.youtube.com/shorts/YQgs03p3UxE
- ACE CERTIFIED: "The ACE Do It Better Series: The Deadlift" (Pete McCall, December 2024): hinge cues, bar path close to the body, mistakes, 8–12 controlled reps, regressions, safety quote. https://www.acefitness.org/continuing-education/certified/december-2024/8762/the-ace-do-it-better-series-the-deadlift/
- ACE: "4 Deadlift Variations to Spice Up Your Programming" (Pete McCall, 2018): "strength should come from your legs and hips, NOT your shoulders", one-arm version. https://www.acefitness.org/resources/pros/expert-articles/7073/4-deadlift-variations-to-spice-up-your-programming/
- From search summaries only (not read in full): ACE Romanian deadlift article (build to 10–15 good hinges before adding weight); Fit&Well and LIVESTRONG (wall hinge drill, depth checkpoints), treated as secondary.
