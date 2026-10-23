import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db.database import db
from utils.security import get_current_user_id

router = APIRouter(prefix="/workouts", tags=["workouts"])


# ----- request shapes -----

class SetIn(BaseModel):
    set_number: int
    weight: Optional[float] = None
    weight_unit: str = "kg"
    reps: Optional[int] = None
    notes: Optional[str] = None


class ExerciseIn(BaseModel):
    exercise_id: str
    exercise_name: str
    notes: Optional[str] = None
    sets: list[SetIn] = Field(default_factory=list)


class WorkoutIn(BaseModel):
    user_id: Optional[str] = None  # ignored: the signed-in user is always used
    name: Optional[str] = None
    focus_label: Optional[str] = None
    muscles: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_min: Optional[int] = None
    exercises: list[ExerciseIn] = Field(default_factory=list)


# ----- helpers -----

async def _insert_exercises(workout_id: str, user_id: str, exercises: list[ExerciseIn], logged_at: Optional[str]):
    """Write each exercise and its sets. Sets go in workout_sessions_log,
    with session_id = workout_exercise_id (same meaning the old demo rows use)."""
    for position, ex in enumerate(exercises):
        workout_exercise_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO workout_exercises
                (workout_exercise_id, workout_id, exercise_id, exercise_name, position, notes)
            VALUES (:weid, :wid, :eid, :ename, :pos, :notes)
            """,
            {"weid": workout_exercise_id, "wid": workout_id, "eid": ex.exercise_id,
             "ename": ex.exercise_name, "pos": position, "notes": ex.notes},
        )
        for s in ex.sets:
            await db.execute(
                """
                INSERT INTO workout_sessions_log
                    (user_id, exercise_id, exercise_name, session_id, workout_id, logged_at,
                     set_number, weight_use, weight_unit, weight_value, rep_count, set_notes)
                VALUES (:uid, :eid, :ename, :sid, :wid, COALESCE(:logged_at, CURRENT_TIMESTAMP),
                        :set_number, :weight, :unit, :weight, :reps, :notes)
                """,
                {"uid": user_id, "eid": ex.exercise_id, "ename": ex.exercise_name,
                 "sid": workout_exercise_id, "wid": workout_id, "logged_at": logged_at,
                 "set_number": s.set_number, "weight": s.weight, "unit": s.weight_unit,
                 "reps": s.reps, "notes": s.notes},
            )


async def _delete_children(workout_id: str):
    await db.execute("DELETE FROM workout_sessions_log WHERE workout_id = :wid", {"wid": workout_id})
    await db.execute("DELETE FROM workout_exercises WHERE workout_id = :wid", {"wid": workout_id})


def _shape(workout_rows, exercise_rows, set_rows) -> list[dict]:
    """Nest exercises under workouts and sets under exercises."""
    sets_by_ex: dict[str, list] = {}
    for s in set_rows:
        sets_by_ex.setdefault(s["session_id"], []).append({
            "set_number": s["set_number"],
            "weight": s["weight_value"],
            "weight_unit": s["weight_unit"],
            "reps": s["rep_count"],
            "notes": s["set_notes"],
        })
    ex_by_workout: dict[str, list] = {}
    for e in sorted(exercise_rows, key=lambda r: r["position"] or 0):
        ex_by_workout.setdefault(e["workout_id"], []).append({
            "exercise_id": e["exercise_id"],
            "exercise_name": e["exercise_name"],
            "notes": e["notes"],
            "sets": sorted(sets_by_ex.get(e["workout_exercise_id"], []), key=lambda x: x["set_number"] or 0),
        })
    out = []
    for w in workout_rows:
        out.append({
            "workout_id": w["workout_id"],
            "user_id": w["user_id"],
            "name": w["name"],
            "focus_label": w["focus_label"],
            "muscles": json.loads(w["muscles"]) if w["muscles"] else [],
            "notes": w["notes"],
            "started_at": w["started_at"],
            "ended_at": w["ended_at"],
            "duration_min": w["duration_min"],
            "created_at": w["created_at"],
            "exercises": ex_by_workout.get(w["workout_id"], []),
        })
    return out


async def _load_for_user(user_id: str, workout_id: Optional[str] = None) -> list[dict]:
    where = "user_id = :uid" + (" AND workout_id = :wid" if workout_id else "")
    params = {"uid": user_id, **({"wid": workout_id} if workout_id else {})}
    workouts = await db.fetch_all(
        f"SELECT * FROM workouts WHERE {where} ORDER BY created_at DESC, started_at DESC", params
    )
    exercises = await db.fetch_all(
        f"SELECT * FROM workout_exercises WHERE workout_id IN (SELECT workout_id FROM workouts WHERE {where})", params
    )
    sets = await db.fetch_all(
        f"SELECT * FROM workout_sessions_log WHERE workout_id IN (SELECT workout_id FROM workouts WHERE {where})", params
    )
    return _shape(workouts, exercises, sets)


async def _owner_of(workout_id: str) -> Optional[str]:
    row = await db.fetch_one("SELECT user_id FROM workouts WHERE workout_id = :wid", {"wid": workout_id})
    return row["user_id"] if row else None


# ----- routes -----
# Every route here works on the signed-in user's own workouts only (user id comes from the login token).

@router.post("")
async def create_workout(body: WorkoutIn, user_id: str = Depends(get_current_user_id)):
    # The app retries a workout until the server confirms it, so the same one can arrive twice (for example when the
    # first reply was lost while the server was waking up). Same user and start time means it is already saved.
    if body.started_at:
        existing = await db.fetch_one(
            "SELECT workout_id FROM workouts WHERE user_id = :uid AND started_at = :started",
            {"uid": user_id, "started": body.started_at},
        )
        if existing:
            return (await _load_for_user(user_id, existing["workout_id"]))[0]
    workout_id = str(uuid.uuid4())
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO workouts (workout_id, user_id, name, focus_label, muscles, notes,
                                  started_at, ended_at, duration_min, status)
            VALUES (:wid, :uid, :name, :focus, :muscles, :notes, :started, :ended, :dur, 'completed')
            """,
            {"wid": workout_id, "uid": user_id, "name": body.name, "focus": body.focus_label,
             "muscles": json.dumps(body.muscles), "notes": body.notes,
             "started": body.started_at, "ended": body.ended_at, "dur": body.duration_min},
        )
        await _insert_exercises(workout_id, user_id, body.exercises, body.started_at)
    return (await _load_for_user(user_id, workout_id))[0]


