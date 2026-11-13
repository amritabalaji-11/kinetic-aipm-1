"""Roles and the admin data: who may call it, what it returns, what it hides. Uses a temporary SQLite file, never the real database."""
import sqlite3
import tempfile
from contextlib import asynccontextmanager
import unittest
from pathlib import Path

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import admin, auth
from utils.security import create_access_token

TABLES = [init_db.CREATE_USER_PROFILE_SQL, init_db.CREATE_FORM_ANALYSES_SQL, init_db.CREATE_WORKOUTS_SQL, init_db.CREATE_USER_ROUTINES_SQL,
          init_db.CREATE_VIDEO_READS_SQL, init_db.CREATE_ADMIN_AUDIT_SQL]


def build_database(path: Path) -> None:
    con = sqlite3.connect(path)
    for ddl in TABLES:
        con.execute(ddl)
    for table, column, definition in init_db.MIGRATIONS:  # the columns added later (email, role, last_login_at ...)
        try:
            con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        except sqlite3.OperationalError:
            pass  # that table is not part of this test database, or the column is already there
    users = [("admin-1", "amrita@example.com", "Amrita", "admin", "2026-11-01 10:00:00", "2026-11-12 09:00:00"),
             ("user-a", "alice.smith@gmail.com", "Alice", "user", "2026-11-10 08:00:00", "2026-11-11 08:00:00"),
             ("user-b", "bob@example.org", None, None, "2026-11-12 07:00:00", None),
             (admin.SEEDED_DEMO_USER, None, "Demo User", None, "2026-11-12 12:00:00", None)]
    for i, (uid, email, name, role, created, login) in enumerate(users):
        con.execute("INSERT INTO user_profiles (profile_id, user_id, email, display_name, role, created_at, last_login_at, auth_provider) VALUES (?,?,?,?,?,?,?, 'email')",
                    (f"p{i}", uid, email, name, role, created, login))
    con.execute("INSERT INTO form_analyses (session_id, user_id, exercise_name, video_url, status, video_score, created_at) VALUES ('s1','user-a','goblet-squat','x','completed',82,'2026-11-11 09:30:00')")
    con.execute("INSERT INTO workouts (workout_id, user_id, name, status, duration_min, created_at) VALUES ('w1','user-a','Leg day','completed',45,'2026-11-11 18:00:00')")
    con.execute("INSERT INTO user_routines (routine_id, user_id, title, data, created_at) VALUES ('r1','user-a','Flow','{}','2026-11-10 12:00:00')")
    con.execute("INSERT INTO video_reads (user_id, video_id, created_at) VALUES ('user-a','abc','2026-11-10 11:00:00')")
    con.commit()
    con.close()


class AdminApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "test.db"
        build_database(cls.path)
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real_db = (admin.db, auth.db)
        admin.db = auth.db = cls.database  # the routes read and write the temporary database
        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(admin.router)
        app.include_router(auth.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        admin.db, auth.db = cls.real_db
        cls.tmp.cleanup()

    def get(self, url, as_user="admin-1"):
        headers = {"Authorization": f"Bearer {create_access_token(as_user)}"} if as_user else {}
        return self.client.get(url, headers=headers)

    def audit_actions(self):
        con = sqlite3.connect(self.path)
        rows = con.execute("SELECT admin_user_id, action, target_user_id FROM admin_audit ORDER BY audit_id").fetchall()
        con.close()
        return rows

    # ---- who may call it ----
    def test_only_admins_get_in(self):
        self.assertEqual(self.get("/admin/summary", None).status_code, 401)           # not signed in
        self.assertEqual(self.get("/admin/summary", "user-a").status_code, 403)       # a normal user
        self.assertEqual(self.get("/admin/summary", "user-b").status_code, 403)       # role never set
        self.assertEqual(self.get("/admin/summary", "ghost").status_code, 403)        # a token for an account that does not exist
        self.assertEqual(self.get("/admin/summary").status_code, 200)

    def test_every_admin_route_refuses_a_normal_user(self):
        for url in ("/admin/summary", "/admin/users", "/admin/users/user-a", "/admin/users/user-a/email"):
            self.assertEqual(self.get(url, "user-a").status_code, 403, url)

    def test_taking_the_role_away_works_at_once(self):
        con = sqlite3.connect(self.path)
        con.execute("UPDATE user_profiles SET role='admin' WHERE user_id='user-b'"); con.commit()
        self.assertEqual(self.get("/admin/summary", "user-b").status_code, 200)
        con.execute("UPDATE user_profiles SET role='user' WHERE user_id='user-b'"); con.commit(); con.close()
        self.assertEqual(self.get("/admin/summary", "user-b").status_code, 403)

    def test_me_tells_the_app_the_role(self):
        self.assertEqual(self.get("/auth/me", "admin-1").json()["role"], "admin")
        self.assertEqual(self.get("/auth/me", "user-a").json()["role"], "user")
        self.assertEqual(self.get("/auth/me", "user-b").json()["role"], "user")  # an empty role counts as user

    # ---- what it returns ----
    def test_the_user_list_masks_emails_and_shows_activity(self):
        users = {u["user_id"]: u for u in self.get("/admin/users").json()["users"]}
        self.assertEqual(users["user-a"]["email"], "a***@gmail.com")
        self.assertNotIn("alice", str(users))
        self.assertEqual((users["user-a"]["analyses"], users["user-a"]["workouts"], users["user-a"]["routines"]), (1, 1, 1))
        self.assertEqual(users["user-a"]["last_active"], "2026-11-11 18:00:00")  # the latest of login, analysis, workout, routine, read
        self.assertEqual(users["user-b"]["last_active"], None)
        self.assertEqual([u["user_id"] for u in self.get("/admin/users").json()["users"]], ["user-b", "user-a", "admin-1"])  # newest sign-up first; no placeholder profile

    def test_search_finds_by_name_id_or_email_part(self):
        for q, expected in (("alice", ["user-a"]), ("USER-B", ["user-b"]), ("example.org", ["user-b"]), ("zzz", [])):
            self.assertEqual([u["user_id"] for u in self.get(f"/admin/users?q={q}").json()["users"]], expected, q)

    def test_the_summary_counts(self):
        s = self.get("/admin/summary").json()
        self.assertEqual((s["users_total"], s["analyses_total"], s["workouts_total"]), (3, 1, 1))  # the seeded placeholder profile is not counted

    def test_the_timeline_is_newest_first_and_is_logged(self):
        before = len(self.audit_actions())
        detail = self.get("/admin/users/user-a").json()
        self.assertEqual([e["type"] for e in detail["timeline"]], ["workout", "analysis", "routine_saved", "video_read", "signed_up"])
        times = [e["at"] for e in detail["timeline"]]
        self.assertEqual(times, sorted(times, reverse=True))
        self.assertEqual(detail["counts"], {"analysis": 1, "workout": 1, "routine_saved": 1, "video_read": 1})
        self.assertEqual(detail["email"], "a***@gmail.com")
        self.assertEqual(self.audit_actions()[before:], [("admin-1", "view_user", "user-a")])

    def test_revealing_an_email_works_and_is_logged(self):
        before = len(self.audit_actions())
        self.assertEqual(self.get("/admin/users/user-a/email").json()["email"], "alice.smith@gmail.com")
        self.assertEqual(self.audit_actions()[before:], [("admin-1", "reveal_email", "user-a")])
        self.assertEqual(self.get("/admin/users/nobody").status_code, 404)

    def test_nothing_private_leaks(self):
        text = self.get("/admin/users/user-a").text + self.get("/admin/users").text
        for word in ("date_of_birth", "injury", "hashed_password", "video_url"):
            self.assertNotIn(word, text)


class Masking(unittest.TestCase):
    def test_mask_email(self):
        self.assertEqual(admin.mask_email("amrita.balaji@gmail.com"), "a***@gmail.com")
        self.assertIsNone(admin.mask_email(None))
        self.assertEqual(admin.mask_email("no-at-sign"), "no-at-sign")


if __name__ == "__main__":
    unittest.main()
