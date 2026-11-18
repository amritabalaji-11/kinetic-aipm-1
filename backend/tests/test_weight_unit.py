"""The unit a person logs weights in: unset to start, saved as kg or lbs only, theirs alone; and progress adds mixed units up in kg."""
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


class WeightUnit(unittest.TestCase):
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
        for uid in ("user-a", "user-b"):
            con.execute("INSERT INTO user_profiles (profile_id, user_id, email, display_name, auth_provider) VALUES (?,?,?,?, 'email')", (f"p-{uid}", uid, f"{uid}@example.com", uid))
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
        con.execute("UPDATE user_profiles SET weight_unit = NULL")
        con.execute("DELETE FROM workout_sessions_log")
        con.commit()
        con.close()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def test_nobody_starts_with_a_unit(self):
        self.assertIsNone(self.call("GET", "/auth/me").json()["weight_unit"])

    def test_kg_or_lbs_is_saved_and_comes_back(self):
        for unit in ("lbs", "kg"):
            self.assertEqual(self.call("POST", "/auth/me/units", json={"unit": unit}).status_code, 200)
            self.assertEqual(self.call("GET", "/auth/me").json()["weight_unit"], unit)

    def test_anything_else_is_refused(self):
        for bad in ("stone", "KG", "", "lb"):
            self.assertEqual(self.call("POST", "/auth/me/units", json={"unit": bad}).status_code, 422, bad)

    def test_it_is_only_theirs_and_needs_a_sign_in(self):
        self.call("POST", "/auth/me/units", "user-a", json={"unit": "lbs"})
        self.assertIsNone(self.call("GET", "/auth/me", "user-b").json()["weight_unit"])
        self.assertEqual(self.call("POST", "/auth/me/units", None, json={"unit": "kg"}).status_code, 401)
        self.assertEqual(self.call("POST", "/auth/me/units", "ghost", json={"unit": "kg"}).status_code, 404)

    def test_progress_adds_mixed_units_up_in_kg(self):
        con = sqlite3.connect(self.path)
        cols = [r[1] for r in con.execute("PRAGMA table_info(workout_sessions_log)")]
        def add(session, weight, unit, reps):
            vals = {"session_id": session, "user_id": "user-a", "exercise_id": "ex_001", "exercise_name": "Goblet Squat", "weight_value": weight, "weight_unit": unit, "rep_count": reps, "logged_at": "2026-11-17 10:00:00"}
            vals = {k: v for k, v in vals.items() if k in cols}
            con.execute(f"INSERT INTO workout_sessions_log ({','.join(vals)}) VALUES ({','.join('?' * len(vals))})", list(vals.values()))
        add("s1", 20, "kg", 10)       # 20 kg x 10
        add("s1", 44.0925, "lbs", 10) # about 20 kg x 10
        con.commit()
        con.close()
        data = self.call("GET", "/workouts/progress", params={"exercise_name": "Goblet Squat"}).json()
        self.assertEqual(data["unit"], "kg")
        s = data["sessions"][0]
        self.assertAlmostEqual(s["best_weight"], 20, places=2)
        self.assertAlmostEqual(s["volume"], 400, places=1)  # 200 + 200, not 200 + 440.9


if __name__ == "__main__":
    unittest.main()
