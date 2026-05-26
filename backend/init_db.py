import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "kinetic.db"

CREATE_FORM_ANALYSES_SQL = """
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
"""

CREATE_FORM_ANALYSIS_RESULTS_SQL = """
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
"""

def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute(CREATE_FORM_ANALYSES_SQL)

    for col, definition in [
        ("progression_output", "TEXT"),
        ("filename", "TEXT"),
        ("size_mb", "REAL"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE form_analyses ADD COLUMN {col} {definition}")
            conn.commit()
            print(f"Migrated: added {col} column.")
        except sqlite3.OperationalError:
            pass  # column already exists

    cursor.execute(CREATE_FORM_ANALYSIS_RESULTS_SQL)
    conn.commit()
    conn.close()
    print("Database initialized.")

if __name__ == "__main__":
    init_db()
