import json
from typing import Optional

from fastapi import APIRouter, HTTPException

from db.database import db

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _shape(row) -> dict:
    return {
        "exercise_id": row["exercise_id"],
        "name": row["name"],
        "movement": row["movement"],
        "equipment": row["equipment"],
        "muscle_group": row["muscle_group"],
        "secondary_groups": json.loads(row["secondary_groups"]) if row["secondary_groups"] else [],
        "muscles": json.loads(row["muscles"]) if row["muscles"] else [],
        "category": row["category"],
        "image": row["image"],
    }


@router.get("")
async def list_exercises(
    muscle_group: Optional[str] = None,
    equipment: Optional[str] = None,
    movement: Optional[str] = None,
    include_secondary: bool = False,
):
    """All exercises, optionally filtered. muscle_group matches the primary group;
    include_secondary=true also returns exercises that list it as a secondary group."""
    where, params = [], {}
    if muscle_group:
        if include_secondary:
            where.append("(muscle_group = :mg OR secondary_groups LIKE :mg_like)")
            params["mg_like"] = f'%"{muscle_group}"%'
        else:
            where.append("muscle_group = :mg")
        params["mg"] = muscle_group
    if equipment:
        where.append("equipment = :equipment")
        params["equipment"] = equipment
    if movement:
        where.append("movement = :movement")
        params["movement"] = movement
    sql = "SELECT * FROM exercises" + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY exercise_id"
    return [_shape(r) for r in await db.fetch_all(sql, params)]


@router.get("/{exercise_id}")
async def get_exercise(exercise_id: str):
    row = await db.fetch_one("SELECT * FROM exercises WHERE exercise_id = :id", {"id": exercise_id})
    if not row:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return _shape(row)
