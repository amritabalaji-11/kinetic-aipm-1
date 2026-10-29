import json
import re
import sqlite3
from pathlib import Path

from db.database import IS_POSTGRES, NOW_TEXT, POSTGRES_DSN
from db.exercise_catalog import EXERCISES

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "kinetic.db"


def to_postgres(sql: str) -> str:
    """The table definitions below are written for SQLite. This rewrites one statement for Postgres:
    - the auto-numbering column and text-based dates become their Postgres equivalents
    - REAL becomes DOUBLE PRECISION (Postgres REAL is only 7 digits)
    - score columns allow decimals (SQLite let a 85.5 into an INTEGER column; Postgres refuses it)
    - "must point at a real parent row" rules are dropped, because SQLite never enforced them for the running app
      and some saved analyses belong to demo users that have no profile row
    """
    sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")
    sql = re.sub(r"\bREAL\b", "DOUBLE PRECISION", sql)
    sql = re.sub(r"\b(\w*_score)\s+INTEGER\b", r"\1 DOUBLE PRECISION", sql)
    sql = sql.replace("DEFAULT CURRENT_TIMESTAMP", f"DEFAULT ({NOW_TEXT})")
    sql = re.sub(r"\bTIMESTAMP NULL\b", "TEXT NULL", sql)
    sql = re.sub(r",\s*FOREIGN KEY\s*\([^)]*\)\s*REFERENCES\s+\w+\s*\([^)]*\)(\s+ON DELETE CASCADE)?", "", sql)
    sql = re.sub(r"\s+REFERENCES\s+\w+\s*\([^)]*\)(\s+ON DELETE CASCADE)?", "", sql)
    return sql.replace("?", "%s")


