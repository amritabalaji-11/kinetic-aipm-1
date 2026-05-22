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
    created_at TEXT NOT NULL
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS form_analysis_results (
    analysis_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    weight_value REAL,
    weight_unit TEXT,
    weight_kg_normalised REAL,
    overall_form_score INTEGER,
    posture_score INTEGER,
    stability_score INTEGER,
    movement_quality_score INTEGER,
    tempo_score INTEGER,
    rep_count INTEGER,
    rep_scores TEXT,
    issue_tags TEXT,
    coaching_output TEXT,
    session_tags TEXT,
    comparison_coaching_output TEXT,
    fault_detail TEXT,
    causal_chain TEXT,
    annotated_frame_url TEXT
)
""")

conn.commit()
conn.close()
print("Database initialized.")
