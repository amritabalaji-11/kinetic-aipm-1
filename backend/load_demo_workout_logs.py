import sqlite3
import uuid
from datetime import datetime

from init_db import init_db, DATABASE_PATH


USER_PROFILE = {
    "profile_id": "user_001_profile",
    "user_id": "user_001",
    "display_name": "Demo Female User",
    "experience_level": "Intermediate",
    "age": 39,
    "gender": "Female",
    "level": "Intermediate",
    "injury_report": 0,
    "injury_details": None,
}

WORKOUT_SESSIONS = [
    {
        "date": "2026-05-09 10:00:00",
        "session_id": str(uuid.uuid4()),
        "rows": [
            {"set_number": 1, "weight_use": 12.5, "weight_unit": "kg", "weight_value": 12.5, "rep_count": 11},
            {"set_number": 2, "weight_use": 12.5, "weight_unit": "kg", "weight_value": 12.5, "rep_count": 11},
            {"set_number": 3, "weight_use": 12.5, "weight_unit": "kg", "weight_value": 12.5, "rep_count": 11},
        ],
    },
    {
        "date": "2026-05-12 10:00:00",
        "session_id": str(uuid.uuid4()),
        "rows": [
            {"set_number": 1, "weight_use": 12.0, "weight_unit": "kg", "weight_value": 12.0, "rep_count": 12},
            {"set_number": 2, "weight_use": 14.0, "weight_unit": "kg", "weight_value": 14.0, "rep_count": 10},
            {"set_number": 3, "weight_use": 14.0, "weight_unit": "kg", "weight_value": 14.0, "rep_count": 10},
        ],
    },
    {
        "date": "2026-05-16 10:00:00",
        "session_id": str(uuid.uuid4()),
        "rows": [
            {"set_number": 1, "weight_use": 14.0, "weight_unit": "kg", "weight_value": 14.0, "rep_count": 10},
            {"set_number": 2, "weight_use": 14.0, "weight_unit": "kg", "weight_value": 14.0, "rep_count": 10},
            {"set_number": 3, "weight_use": 14.0, "weight_unit": "kg", "weight_value": 14.0, "rep_count": 10},
        ],
    },
    {
        "date": "2026-05-25 10:00:00",
        "session_id": str(uuid.uuid4()),
        "rows": [
            {"set_number": 1, "weight_use": 15.0, "weight_unit": "kg", "weight_value": 15.0, "rep_count": 10},
            {"set_number": 2, "weight_use": 15.0, "weight_unit": "kg", "weight_value": 15.0, "rep_count": 10},
            {"set_number": 3, "weight_use": 15.0, "weight_unit": "kg", "weight_value": 15.0, "rep_count": 10},
        ],
    },
    {
        "date": "2026-05-30 10:00:00",
        "session_id": str(uuid.uuid4()),
        "rows": [
            {"set_number": 1, "weight_use": 15.0, "weight_unit": "kg", "weight_value": 15.0, "rep_count": 10},
            {"set_number": 2, "weight_use": 17.5, "weight_unit": "kg", "weight_value": 17.5, "rep_count": 8},
            {"set_number": 3, "weight_use": 17.5, "weight_unit": "kg", "weight_value": 17.5, "rep_count": 8},
        ],
    },
]


def insert_user_profile(connection, profile):
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO user_profiles (
            profile_id,
            user_id,
            display_name,
            experience_level,
            age,
            gender,
            level,
            injury_report,
            injury_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            display_name=excluded.display_name,
            experience_level=excluded.experience_level,
            age=excluded.age,
            gender=excluded.gender,
            level=excluded.level,
            injury_report=excluded.injury_report,
            injury_details=excluded.injury_details
        """,
        (
            profile["profile_id"],
            profile["user_id"],
            profile["display_name"],
            profile["experience_level"],
            profile["age"],
            profile["gender"],
            profile["level"],
            profile["injury_report"],
            profile["injury_details"],
        ),
    )
    connection.commit()


def build_user_workout_rows():
    rows = []
    for session in WORKOUT_SESSIONS:
        for row in session["rows"]:
            rows.append(
                {
                    "user_id": "user_001",
                    "exercise_id": "ex_goblet_squat",
                    "exercise_name": "Goblet Squat",
                    "session_id": session["session_id"],
                    "logged_at": session["date"],
                    "set_number": row["set_number"],
                    "weight_use": row["weight_use"],
                    "weight_unit": row["weight_unit"],
                    "weight_value": row["weight_value"],
                    "rep_count": row["rep_count"],
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
                weight_unit,
                weight_value,
                rep_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["user_id"],
                row["exercise_id"],
                row["exercise_name"],
                row["session_id"],
                row["logged_at"],
                row["set_number"],
                row["weight_use"],
                row["weight_unit"],
                row["weight_value"],
                row["rep_count"],
            ),
        )
        inserted += 1

    connection.commit()
    return inserted


def show_results(connection):
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT
            profile_id,
            user_id,
            age,
            gender,
            level,
            injury_report,
            injury_details
        FROM user_profiles
        WHERE user_id = ?
        """,
        ("user_001",),
    )
    print("\nUser profile:")
    for row in cursor.fetchall():
        print(row)

    cursor.execute(
        """
        SELECT
            log_id,
            user_id,
            exercise_id,
            exercise_name,
            session_id,
            logged_at,
            set_number,
            weight_use,
            weight_unit,
            weight_value,
            rep_count
        FROM workout_sessions_log
        WHERE user_id = ?
        ORDER BY logged_at, session_id, set_number
        """,
        ("user_001",),
    )

    print("\nWorkout session logs for user_001:")
    for row in cursor.fetchall():
        print(row)


def main():
    print("Ensuring database schema exists...")
    init_db()

    print(f"Connecting to SQLite database at: {DATABASE_PATH}")
    conn = sqlite3.connect(DATABASE_PATH)

    print("Inserting demo user profile...")
    insert_user_profile(conn, USER_PROFILE)

    workout_rows = build_user_workout_rows()
    print(f"Inserting {len(workout_rows)} workout log rows for user_001...")
    inserted_count = insert_workout_rows(conn, workout_rows)
    print(f"Inserted {inserted_count} rows into workout_sessions_log.")

    show_results(conn)

    conn.close()
    print("Demo workout session loader complete.")


if __name__ == "__main__":
    main()
