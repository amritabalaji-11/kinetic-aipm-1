import sqlite3

conn = sqlite3.connect("kinetic.db")

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS form_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    exercise_name TEXT,
    weight_used REAL,
    status TEXT,
    video_gcs_path TEXT
)
""")

conn.commit()
conn.close()

print("Database initialized.")