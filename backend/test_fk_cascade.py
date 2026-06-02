import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "kinetic.db"

def run_test():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    user_id = "test-user-999"
    profile_id = "test-profile-999"
    session_id = "test-session-999"
    analysis_id = "test-analysis-999"

    print("\n--- INSERT USER ---")
    cursor.execute("""
        INSERT INTO user_profiles (
            profile_id,
            user_id,
            display_name,
            experience_level
        )
        VALUES (?, ?, ?, ?)
    """, (profile_id, user_id, "Cascade User", "Intermediate"))

    print("User inserted")

    print("\n--- INSERT SESSION ---")
    cursor.execute("""
        INSERT INTO form_analyses (
            session_id,
            user_id,
            exercise_name,
            video_url
        )
        VALUES (?, ?, ?, ?)
    """, (session_id, user_id, "goblet_squat", "http://video"))

    print("Session inserted")

    print("\n--- INSERT ANALYSIS RESULTS ---")
    cursor.execute("""
        INSERT INTO form_analysis_results (
            analysis_id,
            session_id,
            overall_score
        )
        VALUES (?, ?, ?)
    """, (analysis_id, session_id, 85.0))

    print("Analysis inserted")

    print("\n--- INSERT PROGRESSION RESULTS ---")
    cursor.execute("""
        INSERT INTO progression_results (
            analysis_id,
            session_id,
            user_id,
            available
        )
        VALUES (?, ?, ?, ?)
    """, (analysis_id, session_id, user_id, 1))

    print("Progression inserted")


    print("\n--- DELETE USER (cascade test) ---")
    cursor.execute("DELETE FROM user_profiles WHERE user_id = ?", (user_id,))

    print("User deleted")

    print("\n--- VERIFY CASCADE RESULTS ---")

    cursor.execute("SELECT * FROM form_analyses WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()

    cursor.execute("SELECT * FROM form_analysis_results WHERE analysis_id = ?", (analysis_id,))
    analysis = cursor.fetchone()

    cursor.execute("SELECT * FROM progression_results WHERE analysis_id = ?", (analysis_id,))
    progression = cursor.fetchone()

    if not session and not analysis and not progression:
        print("✅ SUCCESS: full cascade works across all tables")
    else:
        print("❌ FAILED: orphan records detected")
        print("session:", session)
        print("analysis:", analysis)
        print("progression:", progression)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_test()