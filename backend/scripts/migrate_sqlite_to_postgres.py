"""Copy the data in the local SQLite file (backend/kinetic.db) into the Postgres database in DATABASE_URL.

Safe to run more than once: rows that are already there are skipped, never overwritten.

    cd backend
    python3 scripts/migrate_sqlite_to_postgres.py            # copy
    python3 scripts/migrate_sqlite_to_postgres.py --dry-run  # just show what would be copied
"""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg  # noqa: E402

from db.database import DATABASE_PATH, IS_POSTGRES, POSTGRES_DSN  # noqa: E402
from init_db import init_db  # noqa: E402

# Parents before children, so the copy reads in a sensible order.
TABLES = [
    "user_profiles",
    "exercises",
    "form_analyses",
    "form_analysis_results",
    "progression_results",
    "workouts",
    "workout_exercises",
    "workout_sessions_log",
]


def convert(value, pg_type: str):
    """SQLite is loose about types; Postgres is strict. Make each value match its column."""
    if value is None:
        return None
    if pg_type == "boolean":
        return bool(value)
    if pg_type in ("integer", "bigint", "smallint"):
        return int(value)
    if pg_type in ("double precision", "real", "numeric"):
        return float(value)
    return value if isinstance(value, str) else str(value)


def main():
    dry_run = "--dry-run" in sys.argv
    if not IS_POSTGRES:
        sys.exit("DATABASE_URL is not a Postgres address (check backend/.env). Nothing copied.")
    if not DATABASE_PATH.exists():
        sys.exit(f"No local database at {DATABASE_PATH}. Nothing copied.")

    if not dry_run:
        init_db()  # makes sure every table and column exists on the Postgres side

    source = sqlite3.connect(DATABASE_PATH)
    source.row_factory = sqlite3.Row
    target = psycopg.connect(POSTGRES_DSN, autocommit=False)
    cur = target.cursor()

    cur.execute(
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema()"
    )
    pg_columns: dict[str, dict[str, str]] = {}
    for table, column, data_type in cur.fetchall():
        pg_columns.setdefault(table, {})[column] = data_type

    for table in TABLES:
        rows = source.execute(f"SELECT * FROM {table}").fetchall()
        if not rows:
            print(f"{table}: nothing to copy")
            continue
        if table not in pg_columns:
            print(f"{table}: {len(rows)} rows, but the table does not exist in Postgres yet (run without --dry-run)")
            continue
        columns = [c for c in rows[0].keys() if c in pg_columns[table]]
        skipped = [c for c in rows[0].keys() if c not in pg_columns[table]]
        data = [tuple(convert(r[c], pg_columns[table][c]) for c in columns) for r in rows]
        sql = (
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(columns))}) "
            "ON CONFLICT DO NOTHING"
        )
        if dry_run:
            print(f"{table}: would copy {len(rows)} rows" + (f" (leaving out columns {skipped})" if skipped else ""))
            continue
        cur.executemany(sql, data)
        print(f"{table}: copied {len(rows)} rows" + (f" (left out columns {skipped})" if skipped else ""))

    if not dry_run:
        # log_id numbers were copied as they were; tell Postgres to carry on counting after the highest one.
        cur.execute(
            "SELECT setval(pg_get_serial_sequence('workout_sessions_log', 'log_id'), "
            "COALESCE((SELECT MAX(log_id) FROM workout_sessions_log), 0) + 1, false)"
        )
        target.commit()
        print("Done.")
    target.close()
    source.close()


if __name__ == "__main__":
    main()