@router.get("")
async def list_workouts(user_id: str = Depends(get_current_user_id)):
    return await _load_for_user(user_id)


# Defined before "/{workout_id}" so "progress" isn't read as a workout id.
@router.get("/progress")
async def exercise_progress(exercise_name: str, user_id: str = Depends(get_current_user_id)):
    """Per-session summary for one exercise: best weight, total volume, estimated 1RM.
    Includes older demo rows (no workout_id) because it matches on exercise name."""
    rows = await db.fetch_all(
        """
        SELECT session_id, MIN(logged_at) AS logged_at,
               MAX(weight_value)                        AS best_weight,
               SUM(COALESCE(weight_value,0) * COALESCE(rep_count,0)) AS volume,
               MAX(COALESCE(weight_value,0) * (1 + COALESCE(rep_count,0) / 30.0)) AS est_1rm,
               COUNT(*)                                 AS sets
        FROM workout_sessions_log
        WHERE user_id = :uid AND LOWER(exercise_name) = LOWER(:name)
        GROUP BY session_id
        ORDER BY logged_at
        """,
        {"uid": user_id, "name": exercise_name},
    )
    history = [dict(r) for r in rows]
    best = max(history, key=lambda r: r["best_weight"] or 0, default=None)
    return {
        "exercise_name": exercise_name,
        "sessions": history,
        "personal_best_weight": best["best_weight"] if best else None,
        "personal_best_date": best["logged_at"] if best else None,
    }


@router.get("/{workout_id}")
async def get_workout(workout_id: str, user_id: str = Depends(get_current_user_id)):
    found = await _load_for_user(user_id, workout_id)
    if not found:
        raise HTTPException(status_code=404, detail="Workout not found")
    return found[0]


@router.put("/{workout_id}")
async def update_workout(workout_id: str, body: WorkoutIn, user_id: str = Depends(get_current_user_id)):
    owner = await _owner_of(workout_id)
    if owner is None or owner != user_id:
        raise HTTPException(status_code=404, detail="Workout not found")
    async with db.transaction():
        await db.execute(
            """
            UPDATE workouts SET name = :name, focus_label = :focus, muscles = :muscles, notes = :notes,
                   started_at = :started, ended_at = :ended, duration_min = :dur
            WHERE workout_id = :wid
            """,
            {"wid": workout_id, "name": body.name, "focus": body.focus_label, "muscles": json.dumps(body.muscles),
             "notes": body.notes, "started": body.started_at, "ended": body.ended_at,
             "dur": body.duration_min},
        )
        await _delete_children(workout_id)
        await _insert_exercises(workout_id, user_id, body.exercises, body.started_at)
    return (await _load_for_user(user_id, workout_id))[0]


@router.delete("/{workout_id}")
async def delete_workout(workout_id: str, user_id: str = Depends(get_current_user_id)):
    owner = await _owner_of(workout_id)
    if owner is None or owner != user_id:
        raise HTTPException(status_code=404, detail="Workout not found")
    async with db.transaction():
        await _delete_children(workout_id)
        await db.execute("DELETE FROM workouts WHERE workout_id = :wid", {"wid": workout_id})
    return {"deleted": workout_id}
