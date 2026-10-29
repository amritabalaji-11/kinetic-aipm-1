"""Write the spoken "trainer" scripts for exercise guides, using an AI model, and store them in the database.

The guide's points (frontend/src/data/exerciseGuides.js) stay the source of truth. This turns them into something that
sounds like a coach talking to you, and saves it in the exercise_guides table as a DRAFT for a person to read and approve.

    cd backend
    python3 scripts/generate_coach_scripts.py                    # every exercise that has a guide
    python3 scripts/generate_coach_scripts.py ex_001             # one exercise
    python3 scripts/generate_coach_scripts.py ex_001 --force     # write it again even if the guide has not changed
    python3 scripts/generate_coach_scripts.py --approve ex_001   # mark the script as checked by a person
    python3 scripts/generate_coach_scripts.py ex_001 --model claude-haiku-5-5

Which database it writes to follows DATABASE_URL in backend/.env (set DATABASE_URL= to use the local SQLite file).
"""
import argparse
import asyncio
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import anthropic  # noqa: E402

import utils.config  # noqa: E402,F401  (loads backend/.env)
from db.database import IS_POSTGRES, db  # noqa: E402
from init_db import init_db  # noqa: E402

GUIDES_JS = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "data" / "exerciseGuides.js"
DEFAULT_MODEL = "claude-sonnet-5-5"  # written once per exercise, so quality matters more than price

# Spoken pace is about 150 words a minute
FULL_WORDS = (105, 140)  # about 45-55 seconds: the Listen button on the exercise page (coaching, then what to avoid)
SHORT_WORDS = (55, 80)   # about 30 seconds: the "Next up" card between sets

SYSTEM_PROMPT = """You write short spoken coaching scripts for a fitness app. Each script is read aloud by a text-to-speech \
voice. The listener is one person, in the gym, about to do the exercise, wearing earphones. They are usually a beginner \
or intermediate, of any gender or fitness level.

Voice: a warm, encouraging personal trainer talking directly to them. Motivating but grounded: calm confidence, not hype. \
Conversational, like a person talking, not reading a list.

Hard rules:
- Use ONLY the information in the guide you are given. Do not add technique advice, numbers, claims or exercises that are \
not in it. If it is not in the guide, do not say it.
- Include the stance (foot position), the depth guidance (how low to go, and when to stop going down), the key cues, the breathing, and the tempo. Include one short, calm safety reminder (stop if it hurts sharply).
- Speak to "you". Use contractions. Short sentences. Natural rhythm, with commas where a coach would pause.
- Plain text for text-to-speech: no lists, no headings, no markdown, no emojis, no brackets, no stage directions, no quotation marks.
- Write every number as words, for example "two seconds", "eight to twelve reps". Never use digits.
- Do not say "cue", "step one", "key cue number two", or read it as a list. Weave the points into one flow.
- Do not use cliches like "crush it", "beast mode", "no pain no gain", "let's go". At most two exclamation marks.
- Where to look and how to hold the head and neck: if the guide has a mistake about it, ALWAYS include that one in the "watch out for" \
part (for example "don't crane your neck up to the mirror"), together with the two or three other most common mistakes.
- Structure the full script like a coach would: a short friendly lead-in that names the exercise; the setup including the stance and how deep to go, key cues, breathing and \
tempo; then a short "watch out for" part that talks through the three or four most common mistakes from the guide, each with its quick \
fix, in plain talk (for example "if you notice your heels lifting, ..."), not as a list; then the safety reminder; then a short, genuine \
line of encouragement.

Return ONLY a JSON object with two string fields, nothing else:
{"script": "...", "script_short": "..."}
- script: the full version including the "watch out for" part, between %d and %d words.
- script_short: for the moment between sets, between %d and %d words. Only the most important reminders for the next \
set (the key cues, how deep to go and when to stop going down, and the breathing), still warm, still talking to them.""" % (*FULL_WORDS, *SHORT_WORDS)


