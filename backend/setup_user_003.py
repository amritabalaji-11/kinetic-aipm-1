#!/usr/bin/env python3
"""
Script to set up user_003's annotated_frame_url to match user_001's setup pattern.
This allows user_003's image to appear in the analysis screen.
"""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "kinetic.db"

def setup_user_003():
    """Update user_003's profile with annotated_frame_url."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        # First, check current state
        cursor.execute("""
            SELECT user_id, display_name, annotated_frame_url
            FROM user_profiles
            WHERE user_id IN ('user_001', 'user_003')
        """)

        print("Current state:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} -> {row[2] or '(not set)'}")

        # Update user_003 with annotated_frame_url
        cursor.execute("""
            UPDATE user_profiles
            SET annotated_frame_url = '/user_003_1.jpg'
            WHERE user_id = 'user_003'
        """)

        conn.commit()

        # Verify the update
        print("\nAfter update:")
        cursor.execute("""
            SELECT user_id, display_name, annotated_frame_url
            FROM user_profiles
            WHERE user_id IN ('user_001', 'user_003')
        """)

        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} -> {row[2] or '(not set)'}")

        print("\n✓ user_003 setup complete!")

    except sqlite3.OperationalError as e:
        print(f"❌ Database error: {e}")
        print("   Make sure the backend is stopped before running this script.")
    finally:
        conn.close()

if __name__ == "__main__":
    setup_user_003()
