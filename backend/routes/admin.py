"""The admin pages' data: who signed up and what they did.

Only an account whose `role` is 'admin' can call any of this. The role is read from the database on every request (so taking it away
works at once) and can only be set by scripts/make_admin.py, never from the app. Emails are hidden unless the admin asks to reveal one,
and each reveal and each person opened is written to admin_audit. Nothing here returns videos, birth dates or injury notes.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from db.database import db
from utils.security import get_current_user_id

router = APIRouter(prefix="/admin", tags=["admin"])

_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"  # the same text shape both databases store dates in


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
           ) x WHERE user_id IN (SELECT user_id FROM user_profiles)""",
        {"w": week},
    )
    return {
        "users_total": await count("SELECT COUNT(*) FROM user_profiles"),
        "new_last_24h": await count("SELECT COUNT(*) FROM user_profiles WHERE created_at >= :t", t=today),
        "new_last_7d": await count("SELECT COUNT(*) FROM user_profiles WHERE created_at >= :t", t=week),
        "active_last_7d": active,
        "analyses_total": await count("SELECT COUNT(*) FROM form_analyses"),
        "analyses_last_7d": await count("SELECT COUNT(*) FROM form_analyses WHERE created_at >= :t", t=week),
        "workouts_total": await count("SELECT COUNT(*) FROM workouts"),
    }


@router.get("/users")
async def users(
    q: str = Query("", max_length=80),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin_id: str = Depends(require_admin),
):
    where, params = "", {"limit": limit, "offset": offset}
    if q.strip():
        where = "WHERE lower(u.user_id) LIKE :q OR lower(COALESCE(u.display_name, '')) LIKE :q OR lower(COALESCE(u.email, '')) LIKE :q"
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
