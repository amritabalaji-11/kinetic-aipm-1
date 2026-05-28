import sqlite3
import os

# Resolve the absolute path to kinetic.db located in the backend/ directory
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "kinetic.db"))

def init_db():
    print(f"Initializing SQLite database at: {DB_PATH}")
    
    # Ensure parent directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. User Profiles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profiles (
        profile_id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT NULL,
        date_of_birth TEXT NULL,
        fitness_goals TEXT NULL,
        injury_history TEXT NULL,
        training_frequency INTEGER NULL,
        experience_level TEXT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Form Analyses (Sessions) Table
    cursor.execute("""
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
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 3. Form Analysis Results Table (Call 1)
    cursor.execute("""
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
    """)

    # 4. Progression Results Table (Call 2)
    cursor.execute("""
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
    """)
    
    # Seed the Demo User profile to prevent foreign key errors during upload fallbacks
    demo_user_id = "00000000-0000-0000-0000-000000000000"
    cursor.execute("""
    INSERT OR IGNORE INTO user_profiles (
        profile_id, user_id, display_name, experience_level
    ) VALUES (?, ?, ?, ?)
    """, (demo_user_id, demo_user_id, "Demo User", "Intermediate"))
    
    conn.commit()
    conn.close()
    print("Local SQLite database initialized with 4 tables successfully.")

if __name__ == "__main__":
    init_db()
