import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "kinetic.db"


CREATE_USER_PROFILE_SQL = """
CREATE TABLE IF NOT EXISTS user_profiles (
        profile_id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT NULL,
        date_of_birth TEXT NULL,
        fitness_goals TEXT NULL,
        injury_history TEXT NULL,
        training_frequency INTEGER NULL,
        experience_level TEXT NULL,
        annotated_frame_url TEXT NULL,
        progress_ladder_image_url TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """
    
CREATE_FORM_ANALYSES_SQL = """ 
CREATE TABLE IF NOT EXISTS form_analyses (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        exercise_name TEXT NOT NULL DEFAULT 'goblet_squat',
        weight_value REAL NULL,
        weight_unit TEXT NULL DEFAULT 'kg',
        weight_kg REAL NULL,
        video_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        quality_gate_status TEXT NULL,
        video_score REAL NULL,
        analysis_id TEXT NULL,
        filename TEXT NULL,
        size_mb REAL NULL,
        progression_output TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        biomechanics_json TEXT,
        error_code TEXT,
        llm_json TEXT
)
"""

CREATE_FORM_ANALYSIS_RESULTS_SQL = """
CREATE TABLE IF NOT EXISTS form_analysis_results (
        analysis_id TEXT PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL REFERENCES form_analyses(session_id) ON DELETE CASCADE,
        user_id TEXT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        overall_score REAL NOT NULL,
        range_of_motion_score INTEGER NULL,
        posture_score INTEGER NULL,
        stability_score INTEGER NULL,
        movement_quality_score INTEGER NULL,
        tempo_score INTEGER NULL,
        rep_scores TEXT NULL,
        rep_count INTEGER NULL,
        coaching_output TEXT NULL,
        progression_recommendation TEXT NULL,
        annotated_frame_urls TEXT NULL,
        camera_angle TEXT NULL,
        model_version TEXT NOT NULL DEFAULT 'claude-3-5-haiku-20241022',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        issue_tags TEXT NULL,
        faults_detected TEXT NULL,
        fault_confidence TEXT NULL,
        causal_chains TEXT NULL,
        fault_detail TEXT NULL,
        trends TEXT NULL,
        issues_json TEXT NULL,
        raw_llm_response TEXT NULL,
        chain_of_thought TEXT NULL,
        worst_frame_index INTEGER NULL
)
"""

CREATE_PROGRESSION_RESULTS_SQL = """
CREATE TABLE IF NOT EXISTS progression_results (
        analysis_id TEXT PRIMARY KEY REFERENCES form_analysis_results(analysis_id) ON DELETE CASCADE,
        session_id TEXT UNIQUE NOT NULL REFERENCES form_analyses(session_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL DEFAULT 'goblet-squat',
        progress_direction TEXT NULL,
        weight_recommendation TEXT NULL,
        progression_verdict TEXT NULL,
        focus_this_week TEXT NULL,
        posture_trend TEXT NULL,
        stability_trend TEXT NULL,
        range_of_motion_trend TEXT NULL,
        movement_quality_trend TEXT NULL,
        coaching_reasoning TEXT NULL,
        available INTEGER NOT NULL DEFAULT 0,
        error TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
    
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    cursor.execute(CREATE_USER_PROFILE_SQL)

    # Seed the Demo User profile to prevent foreign key errors during upload fallbacks
    demo_user_id = "00000000-0000-0000-0000-000000000000"
    cursor.execute("""
    INSERT INTO user_profiles (
        profile_id, user_id, display_name, experience_level, annotated_frame_url, progress_ladder_image_url
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
        display_name=excluded.display_name,
        experience_level=excluded.experience_level,
        annotated_frame_url=excluded.annotated_frame_url,
        progress_ladder_image_url=excluded.progress_ladder_image_url
    """, (demo_user_id, demo_user_id, "Demo User", "Intermediate", "for demo", "for demo"))
    
    conn.commit()
    print("Local SQLite database initialized with 4 tables successfully.")

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
    cursor.execute(CREATE_PROGRESSION_RESULTS_SQL)

    conn.commit()
    conn.close()
    print("Database initialized.")

if __name__ == "__main__":
    init_db()
