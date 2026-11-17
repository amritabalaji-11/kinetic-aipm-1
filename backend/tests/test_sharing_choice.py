"""The person's one-time answer to "Can our team watch your videos?": starts unanswered, is saved, and only they can set it."""
import sqlite3
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import auth
from utils.security import create_access_token


class SharingChoice(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "t.db"
        con = sqlite3.connect(cls.path)
        con.execute(init_db.CREATE_USER_PROFILE_SQL)
        for table, column, definition in init_db.MIGRATIONS:
            try:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            except sqlite3.OperationalError:
                pass
        for uid in ("user-a", "user-b"):
            con.execute("INSERT INTO user_profiles (profile_id, user_id, email, display_name, auth_provider) VALUES (?,?,?,?, 'email')", (f"p-{uid}", uid, f"{uid}@example.com", uid))
        con.commit()
        con.close()
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real = auth.db
        auth.db = cls.database

        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(auth.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        auth.db = cls.real
        cls.tmp.cleanup()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def test_nobody_starts_with_an_answer(self):
        self.assertIsNone(self.call("GET", "/auth/me").json()["share_videos_default"])  # not asked yet is not the same as no

    def test_the_answer_is_saved_and_can_change(self):
        self.assertEqual(self.call("POST", "/auth/me/sharing", json={"share": True}).status_code, 200)
        self.assertIs(self.call("GET", "/auth/me").json()["share_videos_default"], True)
        self.call("POST", "/auth/me/sharing", json={"share": False})
        self.assertIs(self.call("GET", "/auth/me").json()["share_videos_default"], False)
        self.assertIsNone(self.call("GET", "/auth/me", "user-b").json()["share_videos_default"])  # someone else is untouched

    def test_you_must_be_signed_in_and_exist(self):
        self.assertEqual(self.call("POST", "/auth/me/sharing", None, json={"share": True}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/sharing", "ghost", json={"share": True}).status_code, 404)
        self.assertEqual(self.call("POST", "/auth/me/sharing", json={"share": "maybe"}).status_code, 422)

    def test_the_time_of_the_answer_is_kept(self):
        self.call("POST", "/auth/me/sharing", "user-b", json={"share": True})
        con = sqlite3.connect(self.path)
        self.assertTrue(con.execute("SELECT share_choice_at FROM user_profiles WHERE user_id = 'user-b'").fetchone()[0])
        con.close()

    # ---- "A little about you" ----
    def row(self, user):
        con = sqlite3.connect(self.path)
        r = con.execute("SELECT experience_level, training_types, age_range, gender, injury_report, injury_details, workouts_per_week FROM user_profiles WHERE user_id = ?", (user,)).fetchone()
        con.close()
        return r

    def test_about_you_saves_only_what_was_given(self):
        self.call("POST", "/auth/me/about", "user-a", json={"experience": "1-2", "training_types": ["strength", "cardio", "strength"]})
        self.assertEqual(self.row("user-a")[:2], ("1-2", "cardio,strength"))  # no duplicates, in a fixed order
        self.call("POST", "/auth/me/about", "user-a", json={"age_range": "30-39", "gender": "prefer_not_to_say"})
        self.assertEqual(self.row("user-a")[:4], ("1-2", "cardio,strength", "30-39", "prefer_not_to_say"))  # earlier answers stay
        self.assertEqual(self.call("POST", "/auth/me/about", "user-a", json={}).json()["saved"], [])  # skipping saves nothing
        self.call("POST", "/auth/me/about", "user-a", json={"workouts_per_week": "3-4"})
        self.assertEqual(self.row("user-a")[6], "3-4")

    def test_injuries_keep_their_text_only_for_yes(self):
        self.call("POST", "/auth/me/about", "user-a", json={"has_injury": True, "injury_details": "  left knee, 2023  "})
        self.assertEqual(self.row("user-a")[4:6], (1, "left knee, 2023"))
        self.call("POST", "/auth/me/about", "user-a", json={"has_injury": False, "injury_details": "should not be kept"})
        self.assertEqual(self.row("user-a")[4:6], (0, None))
        self.assertEqual(self.call("POST", "/auth/me/about", "user-a", json={"has_injury": True, "injury_details": "x" * 1001}).status_code, 422)

    def test_about_you_refuses_made_up_values_and_strangers(self):
        for bad in ({"gender": "other thing"}, {"experience": "forever"}, {"training_types": ["skydiving"]}, {"age_range": "200+"}, {"workouts_per_week": "daily"}):
            self.assertEqual(self.call("POST", "/auth/me/about", "user-b", json=bad).status_code, 422, bad)
        self.assertEqual(self.row("user-b"), (None, None, None, None, 0, None, None))
        self.assertEqual(self.call("POST", "/auth/me/about", None, json={"gender": "woman"}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/about", "ghost", json={"gender": "woman"}).status_code, 404)

    # ---- the health note ----
    def test_health_note_starts_unticked_and_is_recorded_with_its_version(self):
        self.assertIsNone(self.call("GET", "/auth/me").json()["health_notice_version"])
        self.assertEqual(self.call("POST", "/auth/me/health-notice", json={"version": "2026-11-16"}).status_code, 200)
        self.assertEqual(self.call("GET", "/auth/me").json()["health_notice_version"], "2026-11-16")
        con = sqlite3.connect(self.path)
        self.assertTrue(con.execute("SELECT health_notice_accepted_at FROM user_profiles WHERE user_id = 'user-a'").fetchone()[0])
        con.close()
        self.assertIsNone(self.call("GET", "/auth/me", "user-b").json()["health_notice_version"])  # someone else is untouched

    def test_health_note_needs_a_signed_in_person_and_a_version(self):
        self.assertEqual(self.call("POST", "/auth/me/health-notice", None, json={"version": "x"}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/health-notice", "ghost", json={"version": "x"}).status_code, 404)
        self.assertEqual(self.call("POST", "/auth/me/health-notice", json={"version": ""}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
