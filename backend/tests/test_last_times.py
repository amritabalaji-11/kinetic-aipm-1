"""'Last time' on the workout screen: the heaviest set of the most recent session, the personal best, one person's data only."""
import sqlite3
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import auth, workouts
from utils.security import create_access_token


class LastTimes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "t.db"
        con = sqlite3.connect(cls.path)
        con.execute(init_db.CREATE_USER_PROFILE_SQL)
        con.execute(init_db.CREATE_WORKOUT_SESSIONS_LOG_SQL)
        for table, column, definition in init_db.MIGRATIONS:
            try:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            except sqlite3.OperationalError:
                pass
        con.commit()
        con.close()
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real = (auth.db, workouts.db)
        auth.db = workouts.db = cls.database

        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(auth.router)
        app.include_router(workouts.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        auth.db, workouts.db = cls.real
        cls.tmp.cleanup()

    def setUp(self):
        con = sqlite3.connect(self.path)
        con.execute("DELETE FROM workout_sessions_log")
        con.commit()
        con.close()

    def add(self, user, name, session, at, weight, unit, reps, eid="ex_x"):
        con = sqlite3.connect(self.path)
        cols = [r[1] for r in con.execute("PRAGMA table_info(workout_sessions_log)")]
        vals = {"session_id": session, "user_id": user, "exercise_id": eid, "exercise_name": name, "logged_at": at,
                "weight_value": weight, "weight_use": weight, "weight_unit": unit, "rep_count": reps, "set_number": 1}
        vals = {k: v for k, v in vals.items() if k in cols}
        con.execute(f"INSERT INTO workout_sessions_log ({','.join(vals)}) VALUES ({','.join('?' * len(vals))})", list(vals.values()))
        con.commit()
        con.close()

    def get(self, names, user="user-a", ids=()):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"}
        params = [("exercise_name", n) for n in names] + [("exercise_id", i) for i in ids]
        return self.client.get("/workouts/last-times", params=params, headers=headers)

    def test_needs_sign_in(self):
        self.assertEqual(self.client.get("/workouts/last-times", params={"exercise_name": "Goblet Squat"}).status_code, 401)

    def test_nothing_logged_gives_nothing(self):
        self.assertEqual(self.get(["Goblet Squat"]).json(), {"last_times": {}})

    def test_gives_the_heaviest_set_of_the_most_recent_session(self):
        self.add("user-a", "Goblet Squat", "old", "2026-11-01 10:00:00", 30, "kg", 8)
        self.add("user-a", "Goblet Squat", "new", "2026-11-10 10:00:00", 20, "kg", 12)
        self.add("user-a", "Goblet Squat", "new", "2026-11-10 10:05:00", 25, "kg", 10)
        got = self.get(["Goblet Squat"]).json()["last_times"]["Goblet Squat"]
        self.assertAlmostEqual(got["weight_kg"], 25)
        self.assertEqual(got["reps"], 10)
        self.assertAlmostEqual(got["best_weight_kg"], 30)  # the older session was heavier

    def test_pounds_come_back_in_kg_and_name_case_does_not_matter(self):
        self.add("user-a", "Goblet Squat", "s1", "2026-11-10 10:00:00", 45, "lbs", 10)
        got = self.get(["goblet squat"]).json()["last_times"]["goblet squat"]
        self.assertAlmostEqual(got["weight_kg"], 20.41, places=2)

    def test_bodyweight_sets_give_reps_only(self):
        self.add("user-a", "Push Up", "s1", "2026-11-10 10:00:00", None, "kg", 15)
        got = self.get(["Push Up"]).json()["last_times"]["Push Up"]
        self.assertIsNone(got["weight_kg"])
        self.assertEqual(got["reps"], 15)
        self.assertIsNone(got["best_weight_kg"])

    def test_empty_sets_are_ignored(self):
        self.add("user-a", "Goblet Squat", "s1", "2026-11-10 10:00:00", None, "kg", None)
        self.assertEqual(self.get(["Goblet Squat"]).json(), {"last_times": {}})

    def test_only_your_own_sets_and_several_exercises_at_once(self):
        self.add("user-b", "Goblet Squat", "s1", "2026-11-10 10:00:00", 50, "kg", 5)
        self.add("user-a", "Row", "s2", "2026-11-11 10:00:00", 40, "kg", 10)
        got = self.get(["Goblet Squat", "Row", "Row"]).json()["last_times"]
        self.assertEqual(list(got), ["Row"])
        self.assertAlmostEqual(got["Row"]["weight_kg"], 40)

    def test_the_id_finds_history_saved_under_a_different_spelling(self):
        self.add("user-a", "DB Bent Over Row", "s1", "2026-11-10 10:00:00", 20, "kg", 10, eid="ex_038")
        got = self.get(["DB Bent Over Rows"], ids=["ex_038"]).json()["last_times"]
        self.assertNotIn("DB Bent Over Rows", got)          # the name alone misses it
        self.assertAlmostEqual(got["ex_038"]["weight_kg"], 20)  # the id finds it
        self.assertEqual(got["ex_038"]["reps"], 10)

    def test_id_answers_are_per_person_and_empty_ids_are_ignored(self):
        self.add("user-b", "Row", "s1", "2026-11-10 10:00:00", 50, "kg", 5, eid="ex_038")
        self.assertEqual(self.get([], ids=["ex_038", "  ", ""]).json(), {"last_times": {}})

    def test_the_old_name_only_call_still_works(self):
        self.add("user-a", "Row", "s1", "2026-11-10 10:00:00", 40, "kg", 10, eid="ex_9")
        self.assertAlmostEqual(self.get(["Row"]).json()["last_times"]["Row"]["weight_kg"], 40)


if __name__ == "__main__":
    unittest.main()