def load_guides() -> dict:
    """Read the guides out of the front end's data file (it is plain data, so Node can print it as JSON)."""
    code = f"import {{ GUIDES }} from {json.dumps(GUIDES_JS.as_uri())}; console.log(JSON.stringify(GUIDES))"
    out = subprocess.run(["node", "--input-type=module", "-e", code], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def exercise_name(exercise_id: str) -> str:
    """The exercise's name from the catalogue, for the prompt."""
    from db.exercise_catalog import EXERCISES
    return next((e[1] for e in EXERCISES if e[0] == exercise_id), exercise_id)


def source_points(guide: dict) -> dict:
    """The parts of a guide the script is written from. If any of these change, the script is out of date."""
    keys = ["summary", "level", "stance", "depth", "keyCues", "breathing", "tempo", "setsReps", "setup", "movement", "mistakes", "safety"]
    return {k: guide[k] for k in keys if k in guide}


def fingerprint(points: dict) -> str:
    return hashlib.sha256(json.dumps(points, sort_keys=True).encode()).hexdigest()[:16]


def words(text: str) -> int:
    return len(text.split())


def problems(result: dict) -> list[str]:
    """Anything wrong with a generated script (so it can be asked to fix it)."""
    found = []
    for field, (low, high) in (("script", FULL_WORDS), ("script_short", SHORT_WORDS)):
        text = result.get(field)
        if not isinstance(text, str) or not text.strip():
            found.append(f"{field} is missing")
            continue
        if not low <= words(text) <= high:
            found.append(f"{field} is {words(text)} words; it must be between {low} and {high}")
        if re.search(r"\d", text):
            found.append(f"{field} contains digits; write numbers as words")
        if re.search(r"[*#_`\[\]()\n]", text):
            found.append(f"{field} contains formatting or line breaks; use plain sentences only")
    return found


def ask_model(client, model: str, name: str, guide: dict) -> dict:
    user = (
        f"Exercise: {name}\n\nGuide (the only facts you may use):\n"
        f"{json.dumps(source_points(guide), indent=2, ensure_ascii=False)}"
    )
    messages = [{"role": "user", "content": user}]
    for attempt in range(3):
        reply = client.messages.create(model=model, max_tokens=8000, system=SYSTEM_PROMPT, messages=messages)
        text = "".join(b.text for b in reply.content if b.type == "text")
        match = re.search(r"\{.*\}", text, re.S)
        try:
            result = json.loads(match.group(0), strict=False) if match else {}
        except json.JSONDecodeError:
            result = {}
        issues = problems(result)
        if not issues:
            return result
        print(f"  attempt {attempt + 1} needed fixing: {'; '.join(issues)}")
        if not result:
            print(f"    (the reply could not be read as JSON; it began: {text[:160]!r}, stop reason: {reply.stop_reason})")
        messages += [
            {"role": "assistant", "content": text},
            {"role": "user", "content": "Please fix this and return only the JSON again: " + "; ".join(issues)},
        ]
    raise RuntimeError("The model did not produce a script that passes the checks after 3 tries")


async def save(exercise_id: str, result: dict, model: str, digest: str):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    await db.execute(
        """
        INSERT INTO exercise_guides (exercise_id, coach_script, coach_script_short, coach_script_status, coach_script_model,
                                     coach_script_source_hash, coach_script_generated_at)
        VALUES (:id, :script, :short, 'draft', :model, :hash, :now)
        ON CONFLICT (exercise_id) DO UPDATE SET
            coach_script = excluded.coach_script, coach_script_short = excluded.coach_script_short,
            coach_script_status = 'draft', coach_script_model = excluded.coach_script_model,
            coach_script_source_hash = excluded.coach_script_source_hash,
            coach_script_generated_at = excluded.coach_script_generated_at, updated_at = excluded.coach_script_generated_at
        """,
        {"id": exercise_id, "script": result["script"], "short": result["script_short"], "model": model, "hash": digest, "now": now},
    )


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("exercises", nargs="*", help="exercise ids (default: every exercise that has a guide)")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--force", action="store_true", help="write again even if the guide has not changed")
    parser.add_argument("--approve", metavar="EXERCISE_ID", help="mark an exercise's script as approved, then stop")
    args = parser.parse_args()

    init_db()  # makes sure the table exists
    await db.connect()
    try:
        if args.approve:
            await db.execute("UPDATE exercise_guides SET coach_script_status = 'approved' WHERE exercise_id = :id", {"id": args.approve})
            print(f"{args.approve}: script marked approved")
            return

        print(f"Database: {'Postgres' if IS_POSTGRES else 'local SQLite file'} | model: {args.model}")
        guides = load_guides()
        ids = args.exercises or list(guides)
        client = anthropic.Anthropic()
        made = {}  # fingerprint -> result, so exercises that share one guide (DB and KB goblet squat) get one script
        for exercise_id in ids:
            guide = guides.get(exercise_id)
            if not guide:
                print(f"{exercise_id}: no guide in exerciseGuides.js, skipped")
                continue
            digest = fingerprint(source_points(guide))
            existing = await db.fetch_one("SELECT coach_script_source_hash, coach_script_status FROM exercise_guides WHERE exercise_id = :id", {"id": exercise_id})
            if existing and existing["coach_script_source_hash"] == digest and not args.force:
                print(f"{exercise_id}: script is up to date ({existing['coach_script_status']}), skipped (use --force to rewrite)")
                continue
            if digest not in made:
                print(f"{exercise_id}: writing script...")
                made[digest] = ask_model(client, args.model, exercise_name(exercise_id), guide)
            await save(exercise_id, made[digest], args.model, digest)
            result = made[digest]
            print(f"{exercise_id}: saved as DRAFT\n\n  FULL ({words(result['script'])} words):\n  {result['script']}\n\n  SHORT ({words(result['script_short'])} words):\n  {result['script_short']}\n")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
