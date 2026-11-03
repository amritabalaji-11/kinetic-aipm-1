"""Turn a public video's words into a routine a person can follow in the app.

    link  ->  video id  ->  the video's title and creator  ->  its captions  ->  Sonnet  ->  a checked routine

Only what the captions say is used. Anything unclear is returned in "unsure" so the person can check it before adding it.
Today this reads YouTube links. Videos from other sites (Instagram, TikTok ...) will come through a file upload and speech-to-text.
"""
import json
import os
import re
from urllib.parse import parse_qs, urlparse

import anthropic
import httpx
from fastapi.concurrency import run_in_threadpool

import utils.config  # noqa: F401  (loads backend/.env)

MODEL = os.getenv("ROUTINE_MODEL", "claude-sonnet-5-5")
MAX_VIDEO_SECONDS = 40 * 60  # longer than this is not a routine, and would cost a lot to read
MAX_STEPS = 40


class RoutineError(Exception):
    """Something the person can understand and act on. `code` lets the screen pick the right message."""

    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


# ---------- the link ----------

OTHER_SITES = ("instagram.com", "tiktok.com", "facebook.com", "fb.watch", "twitter.com", "x.com")


def parse_youtube_id(url: str) -> str:
    """The 11-character video id in a YouTube link (watch, youtu.be, shorts, embed, live), or a RoutineError."""
    raw = (url or "").strip()
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw  # "youtube.com/watch?v=..." without the https
    try:
        parts = urlparse(raw)
    except ValueError:
        raise RoutineError("bad_link", "That doesn't look like a link.", 400)
    host = (parts.hostname or "").lower().removeprefix("www.").removeprefix("m.")
    if any(host == s or host.endswith("." + s) for s in OTHER_SITES):
        raise RoutineError("unsupported_site", "Links from that site can't be read yet. Save the video to your phone and upload it instead.", 400)
    vid = None
    if host in ("youtube.com", "music.youtube.com", "youtube-nocookie.com"):
        if parts.path == "/watch":
            vid = (parse_qs(parts.query).get("v") or [None])[0]
        else:
            m = re.match(r"^/(?:shorts|embed|live|v)/([\w-]{11})", parts.path)
            vid = m.group(1) if m else None
    elif host == "youtu.be":
        vid = parts.path.strip("/")[:11] or None
    if not vid or not re.fullmatch(r"[\w-]{11}", vid):
        raise RoutineError("bad_link", "That doesn't look like a YouTube video link.", 400)
    return vid


async def fetch_video_info(video_id: str) -> dict:
    """Title, creator, and whether the video may play inside our app, from YouTube's public oEmbed.
    404 = removed. 401 = private OR embedding switched off, so it is not rejected here: the captions step tells them apart."""
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
    except httpx.HTTPError:
        raise RoutineError("service_unavailable", "We couldn't reach YouTube just now. Try again in a minute.", 502)
    if res.status_code in (400, 404):  # 400: not a real video id
        raise RoutineError("video_unavailable", "This video is private, removed, or can't be viewed publicly.")
    if res.status_code in (401, 403):
        return {"title": "", "author": "", "author_url": "", "embeddable": False}
    if res.status_code != 200:
        raise RoutineError("service_unavailable", "We couldn't reach YouTube just now. Try again in a minute.", 502)
    data = res.json()
    return {"title": data.get("title") or "", "author": data.get("author_name") or "", "author_url": data.get("author_url") or "", "embeddable": True}


# ---------- the words ----------

def _fetch_captions_blocking(video_id: str) -> list[dict]:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api import (
        IpBlocked, NoTranscriptFound, RequestBlocked, TranscriptsDisabled, VideoUnavailable,
    )
    try:
        api = YouTubeTranscriptApi()
        try:
            fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            # not in English: take the first language there is, and let the model read it
            first = next(iter(api.list(video_id)))
            fetched = first.fetch()
        return [{"start": float(s.start), "text": s.text} for s in fetched]
    except (TranscriptsDisabled, NoTranscriptFound, StopIteration):
        raise RoutineError("no_captions", "This video has no captions we can read. It works best when the person talks through the moves.")
    except VideoUnavailable:
        raise RoutineError("video_unavailable", "This video is private, removed, or can't be viewed publicly.")
    except (IpBlocked, RequestBlocked):
        raise RoutineError("service_blocked", "YouTube is blocking our server from reading captions right now. Try again later.", 502)


async def fetch_captions(video_id: str) -> list[dict]:
    return await run_in_threadpool(_fetch_captions_blocking, video_id)


def captions_to_text(lines: list[dict]) -> str:
    return "\n".join(f"[{int(l['start'] // 60)}:{int(l['start'] % 60):02d}] {l['text']}" for l in lines)


