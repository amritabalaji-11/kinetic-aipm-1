"""The admin pages' data: who signed up and what they did.

Only an account whose `role` is 'admin' can call any of this. The role is read from the database on every request (so taking it away
works at once) and can only be set by scripts/make_admin.py, never from the app. Emails are hidden unless the admin asks to reveal one,
and each reveal and each person opened is written to admin_audit. Nothing here returns videos, birth dates or injury notes.
"""
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from db.database import db
from utils.security import get_current_user_id

router = APIRouter(prefix="/admin", tags=["admin"])

_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"  # the same text shape both databases store dates in
SEEDED_DEMO_USER = "00000000-0000-0000-0000-000000000000"  # the placeholder profile init_db creates: not a real person, so it is left out of every count


async def require_admin(user_id: str = Depends(get_current_user_id)) -> str:
    row = await db.fetch_one("SELECT role FROM user_profiles WHERE user_id = :user_id", {"user_id": user_id})
    if not row or row["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user_id


def mask_email(email: str | None) -> str | None:
    """amrita.balaji@gmail.com -> a***@gmail.com"""
    if not email or "@" not in email:
        return email
    name, _, domain = email.partition("@")
    return f"{name[:1]}***@{domain}"


def _ago(**delta) -> str:
    return (datetime.now(timezone.utc) - timedelta(**delta)).strftime(_TIME_FORMAT)


def _latest(*times) -> str | None:
    """The most recent of several date texts (they sort correctly as text), ignoring empty ones."""
    known = [str(t) for t in times if t]
    return max(known) if known else None


async def _audit(admin_id: str, action: str, target: str | None = None) -> None:
    await db.execute(
        "INSERT INTO admin_audit (admin_user_id, action, target_user_id) VALUES (:a, :action, :t)",
        {"a": admin_id, "action": action, "t": target},
    )


# Each activity table: (label, SQL for this person's rows as: id, when, title, detail)
_ACTIVITY = [
    ("analysis", "SELECT session_id AS id, created_at AS at, exercise_name AS title, status AS detail, video_score AS score "
                 "FROM form_analyses WHERE user_id = :u"),
    ("workout", "SELECT workout_id AS id, created_at AS at, name AS title, status AS detail, duration_min AS score "
                "FROM workouts WHERE user_id = :u"),
    ("routine_saved", "SELECT routine_id AS id, created_at AS at, title AS title, source_url AS detail, NULL AS score "
                      "FROM user_routines WHERE user_id = :u"),
    ("video_read", "SELECT video_id AS id, created_at AS at, video_id AS title, NULL AS detail, NULL AS score "
                   "FROM video_reads WHERE user_id = :u"),
]


@router.get("/summary")
async def summary(admin_id: str = Depends(require_admin)):
    today, week = _ago(hours=24), _ago(days=7)
    count = lambda sql, **p: db.fetch_val(sql, p)
    active = await db.fetch_val(
        """SELECT COUNT(DISTINCT user_id) FROM (
               SELECT user_id FROM form_analyses WHERE created_at >= :w
               UNION SELECT user_id FROM workouts WHERE created_at >= :w
               UNION SELECT user_id FROM user_routines WHERE created_at >= :w
               UNION SELECT user_id FROM video_reads WHERE created_at >= :w
               UNION SELECT user_id FROM user_profiles WHERE last_login_at >= :w
           ) x WHERE user_id IN (SELECT user_id FROM user_profiles WHERE user_id <> :d)""",
        {"w": week, "d": SEEDED_DEMO_USER},
    )
    return {
        "users_total": await count("SELECT COUNT(*) FROM user_profiles WHERE user_id <> :d", d=SEEDED_DEMO_USER),
        "new_last_24h": await count("SELECT COUNT(*) FROM user_profiles WHERE created_at >= :t AND user_id <> :d", t=today, d=SEEDED_DEMO_USER),
        "new_last_7d": await count("SELECT COUNT(*) FROM user_profiles WHERE created_at >= :t AND user_id <> :d", t=week, d=SEEDED_DEMO_USER),
        "active_last_7d": active,
        "analyses_total": await count("SELECT COUNT(*) FROM form_analyses"),
        "analyses_last_7d": await count("SELECT COUNT(*) FROM form_analyses WHERE created_at >= :t", t=week),
        "workouts_total": await count("SELECT COUNT(*) FROM workouts"),
        "feedback_new": await count("SELECT COUNT(*) FROM feedback WHERE status = 'new'"),
    }


@router.get("/users")
async def users(
    q: str = Query("", max_length=80),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin_id: str = Depends(require_admin),
):
    where, params = "WHERE u.user_id <> :d", {"limit": limit, "offset": offset, "d": SEEDED_DEMO_USER}
    if q.strip():
        where += " AND (lower(u.user_id) LIKE :q OR lower(COALESCE(u.display_name, '')) LIKE :q OR lower(COALESCE(u.email, '')) LIKE :q)"
        params["q"] = f"%{q.strip().lower()}%"
    rows = await db.fetch_all(
        f"""SELECT u.user_id, u.display_name, u.email, u.auth_provider, u.role, u.created_at, u.last_login_at,
                   (SELECT COUNT(*) FROM form_analyses a WHERE a.user_id = u.user_id) AS analyses,
                   (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.user_id) AS workouts,
                   (SELECT COUNT(*) FROM user_routines r WHERE r.user_id = u.user_id) AS routines,
                   (SELECT MAX(created_at) FROM form_analyses a WHERE a.user_id = u.user_id) AS last_analysis,
                   (SELECT MAX(created_at) FROM workouts w WHERE w.user_id = u.user_id) AS last_workout,
                   (SELECT MAX(created_at) FROM user_routines r WHERE r.user_id = u.user_id) AS last_routine,
                   (SELECT MAX(created_at) FROM video_reads v WHERE v.user_id = u.user_id) AS last_read
            FROM user_profiles u {where}
            ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset""",
        params,
    )
    return {
        "users": [
            {
                "user_id": r["user_id"], "display_name": r["display_name"], "email": mask_email(r["email"]),
                "auth_provider": r["auth_provider"], "role": r["role"] or "user",
                "signed_up": r["created_at"], "last_active": _latest(r["last_login_at"], r["last_analysis"], r["last_workout"], r["last_routine"], r["last_read"]),
                "analyses": r["analyses"], "workouts": r["workouts"], "routines": r["routines"],
            }
            for r in rows
        ],
        "limit": limit, "offset": offset,
    }


@router.get("/users/{user_id}")
async def user_detail(user_id: str, admin_id: str = Depends(require_admin)):
    u = await db.fetch_one(
        "SELECT user_id, display_name, email, auth_provider, role, created_at, last_login_at FROM user_profiles WHERE user_id = :u", {"u": user_id}
    )
    if not u:
        raise HTTPException(status_code=404, detail="No such user")
    events = [{"type": "signed_up", "at": u["created_at"], "title": "Signed up", "detail": u["auth_provider"], "id": None, "score": None}]
    for kind, sql in _ACTIVITY:
        for r in await db.fetch_all(sql + " ORDER BY created_at DESC LIMIT 100", {"u": user_id}):
            events.append({"type": kind, "at": str(r["at"]), "title": r["title"], "detail": r["detail"], "id": r["id"], "score": r["score"]})
    events.sort(key=lambda e: e["at"] or "", reverse=True)
    await _audit(admin_id, "view_user", user_id)
    return {
        "user_id": u["user_id"], "display_name": u["display_name"], "email": mask_email(u["email"]), "auth_provider": u["auth_provider"],
        "role": u["role"] or "user", "signed_up": u["created_at"], "last_login": u["last_login_at"],
        "counts": {kind: sum(1 for e in events if e["type"] == kind) for kind, _ in _ACTIVITY},
        "timeline": events[:200],
    }


@router.get("/users/{user_id}/email")
async def reveal_email(user_id: str, admin_id: str = Depends(require_admin)):
    u = await db.fetch_one("SELECT email FROM user_profiles WHERE user_id = :u", {"u": user_id})
    if not u:
        raise HTTPException(status_code=404, detail="No such user")
    await _audit(admin_id, "reveal_email", user_id)
    return {"user_id": user_id, "email": u["email"]}


# ---------- feedback inbox ----------

FEEDBACK_TOPICS = ("bug", "idea", "form", "other")


def _preview(text: str | None, n: int = 140) -> str:
    text = (text or "").strip().replace("\n", " ")
    return text if len(text) <= n else text[:n].rstrip() + "…"


@router.get("/feedback")
async def feedback_list(
    topic: str = Query("", max_length=10),
    status: str = Query("all", pattern="^(all|new|reviewed)$"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin_id: str = Depends(require_admin),
):
    where, params = [], {"limit": limit, "offset": offset}
    if topic:
        if topic not in FEEDBACK_TOPICS:
            raise HTTPException(status_code=422, detail="Unknown topic")
        where.append("f.topic = :topic"); params["topic"] = topic
    if status != "all":
        where.append("f.status = :status"); params["status"] = status
    rows = await db.fetch_all(
        f"""SELECT f.feedback_id, f.user_id, f.topic, f.message, f.status, f.analysis_id, f.created_at, u.display_name, u.email,
                   (SELECT COUNT(*) FROM feedback_media m WHERE m.feedback_id = f.feedback_id AND substr(m.content_type, 1, 6) = 'image/') AS photos,
                   (SELECT COUNT(*) FROM feedback_media m WHERE m.feedback_id = f.feedback_id AND substr(m.content_type, 1, 6) = 'video/') AS videos
            FROM feedback f LEFT JOIN user_profiles u ON u.user_id = f.user_id
            {"WHERE " + " AND ".join(where) if where else ""}
            ORDER BY f.created_at DESC LIMIT :limit OFFSET :offset""",
        params,
    )
    return {
        "feedback": [
            {"feedback_id": r["feedback_id"], "user_id": r["user_id"], "from": r["display_name"] or mask_email(r["email"]) or f"Unnamed · {r['user_id'][:6]}…",
             "topic": r["topic"], "preview": _preview(r["message"]), "status": r["status"], "created_at": r["created_at"],
             "photos": r["photos"], "videos": r["videos"], "has_analysis": bool(r["analysis_id"])}
            for r in rows
        ],
        "limit": limit, "offset": offset,
    }


@router.get("/feedback/{feedback_id}")
async def feedback_detail(feedback_id: str, admin_id: str = Depends(require_admin)):
    f = await db.fetch_one(
        """SELECT f.*, u.display_name, u.email FROM feedback f LEFT JOIN user_profiles u ON u.user_id = f.user_id WHERE f.feedback_id = :id""",
        {"id": feedback_id},
    )
    if not f:
        raise HTTPException(status_code=404, detail="No such message")
    media = await db.fetch_all("SELECT media_id, gcs_url, content_type, size_bytes FROM feedback_media WHERE feedback_id = :id ORDER BY created_at, media_id", {"id": feedback_id})
    analysis = None
    if f["analysis_id"]:
        a = await db.fetch_one("SELECT analysis_id, exercise_name, status, video_score, created_at FROM form_analyses WHERE analysis_id = :id", {"id": f["analysis_id"]})
        analysis = dict(a) if a else None
    await _audit(admin_id, "view_feedback", f["user_id"])
    return {
        "feedback_id": f["feedback_id"], "user_id": f["user_id"], "from": f["display_name"] or f"Unnamed · {f['user_id'][:6]}…", "email": mask_email(f["email"]),
        "topic": f["topic"], "message": f["message"], "status": f["status"], "admin_note": f["admin_note"], "created_at": f["created_at"],
        "reviewed_at": f["reviewed_at"], "app_info": json.loads(f["app_info"]) if f["app_info"] else None,
        "media": [{"media_id": m["media_id"], "url": m["gcs_url"], "content_type": m["content_type"], "kind": "video" if m["content_type"].startswith("video/") else "photo"} for m in media],
        "analysis": analysis,
    }


class ReviewIn(BaseModel):
    reviewed: bool = True
    note: str | None = Field(default=None, max_length=2000)


@router.post("/feedback/{feedback_id}/review")
async def feedback_review(feedback_id: str, body: ReviewIn, admin_id: str = Depends(require_admin)):
    found = await db.fetch_one("SELECT feedback_id FROM feedback WHERE feedback_id = :id", {"id": feedback_id})
    if not found:
        raise HTTPException(status_code=404, detail="No such message")
    await db.execute(
        "UPDATE feedback SET status = :status, admin_note = :note, reviewed_by = :by, reviewed_at = :at WHERE feedback_id = :id",
        {"status": "reviewed" if body.reviewed else "new", "note": (body.note or "").strip() or None, "by": admin_id if body.reviewed else None,
         "at": datetime.now(timezone.utc).strftime(_TIME_FORMAT) if body.reviewed else None, "id": feedback_id},
    )
    return {"feedback_id": feedback_id, "status": "reviewed" if body.reviewed else "new"}