class _Connection:
    """One small wrapper so init_db reads the same for SQLite (local) and Postgres (live)."""

    def __init__(self):
        if IS_POSTGRES:
            import psycopg
            self.conn = psycopg.connect(POSTGRES_DSN, autocommit=True)  # each statement stands alone
        else:
            self.conn = sqlite3.connect(DATABASE_PATH)
            self.conn.execute("PRAGMA foreign_keys = ON;")
        self.cursor = self.conn.cursor()

    def run(self, sql, params=()):
        self.cursor.execute(to_postgres(sql) if IS_POSTGRES else sql, params)

    def run_many(self, sql, rows):
        """Same statement for many rows. On Postgres they are sent in one batch instead of one trip each."""
        if IS_POSTGRES:
            self.cursor.executemany(to_postgres(sql), rows)
        else:
            self.cursor.executemany(sql, rows)

    def existing_columns(self):
        """{(table, column), ...} that already exist (Postgres only; one query instead of one per column)."""
        self.cursor.execute(
            "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()"
        )
        return set(self.cursor.fetchall())

    def add_column(self, table, column, definition, existing=None):
        """Add a column if the table does not have it yet. Returns True when it was added."""
        if IS_POSTGRES:
            if existing is not None and (table, column) in existing:
                return False
            self.run(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {to_postgres(definition)}")
            return True
        try:
            self.cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            self.conn.commit()
            return True
        except sqlite3.OperationalError:
            return False  # column already exists

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()


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
        llm_json TEXT,
        
        
        -- S2-W8-01: Haiku Call 2 async job tracking fields
        haiku_call_2_status TEXT DEFAULT 'queued',
        haiku_call_2_queued_at TEXT,
        haiku_call_2_started_at TEXT,
        haiku_call_2_completed_at TEXT,
        haiku_call_2_error TEXT
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
        model_version TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
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
        annotated_frame_url TEXT,

          -- Haiku Call 2 async tracking
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
        retryable BOOLEAN,
        last_error_at TIMESTAMP NULL,
        progress_direction TEXT
            CHECK (progress_direction IN ('up', 'down', 'stable'))

    )
    """
    


CREATE_WORKOUT_SESSIONS_LOG_SQL = """
CREATE TABLE IF NOT EXISTS workout_sessions_log (
    
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT,
    session_id TEXT NOT NULL,
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    set_number INTEGER,
    weight_use REAL,
    weight_unit TEXT,
    weight_value REAL,
    rep_count INTEGER
)
"""

# A workout (one gym session) -> its exercises -> the sets of each exercise.
# Sets live in workout_sessions_log; session_id there = workout_exercise_id below.
CREATE_WORKOUTS_SQL = """
CREATE TABLE IF NOT EXISTS workouts (
    workout_id    TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    name          TEXT,
    focus_label   TEXT,
    muscles       TEXT,
    notes         TEXT,
    started_at    TEXT,
    ended_at      TEXT,
    duration_min  INTEGER,
    status        TEXT DEFAULT 'completed',
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_WORKOUT_EXERCISES_SQL = """
CREATE TABLE IF NOT EXISTS workout_exercises (
    workout_exercise_id TEXT PRIMARY KEY,
    workout_id          TEXT NOT NULL,
    exercise_id         TEXT NOT NULL,
    exercise_name       TEXT,
    position            INTEGER,
    notes               TEXT,
    FOREIGN KEY (workout_id) REFERENCES workouts(workout_id) ON DELETE CASCADE
)
"""

# One row per exercise AND equipment variant (dumbbell vs barbell goblet squat are separate ids).
# workout_exercises.exercise_id / workout_sessions_log.exercise_id refer to exercises.exercise_id.
CREATE_EXERCISES_SQL = """
CREATE TABLE IF NOT EXISTS exercises (
    exercise_id      TEXT PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    movement         TEXT NOT NULL,      -- shared by equipment variants, e.g. 'goblet-squat'
    equipment        TEXT NOT NULL,      -- barbell | dumbbell | kettlebell | machine | cable | bodyweight
    muscle_group     TEXT NOT NULL,      -- primary: legs | chest | back | shoulders | arms | full_body
    secondary_groups TEXT,               -- JSON list of other groups that also include this exercise
    muscles          TEXT,               -- JSON list of specific muscles, e.g. ["Quads", "Glutes"]
    category         TEXT,               -- Compound | Isolation
    image            TEXT,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (movement, equipment)
)
"""


# What the Listen button says for each exercise: a short spoken script written (by an AI, from the guide's points) in a
# trainer's voice. Drafts until a person approves them. Written by scripts/generate_coach_scripts.py.
CREATE_EXERCISE_GUIDES_SQL = """
CREATE TABLE IF NOT EXISTS exercise_guides (
    exercise_id               TEXT PRIMARY KEY,
    coach_script              TEXT,
    coach_script_short        TEXT,
    coach_script_status       TEXT NOT NULL DEFAULT 'draft',
    coach_script_model        TEXT,
    coach_script_source_hash  TEXT,
    coach_script_generated_at TEXT,
    updated_at                TEXT DEFAULT CURRENT_TIMESTAMP
)
"""


def seed_exercises(db_):
    """Insert or update the catalogue from db/exercise_catalog.py. Safe to run on every start."""
    db_.run_many(
        """
        INSERT INTO exercises (
            exercise_id, name, movement, equipment, muscle_group,
            secondary_groups, muscles, category, image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id) DO UPDATE SET
            name=excluded.name, movement=excluded.movement, equipment=excluded.equipment,
            muscle_group=excluded.muscle_group, secondary_groups=excluded.secondary_groups,
            muscles=excluded.muscles, category=excluded.category, image=excluded.image
        """,
        [(exercise_id, name, movement, equipment, groups[0],
          json.dumps(groups[1:]), json.dumps(muscles), category, image)
         for exercise_id, name, movement, equipment, groups, muscles, category, image in EXERCISES],
    )
    db_.run("CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group)")


# Columns added after the first version of each table. New databases get them here; older ones are topped up.
MIGRATIONS = [
    # form_analyses
    ("form_analyses", "progression_output", "TEXT"),
    ("form_analyses", "filename", "TEXT"),
    ("form_analyses", "size_mb", "REAL"),
    # S2-W8-01: Haiku Call 2 async job tracking fields
    ("form_analyses", "haiku_call_2_status", "TEXT DEFAULT 'queued'"),
    ("form_analyses", "haiku_call_2_queued_at", "TEXT"),
    ("form_analyses", "haiku_call_2_started_at", "TEXT"),
    ("form_analyses", "haiku_call_2_completed_at", "TEXT"),
    ("form_analyses", "haiku_call_2_error", "TEXT"),

    # user_profile
    ("user_profiles", "annotated_frame_url", "TEXT"),
    ("user_profiles", "progress_ladder_image_url", "TEXT"),

    # form_analysis_results
    ("form_analysis_results", "annotated_frame_url", "TEXT"),
    ("form_analysis_results", "job_status", "TEXT DEFAULT 'queued'"),
    ("form_analysis_results", "queued_at", "TEXT"),
    ("form_analysis_results", "started_at", "TEXT"),
    ("form_analysis_results", "completed_at", "TEXT"),
    ("form_analysis_results", "haiku_call_2_output", "TEXT"),
    ("form_analysis_results", "haiku_call_2_error", "TEXT"),

    # workout_sessions_log
    ("workout_sessions_log", "exercise_name", "TEXT"),
    ("workout_sessions_log", "weight_value", "REAL"),
    ("workout_sessions_log", "weight_unit", "TEXT"),
    ("workout_sessions_log", "workout_id", "TEXT"),   # links a set to its workout (NULL for old demo rows)
    ("workout_sessions_log", "set_notes", "TEXT"),
    ("workout_sessions_log", "duration_sec", "INTEGER"),   # how long a timed set lasted (NULL for sets logged by weight and reps)

    # workouts: the name shown in history (plan name, or what the user called it)
    ("workouts", "name", "TEXT"),

    # auth
    ("user_profiles", "email", "TEXT"),
    ("user_profiles", "hashed_password", "TEXT"),
    ("user_profiles", "auth_provider", "TEXT DEFAULT 'email'"),  # 'email' | 'google' | 'apple' | 'facebook'
    ("user_profiles", "oauth_sub", "TEXT"),   # provider's unique user id
    ("user_profiles", "email_verified", "INTEGER DEFAULT 0"),
]


def init_db():
    db_ = _Connection()

    db_.run(CREATE_USER_PROFILE_SQL)

    # Seed the Demo User profile to prevent foreign key errors during upload fallbacks
    demo_user_id = "00000000-0000-0000-0000-000000000000"
    db_.run("""
    INSERT INTO user_profiles (
        profile_id, user_id, display_name, experience_level, annotated_frame_url, progress_ladder_image_url
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
        display_name=excluded.display_name,
        experience_level=excluded.experience_level,
        annotated_frame_url=excluded.annotated_frame_url,
        progress_ladder_image_url=excluded.progress_ladder_image_url
    """, (demo_user_id, demo_user_id, "Demo User", "Intermediate", "for demo", "for demo"))

    db_.commit()

    # =====================================================
    # CREATE TABLES
    # =====================================================

    db_.run(CREATE_FORM_ANALYSES_SQL)
    db_.run(CREATE_WORKOUT_SESSIONS_LOG_SQL)
    db_.run(CREATE_WORKOUTS_SQL)
    db_.run(CREATE_WORKOUT_EXERCISES_SQL)
    db_.run(CREATE_EXERCISES_SQL)
    db_.run(CREATE_EXERCISE_GUIDES_SQL)
    seed_exercises(db_)

    db_.run(CREATE_FORM_ANALYSIS_RESULTS_SQL)
    db_.run(CREATE_PROGRESSION_RESULTS_SQL)

    # =====================================================
    # SAFE MIGRATIONS
    # =====================================================

    existing = db_.existing_columns() if IS_POSTGRES else None
    for table, column, definition in MIGRATIONS:
        if db_.add_column(table, column, definition, existing):
            print(f"[migration] added {column} to {table}")

    db_.run("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email
    ON user_profiles(email) WHERE email IS NOT NULL
    """)
    db_.run("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_oauth
    ON user_profiles(auth_provider, oauth_sub) WHERE oauth_sub IS NOT NULL
    """)
    db_.commit()
    db_.close()

    print(f"Database initialized ({'Postgres' if IS_POSTGRES else 'SQLite'}).")


if __name__ == "__main__":
    init_db()
