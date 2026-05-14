import sqlite3

conn = sqlite3.connect("kinetic.db")

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS form_analyses (
    analysis_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    weight_value REAL NOT NULL,
    weight_unit TEXT NOT NULL,
    weight_kg_normalised REAL NOT NULL,
    video_url TEXT NOT NULL,
    status TEXT NOT NULL,
    overlay_video_url TEXT,
    biomechanics_json TEXT,
    error_code TEXT,
    created_at TEXT NOT NULL
)
""")

conn.commit()
conn.close()

print("Database initialized.")