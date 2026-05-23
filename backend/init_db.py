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
    rep_count INTEGER,

    -- Video metadata stored at upload time — used in upload_received SSE payload
    filename TEXT,
    size_mb REAL,

    -- Haiku Call 2 output (Step 9) — longitudinal coaching for Tab 2
    progression_output TEXT,

    created_at TEXT NOT NULL
)
""")

# Migrate existing DB instances
for col, definition in [
    ("progression_output", "TEXT"),
    ("filename",           "TEXT"),
    ("size_mb",            "REAL"),
]:
    try:
        cursor.execute(f"ALTER TABLE form_analyses ADD COLUMN {col} {definition}")
        conn.commit()
        print(f"Migrated: added {col} column.")
    except sqlite3.OperationalError:
        pass  # column already exists

conn.commit()
conn.close()

print("Database initialized.")