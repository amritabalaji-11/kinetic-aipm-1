"""The favourite motivational line under a person's name: starts empty, is saved trimmed and capped, can be cleared, and is only theirs."""
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


class MotivationLine(unittest.TestCase):
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

    def setUp(self):
        con = sqlite3.connect(self.path)
        con.execute("UPDATE user_profiles SET motivation_line = NULL")
        con.commit()
        con.close()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def test_nobody_starts_with_a_line(self):
        self.assertIsNone(self.call("GET", "/auth/me").json()["motivation_line"])

    def test_it_is_saved_and_comes_back(self):
        self.assertEqual(self.call("POST", "/auth/me/motivation", json={"line": "Show up. Lift. Repeat."}).status_code, 200)
        self.assertEqual(self.call("GET", "/auth/me").json()["motivation_line"], "Show up. Lift. Repeat.")

    def test_it_is_trimmed_tidied_and_capped_at_80_characters(self):
        self.call("POST", "/auth/me/motivation", json={"line": "   Strong   today\n and tomorrow   "})
        self.assertEqual(self.call("GET", "/auth/me").json()["motivation_line"], "Strong today and tomorrow")
        self.call("POST", "/auth/me/motivation", json={"line": "x" * 150})
        self.assertEqual(len(self.call("GET", "/auth/me").json()["motivation_line"]), 80)

    def test_an_empty_line_clears_it(self):
        self.call("POST", "/auth/me/motivation", json={"line": "Keep going"})
        self.call("POST", "/auth/me/motivation", json={"line": "   "})
        self.assertIsNone(self.call("GET", "/auth/me").json()["motivation_line"])

    def test_it_is_only_theirs(self):
        self.call("POST", "/auth/me/motivation", "user-a", json={"line": "Mine"})
        self.assertIsNone(self.call("GET", "/auth/me", "user-b").json()["motivation_line"])

    def test_it_needs_a_signed_in_person_and_a_sensible_size(self):
        self.assertEqual(self.call("POST", "/auth/me/motivation", None, json={"line": "x"}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/motivation", "ghost", json={"line": "x"}).status_code, 404)
        self.assertEqual(self.call("POST", "/auth/me/motivation", json={"line": "x" * 500}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
