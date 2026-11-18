"""The person's own "A little about you" answers: read back, changed, taken back, only theirs."""
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


class AboutYou(unittest.TestCase):
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
        con.execute("UPDATE user_profiles SET experience_level=NULL, workouts_per_week=NULL, age_range=NULL, gender=NULL, training_types=NULL, injury_report=NULL, injury_details=NULL")
        con.commit()
        con.close()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def about(self, user="user-a"):
        return self.call("GET", "/auth/me/about", user).json()

    def test_nothing_answered_to_start_with(self):
        a = self.about()
        self.assertEqual(a, {"experience": None, "workouts_per_week": None, "training_types": [], "age_range": None, "gender": None, "has_injury": None, "injury_details": None})

    def test_answers_come_back_as_given(self):
        self.call("POST", "/auth/me/about", json={"experience": "1-2", "workouts_per_week": "3-4", "training_types": ["strength", "cardio"], "age_range": "30-39", "gender": "woman", "has_injury": True, "injury_details": "left knee"})
        a = self.about()
        self.assertEqual((a["experience"], a["workouts_per_week"], a["age_range"], a["gender"]), ("1-2", "3-4", "30-39", "woman"))
        self.assertEqual(a["training_types"], ["cardio", "strength"])
        self.assertTrue(a["has_injury"])
        self.assertEqual(a["injury_details"], "left knee")

    def test_a_no_for_injuries_is_kept_as_a_no_once_other_answers_exist(self):
        self.call("POST", "/auth/me/about", json={"experience": "new", "has_injury": False})
        a = self.about()
        self.assertIs(a["has_injury"], False)
        self.assertIsNone(a["injury_details"])

    def test_the_database_default_of_zero_is_not_read_as_a_no(self):
        con = sqlite3.connect(self.path)
        con.execute("UPDATE user_profiles SET injury_report = 0")  # what a profile that was never asked has
        con.commit()
        con.close()
        self.assertIsNone(self.about()["has_injury"])

    def test_one_answer_can_be_changed_without_touching_the_rest(self):
        self.call("POST", "/auth/me/about", json={"experience": "new", "gender": "man"})
        self.call("POST", "/auth/me/about", json={"experience": "3+"})
        a = self.about()
        self.assertEqual((a["experience"], a["gender"]), ("3+", "man"))

    def test_an_answer_can_be_taken_back(self):
        self.call("POST", "/auth/me/about", json={"gender": "woman", "training_types": ["cardio"], "has_injury": True, "injury_details": "knee"})
        r = self.call("POST", "/auth/me/about", json={"clear": ["gender", "training_types", "has_injury"]})
        self.assertEqual(r.status_code, 200)
        a = self.about()
        self.assertEqual((a["gender"], a["training_types"], a["has_injury"], a["injury_details"]), (None, [], None, None))

    def test_taking_back_one_leaves_the_others(self):
        self.call("POST", "/auth/me/about", json={"experience": "new", "age_range": "40+"})
        self.call("POST", "/auth/me/about", json={"clear": ["age_range"]})
        a = self.about()
        self.assertEqual((a["experience"], a["age_range"]), ("new", None))

    def test_only_known_answers_can_be_cleared(self):
        for bad in ("email", "role", "weight_unit", "user_id; DROP TABLE x"):
            self.assertEqual(self.call("POST", "/auth/me/about", json={"clear": [bad]}).status_code, 422, bad)

    def test_it_is_only_theirs_and_needs_a_sign_in(self):
        self.call("POST", "/auth/me/about", "user-a", json={"gender": "man", "has_injury": True, "injury_details": "private"})
        b = self.about("user-b")
        self.assertEqual((b["gender"], b["has_injury"], b["injury_details"]), (None, None, None))
        self.assertEqual(self.call("GET", "/auth/me/about", None).status_code, 401)
        self.assertEqual(self.call("GET", "/auth/me/about", "ghost").status_code, 404)


if __name__ == "__main__":
    unittest.main()