# ---------- the routine ----------

SYSTEM = """You turn the captions of an exercise video into a workout routine that a person can follow in a fitness app.

Rules:
- Use ONLY what the captions say. Do not add exercises, durations, repetitions, benefits or safety claims that are not in them.
- If something is unclear (an unclear name, a missing duration, a movement that is named but not described), put it in "unsure". Never guess.
- A step is one exercise. If the speaker says "eight movements, one minute each", each step gets 60 seconds, and you say where that came from in "unsure".
- Give a step "seconds" if the video gives a time, "reps" if it gives a count, or neither (null) if it gives neither.
- "how_to" is one short line taken from what the speaker says. "cues" are the speaker's own tips for that step.
- Leave out the introduction, the outro, jokes, sales talk and rest between sets unless the speaker names a rest as part of the routine.
- If there is no workout in the captions, return an empty "steps" list.

Return ONLY a JSON object, nothing else:
{"title": str, "total_minutes": number|null, "style": "warm-up"|"mobility"|"strength"|"cardio"|"other",
 "equipment": [str],
 "steps": [{"order": int, "name": str, "seconds": int|null, "reps": int|null, "sides": "both"|"each side"|null, "how_to": str, "cues": [str]}],
 "unsure": [str]}"""


def _ask_model_blocking(transcript: str, title: str) -> dict:
    client = anthropic.Anthropic()
    user = f"Video title: {title}\n\nCaptions (with timestamps):\n{transcript}"
    reply = client.messages.create(model=MODEL, max_tokens=8000, system=SYSTEM, messages=[{"role": "user", "content": user}])
    text = "".join(b.text for b in reply.content if b.type == "text")
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise RoutineError("model_failed", "We couldn't turn this video into a routine. Try another one.", 502)
    try:
        return json.loads(match.group(0), strict=False)
    except json.JSONDecodeError:
        raise RoutineError("model_failed", "We couldn't turn this video into a routine. Try another one.", 502)


def _clean_text(value, limit: int) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:.") + "…"  # cut at a word, not in the middle of one


def _clean_int(value, low: int, high: int):
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return None
    return n if low <= n <= high else None


def check_routine(raw: dict) -> dict:
    """Keep only what the app can safely show: short text, sensible numbers, at most MAX_STEPS steps."""
    steps = []
    for i, s in enumerate((raw.get("steps") or [])[:MAX_STEPS]):
        name = _clean_text(s.get("name"), 80)
        if not name:
            continue
        sides = s.get("sides") if s.get("sides") in ("both", "each side") else None
        steps.append({
            "order": len(steps) + 1,
            "name": name,
            "seconds": _clean_int(s.get("seconds"), 5, 3600),
            "reps": _clean_int(s.get("reps"), 1, 500),
            "sides": sides,
            "how_to": _clean_text(s.get("how_to"), 220),
            "cues": [c for c in (_clean_text(c, 160) for c in (s.get("cues") or [])[:6]) if c],
        })
    if not steps:
        raise RoutineError("no_routine", "We couldn't find a workout in this video. It needs someone naming and explaining the exercises.")
    style = raw.get("style") if raw.get("style") in ("warm-up", "mobility", "strength", "cardio", "other") else "other"
    return {
        "title": _clean_text(raw.get("title"), 90) or "Routine from a video",
        "total_minutes": _clean_int(raw.get("total_minutes"), 1, 240),
        "style": style,
        "equipment": [e for e in (_clean_text(e, 40) for e in (raw.get("equipment") or [])[:8]) if e],
        "steps": steps,
        "unsure": [u for u in (_clean_text(u, 400) for u in (raw.get("unsure") or [])[:8]) if u],
    }


async def routine_from_youtube(url: str) -> dict:
    video_id = parse_youtube_id(url)
    info = await fetch_video_info(video_id)
    captions = await fetch_captions(video_id)
    if captions and captions[-1]["start"] > MAX_VIDEO_SECONDS:
        raise RoutineError("too_long", "This video is too long for a routine (over 40 minutes). Try a shorter one.")
    transcript = captions_to_text(captions)
    if len(transcript) < 200:
        raise RoutineError("no_captions", "This video has hardly any words we can read. It works best when the person talks through the moves.")
    raw = await run_in_threadpool(_ask_model_blocking, transcript, info["title"])
    routine = check_routine(raw)
    routine["source"] = {
        "site": "youtube",
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "video_id": video_id,
        "title": info["title"] or routine["title"],
        "author": info["author"],
        "author_url": info["author_url"],
        "embeddable": info["embeddable"],  # false: the video opens on YouTube instead of inside the app
    }
    return routine
