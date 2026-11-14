"""Feedback from people using the app: a topic, some text, up to 3 photos or videos, and (if they tick it) a link to their latest analysis.

Like the video upload, files go straight to the private bucket (the server only hands out one-use upload addresses and then checks the
files arrived), so big videos never pass through the server. Only the person who sent a message and admins can ever see it. Demo accounts
cannot send feedback. At most 5 messages a day per person.

    1. POST /feedback/start  -> an id and an upload address per file (skip when there are no files)
    2. the browser sends each file to its address
    3. POST /feedback        -> checks the files arrived, saves the message
"""
import json
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from db.database import INTEGRITY_ERRORS, db
from utils.security import limit_guest

router = APIRouter(prefix="/feedback", tags=["feedback"])

TOPICS = ("bug", "idea", "form", "other")
MAX_FILES = 3
MAX_PER_DAY = 5
MAX_MESSAGE = 2000
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}
VIDEO_TYPES = {"video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024
_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def _storage():
    """The storage helpers, loaded only when a file is involved (importing them needs the storage credentials)."""
    from utils import gcs
    return gcs


def _extension(content_type: str) -> str | None:
    return IMAGE_TYPES.get(content_type) or VIDEO_TYPES.get(content_type)


def _size_limit(content_type: str) -> int:
    return MAX_IMAGE_BYTES if content_type in IMAGE_TYPES else MAX_VIDEO_BYTES


class FileIn(BaseModel):
    filename: str = Field(default="file", max_length=200)
    content_type: str
    size_bytes: int


class StartIn(BaseModel):
    files: list[FileIn] = Field(max_length=MAX_FILES)


class UploadedFile(BaseModel):
    path: str
    content_type: str


class FeedbackIn(BaseModel):
    feedback_id: str
    topic: str
    message: str = ""
    include_latest_analysis: bool = False
    files: list[UploadedFile] = Field(default_factory=list, max_length=MAX_FILES)
    app_info: dict | None = None


async def _sent_today(user_id: str) -> int:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime(_TIME_FORMAT)
    return await db.fetch_val("SELECT COUNT(*) FROM feedback WHERE user_id = :u AND created_at >= :since", {"u": user_id, "since": since})


async def _require_room(user_id: str) -> None:
    if await _sent_today(user_id) >= MAX_PER_DAY:
        raise HTTPException(status_code=429, detail=f"That's {MAX_PER_DAY} messages today. Please try again tomorrow.")


def _valid_id(value: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise HTTPException(status_code=422, detail="Bad feedback id")


@router.post("/start")
async def start(body: StartIn, request: Request, user_id: str = Depends(limit_guest("feedback messages", 0))):
    await _require_room(user_id)
    feedback_id = str(uuid.uuid4())
    uploads = []
    for i, f in enumerate(body.files):
        if not _extension(f.content_type):
            raise HTTPException(status_code=415, detail="Only photos (JPEG, PNG, WebP, HEIC) and videos (MP4, MOV, WebM) can be attached.")
        if f.size_bytes <= 0 or f.size_bytes > _size_limit(f.content_type):
            raise HTTPException(status_code=413, detail="That file is too big. Photos can be up to 10 MB and videos up to 100 MB.")
        path = f"feedback/{user_id}/{feedback_id}/{i}-{uuid.uuid4().hex[:8]}.{_extension(f.content_type)}"  # a made-up name: the person's file name is never used
        try:
            url = await run_in_threadpool(_storage().create_resumable_upload_url, path, f.content_type, f.size_bytes, request.headers.get("origin"))
        except Exception as err:
            print("GCS ERROR (feedback start):", str(err))
            raise HTTPException(status_code=503, detail="We couldn't start the upload. Please try again.")
        uploads.append({"upload_url": url, "path": path, "content_type": f.content_type})
    return {"feedback_id": feedback_id, "uploads": uploads}


@router.post("")
async def submit(body: FeedbackIn, user_id: str = Depends(limit_guest("feedback messages", 0))):
    feedback_id = _valid_id(body.feedback_id)
    message = body.message.strip()
    if body.topic not in TOPICS:
        raise HTTPException(status_code=422, detail="Pick what it's about.")
    if len(message) > MAX_MESSAGE:
        raise HTTPException(status_code=422, detail=f"Please keep it under {MAX_MESSAGE} characters.")
    if not message and not body.files:
        raise HTTPException(status_code=422, detail="Write a message or add a photo or video.")
    await _require_room(user_id)

    media = []
    for f in body.files:
        # only files this person's own /feedback/start handed out for this message count
        if not f.path.startswith(f"feedback/{user_id}/{feedback_id}/") or ".." in f.path or not _extension(f.content_type):
            raise HTTPException(status_code=422, detail="That attachment isn't valid.")
        size = await run_in_threadpool(lambda: _storage().uploaded_size(f"{_storage().GS_PREFIX}{f.path}"))
        if size is None:
            raise HTTPException(status_code=422, detail="An attachment didn't finish uploading. Please try again.")
        if size > _size_limit(f.content_type):
            raise HTTPException(status_code=413, detail="An attachment is too big.")
        media.append({"media_id": str(uuid.uuid4()), "gcs_url": f"{_storage().GS_PREFIX}{f.path}", "content_type": f.content_type, "size_bytes": size})

    analysis_id = None
    if body.include_latest_analysis:
        row = await db.fetch_one("SELECT analysis_id FROM form_analyses WHERE user_id = :u AND analysis_id IS NOT NULL ORDER BY created_at DESC LIMIT 1", {"u": user_id})
        analysis_id = row["analysis_id"] if row else None

    app_info = json.dumps({k: str(v)[:200] for k, v in (body.app_info or {}).items()})[:1000] if body.app_info else None
    try:
        await db.execute(
            "INSERT INTO feedback (feedback_id, user_id, topic, message, analysis_id, app_info) VALUES (:id, :u, :topic, :message, :aid, :info)",
            {"id": feedback_id, "u": user_id, "topic": body.topic, "message": message, "aid": analysis_id, "info": app_info},
        )
    except INTEGRITY_ERRORS:
        raise HTTPException(status_code=409, detail="That message was already sent.")
    for m in media:
        await db.execute(
            "INSERT INTO feedback_media (media_id, feedback_id, gcs_url, content_type, size_bytes) VALUES (:media_id, :fid, :gcs_url, :content_type, :size_bytes)",
            {**m, "fid": feedback_id},
        )
    return {"feedback_id": feedback_id}


@router.get("/mine")
async def mine(user_id: str = Depends(limit_guest("feedback messages", 0))):
    """How many messages this person has sent (the Home card hides itself once they have sent one)."""
    return {"count": await db.fetch_val("SELECT COUNT(*) FROM feedback WHERE user_id = :u", {"u": user_id})}
