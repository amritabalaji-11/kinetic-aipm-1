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
    
    annotated_frame_url TEXT,

    -- ===================================================== 
    -- ASYNC HAIKU CALL 2 JOB TRACKING 
    -- ===================================================== 
    
    job_status TEXT DEFAULT 'queued' 
    CHECK ( 
        job_status IN ( 
            'queued', 
            'running', 
            'complete', 
            'failed', 
            'timeout' 
        ) 
    ), 
    
    queued_at TEXT, 
    
    started_at TEXT, 
    
    completed_at TEXT, 
    
    haiku_call_2_output TEXT, 
    
    haiku_call_2_error TEXT
)
"""

CREATE_PROGRESSION_RESULTS_SQL = """
CREATE TABLE IF NOT EXISTS progression_results (

    analysis_id TEXT NOT NULL PRIMARY KEY,

    user_id TEXT NOT NULL,

    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    available INTEGER DEFAULT 1,

    error_code TEXT,

    progress_direction TEXT
        CHECK (progress_direction IN ('up', 'down', 'stable')),
    
    coaching_reasoning TEXT,

    weight_recommendation TEXT,

    focus_this_week TEXT,

    posture_trend TEXT,
    stability_trend TEXT,
    range_of_motion_trend TEXT,
    movement_quality_trend TEXT,

    computed_at TEXT DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_USER_PROFILE_SQL = """
CREATE TABLE IF NOT EXISTS user_profile (

    user_id TEXT PRIMARY KEY,

    progress_ladder_image_url TEXT DEFAULT NULL,

    annotated_frame_url TEXT DEFAULT NULL,

    age INTEGER,

    gender TEXT,

    level TEXT,

    injury_report INTEGER DEFAULT 0,

    injury_details TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

    # =====================================================
    # CREATE TABLES
    # =====================================================

    cursor.execute(CREATE_FORM_ANALYSES_SQL)

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

        #Async Haiku Call 2 job tracking 
        ("form_analysis_results", "job_status", "TEXT DEFAULT 'queued'"),
        ("form_analysis_results", "queued_at", "TEXT"),
        ("form_analysis_results", "started_at", "TEXT"),
        ("form_analysis_results", "completed_at", "TEXT"),
        ("form_analysis_results", "haiku_call_2_output", "TEXT"),
        ("form_analysis_results", "haiku_call_2_error", "TEXT")
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
