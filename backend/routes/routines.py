import json
import os
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db.database import NOW_TEXT, db
from services.video_routine import RoutineError, available_sources, check_routine, routine_from_link
from utils.security import get_current_user_id, limit_guest

router = APIRouter(prefix="/routines", tags=["routines"])

READS_PER_DAY = int(os.getenv("ROUTINE_READS_PER_DAY", "20"))  # every read costs money, so it is capped for everyone
MAX_SAVED = 50


class VideoLink(BaseModel):
    url: str = Field(max_length=500)


class RoutineIn(BaseModel):
    routine: dict


def _fail(err: RoutineError):
    return HTTPException(status_code=err.status, detail={"code": err.code, "message": err.message})


def _source(raw) -> dict | None:
    """The video a routine came from. Only a plain link to YouTube, Instagram or TikTok is kept, so a saved routine can never carry anything else."""
    if not isinstance(raw, dict):
        return None
    clip = lambda k, n: re.sub(r"\s+", " ", str(raw.get(k) or "")).strip()[:n]
    site = raw.get("site")
    if site == "youtube":
        video_id = str(raw.get("video_id") or "")
        if not re.fullmatch(r"[\w-]{11}", video_id):
            return None
        url, embeddable = f"https://www.youtube.com/watch?v={video_id}", bool(raw.get("embeddable"))
    elif site in ("instagram", "tiktok"):
        url = str(raw.get("url") or "")
        if not re.fullmatch(rf"https://(?:[\w-]+\.)*{site}\.com/[\w@./%-]{{1,200}}", url):
            return None
        video_id, embeddable = None, False
    else:
        return None
    author_url = clip("author_url", 200)
    return {
        "site": site,
        "video_id": video_id,
        "url": url,
        "title": clip("title", 150),
        "author": clip("author", 80),
        "author_url": author_url if author_url.startswith("https://www.youtube.com/") else "",
        "embeddable": embeddable,
    }


async def _reads_today(user_id: str) -> int:
    since = datetime.now(timezone.utc).strftime("%Y-%m-%d 00:00:00")
    row = await db.fetch_one("SELECT COUNT(*) AS n FROM video_reads WHERE user_id = :u AND created_at >= :since", {"u": user_id, "since": since})
    return int(row["n"]) if row else 0


@router.get("/sources")
async def sources(_user: str = Depends(get_current_user_id)):
    """Which sites can be read right now, so the screens show 'works' or 'soon' truthfully."""
    return available_sources()


@router.post("/from-video")
async def read_video(body: VideoLink, user_id: str = Depends(limit_guest("video reads", 5))):
    if await _reads_today(user_id) >= READS_PER_DAY:
        raise HTTPException(status_code=429, detail={"code": "daily_limit", "message": f"You can read {READS_PER_DAY} videos a day. Try again tomorrow."})
    try:
        routine = await routine_from_link(body.url)
    except RoutineError as err:
        raise _fail(err)
    # only a video that was really read counts against the day's limit
    await db.execute(f"INSERT INTO video_reads (user_id, video_id, created_at) VALUES (:u, :v, {NOW_TEXT})", {"u": user_id, "v": routine["source"]["video_id"] or routine["source"]["url"][:120]})
    return routine


def _row(r) -> dict:
    return {"routine_id": r["routine_id"], "created_at": r["created_at"], "routine": json.loads(r["data"])}


@router.get("")
async def list_routines(user_id: str = Depends(get_current_user_id)):
    rows = await db.fetch_all("SELECT * FROM user_routines WHERE user_id = :u ORDER BY created_at DESC", {"u": user_id})
    return [_row(r) for r in rows]


@router.post("")
async def save_routine(body: RoutineIn, user_id: str = Depends(get_current_user_id)):
    count = await db.fetch_one("SELECT COUNT(*) AS n FROM user_routines WHERE user_id = :u", {"u": user_id})
    if count and int(count["n"]) >= MAX_SAVED:
        raise HTTPException(status_code=400, detail={"code": "too_many", "message": f"You can keep {MAX_SAVED} routines. Delete one to save another."})
    try:
        routine = check_routine(body.routine)  # the same checks as a fresh read: the person may have edited it
    except RoutineError as err:
        raise _fail(err)
    routine["source"] = _source(body.routine.get("source"))
    routine_id = str(uuid.uuid4())
    await db.execute(
        f"INSERT INTO user_routines (routine_id, user_id, title, data, source_url, created_at) VALUES (:id, :u, :t, :d, :s, {NOW_TEXT})",
        {"id": routine_id, "u": user_id, "t": routine["title"], "d": json.dumps(routine), "s": (routine["source"] or {}).get("url")},
    )
    row = await db.fetch_one("SELECT * FROM user_routines WHERE routine_id = :id", {"id": routine_id})
    return _row(row)


@router.delete("/{routine_id}")
async def delete_routine(routine_id: str, user_id: str = Depends(get_current_user_id)):
    row = await db.fetch_one("SELECT user_id FROM user_routines WHERE routine_id = :id", {"id": routine_id})
    if not row or row["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Routine not found")
    await db.execute("DELETE FROM user_routines WHERE routine_id = :id", {"id": routine_id})
    return {"deleted": routine_id}
