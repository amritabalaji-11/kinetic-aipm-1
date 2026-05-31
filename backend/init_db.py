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
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        age INTEGER,
        gender TEXT,
        level TEXT,
        injury_report INTEGER DEFAULT 0,
        injury_details TEXT
        )
        """
    
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

    filename TEXT,
    size_mb REAL,
    progression_output TEXT,

    -- S2-W8-01: Haiku Call 2 async job tracking fields
    haiku_call_2_status TEXT DEFAULT 'queued',
    haiku_call_2_queued_at TEXT,
    haiku_call_2_started_at TEXT,
    haiku_call_2_completed_at TEXT,
    haiku_call_2_error TEXT,

    created_at TEXT NOT NULL
)
"""

CREATE_FORM_ANALYSIS_RESULTS_SQL = """
CREATE TABLE IF NOT EXISTS form_analysis_results (
        analysis_id TEXT PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL REFERENCES form_analyses(session_id) ON DELETE CASCADE,
        user_id TEXT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
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
        worst_frame_index INTEGER NULL,

        exercise_id TEXT NOT NULL,
        weight_value REAL,
        weight_unit TEXT,
        weight_kg_normalised REAL, 
        overall_form_score INTEGER,
        session_tags TEXT, 
        comparison_coaching_output TEXT,
        annotated_frame_url TEXT
    )
    """

CREATE_PROGRESSION_RESULTS_SQL = """
CREATE TABLE IF NOT EXISTS progression_results (
        analysis_id TEXT PRIMARY KEY REFERENCES form_analysis_results(analysis_id) ON DELETE CASCADE,
        session_id TEXT UNIQUE NOT NULL REFERENCES form_analyses(session_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL DEFAULT 'goblet-squat',
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
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,


        error_code TEXT,
        progress_direction TEXT
            CHECK (progress_direction IN ('up', 'down', 'stable'))

    )
    """
    


CREATE_WORKOUT_SESSIONS_LOG_SQL = """
CREATE TABLE IF NOT EXISTS workout_sessions_log (
    
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    set_number INTEGER,
    weight_use REAL,
    rep_count INTEGER
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

    # =====================================================
    # CREATE TABLES
    # =====================================================

    cursor.execute(CREATE_FORM_ANALYSES_SQL)
    for col, definition in [
        ("progression_output",       "TEXT"),
        ("filename",                 "TEXT"),
        ("size_mb",                  "REAL"),
        # S2-W8-01: Haiku Call 2 async job tracking fields
        ("haiku_call_2_status",      "TEXT DEFAULT 'queued'"),
        ("haiku_call_2_queued_at",   "TEXT"),
        ("haiku_call_2_started_at",  "TEXT"),
        ("haiku_call_2_completed_at","TEXT"),
        ("haiku_call_2_error",       "TEXT"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE form_analyses ADD COLUMN {col} {definition}")
            conn.commit()
            print(f"Migrated: added {col} column.")
        except sqlite3.OperationalError:
            pass  # column already exists

    cursor.execute(CREATE_WORKOUT_SESSIONS_LOG_SQL)

    cursor.execute(CREATE_USER_PROFILE_SQL)

    cursor.execute(CREATE_FORM_ANALYSIS_RESULTS_SQL)

    cursor.execute(CREATE_PROGRESSION_RESULTS_SQL)

    # =====================================================
    # SAFE MIGRATIONS
    # =====================================================

    migrations = [

        # form_analyses
        ("form_analyses", "progression_output", "TEXT"),
        ("form_analyses", "filename", "TEXT"),
        ("form_analyses", "size_mb", "REAL"),

        # user_profile
        ("user_profile", "annotated_frame_url", "TEXT"),
        ("user_profile", "progress_ladder_image_url", "TEXT"),

        # form_analysis_results
        ("form_analysis_results", "annotated_frame_url", "TEXT"),
    ]

    for table, column, definition in migrations:
        try:
            cursor.execute(
                f"""
                ALTER TABLE {table}
                ADD COLUMN {column} {definition}
                """
            )
            conn.commit()

            print(f"[migration] added {column} to {table}")

        except sqlite3.OperationalError:
            pass

    conn.commit()

    conn.close()

    print("Database initialized.")

if __name__ == "__main__":
    init_db()
