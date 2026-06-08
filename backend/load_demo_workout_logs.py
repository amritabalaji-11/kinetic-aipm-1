import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from init_db import init_db, DATABASE_PATH


SAMPLE_USERS = [
    "00000000-0000-0000-0000-000000000000",
    "demo-user-1",
    "demo-user-2",
]

EXERCISE_MAP = {
    "goblet_squat": "Goblet Squat",
    "dumbbell_press": "Dumbbell Press",
    "deadlift": "Deadlift",
}


def build_synthetic_sessions():
    rows = []
    start_date = datetime.utcnow() - timedelta(days=10)

    for user_id in SAMPLE_USERS:
        for session_index in range(1, 4):
            session_id = f"{user_id}-session-{session_index}"
            exercise_id = list(EXERCISE_MAP.keys())[session_index % len(EXERCISE_MAP)]
            exercise_name = EXERCISE_MAP[exercise_id]
            session_date = start_date + timedelta(days=session_index * 2)

            for set_number in range(1, 4):
                weight_value = 20.0 + session_index * 5 + set_number * 2
                rows.append(
                    {
                        "user_id": user_id,
                        "exercise_id": exercise_id,
                        "exercise_name": exercise_name,
                        "session_id": session_id,
                        "logged_at": (session_date + timedelta(minutes=set_number * 5)).isoformat(sep=" ", timespec="seconds"),
                        "set_number": set_number,
                        "weight_use": weight_value,
                        "weight_value": weight_value,
                        "rep_count": 8 + set_number,
                    }
                )

    return rows


def insert_workout_rows(connection, rows):
    cursor = connection.cursor()
    inserted = 0

    for row in rows:
        cursor.execute(
            """
            INSERT INTO workout_sessions_log (
                user_id,
                exercise_id,
                exercise_name,
                session_id,
                logged_at,
                set_number,
                weight_use,
                weight_value,
                rep_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["user_id"],
                row["exercise_id"],
                row["exercise_name"],
                row["session_id"],
                row["logged_at"],
                row["set_number"],
                row["weight_use"],
                row["weight_value"],
                row["rep_count"],
            ),
        )
        inserted += 1

    connection.commit()
    return inserted


def main():
    print("Ensuring database schema exists...")
    init_db()

    print(f"Connecting to SQLite database at: {DATABASE_PATH}")
    conn = sqlite3.connect(DATABASE_PATH)

    rows = build_synthetic_sessions()
    print(f"Inserting {len(rows)} synthetic workout session log rows...")
    inserted_count = insert_workout_rows(conn, rows)

    print(f"Inserted {inserted_count} rows into workout_sessions_log.")

    cursor = conn.cursor()
    cursor.execute(
        "SELECT log_id, user_id, exercise_id, exercise_name, session_id, logged_at, set_number, weight_value, rep_count FROM workout_sessions_log ORDER BY log_id DESC LIMIT 10"
    )
    for record in cursor.fetchall():
        print(record)

    conn.close()
    print("Demo workout session log load complete.")


if __name__ == "__main__":
    main()
