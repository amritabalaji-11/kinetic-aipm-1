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
        r = con.execute("SELECT experience_level, fitness_goals, age_range FROM user_profiles WHERE user_id = ?", (user,)).fetchone()
        con.close()
        return r

    def test_about_you_saves_only_what_was_given(self):
        self.assertEqual(self.call("POST", "/auth/me/about", "user-a", json={"experience": "1-2", "goal": "strength"}).json()["saved"], ["experience", "goal"])
        self.assertEqual(self.row("user-a"), ("1-2", "strength", None))
        self.call("POST", "/auth/me/about", "user-a", json={"age_range": "30-39"})
        self.assertEqual(self.row("user-a"), ("1-2", "strength", "30-39"))  # the earlier answers stay
        self.assertEqual(self.call("POST", "/auth/me/about", "user-a", json={}).json()["saved"], [])  # skipping saves nothing

    def test_about_you_refuses_made_up_values_and_strangers(self):
        self.assertEqual(self.call("POST", "/auth/me/about", "user-b", json={"goal": "world domination"}).status_code, 422)
        self.assertEqual(self.row("user-b"), (None, None, None))
        self.assertEqual(self.call("POST", "/auth/me/about", None, json={"goal": "muscle"}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/about", "ghost", json={"goal": "muscle"}).status_code, 404)


if __name__ == "__main__":
    unittest.main()
