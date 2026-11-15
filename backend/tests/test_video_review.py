"""The share switch and the admin video review: an admin can open a video only while its owner has the switch on."""
import asyncio
import sqlite3
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import admin, analysis
from services import consent
from utils.security import create_access_token

TABLES = [init_db.CREATE_USER_PROFILE_SQL, init_db.CREATE_FORM_ANALYSES_SQL, init_db.CREATE_FORM_ANALYSIS_RESULTS_SQL, init_db.CREATE_ANALYSIS_REVIEWS_SQL,
          init_db.CREATE_ADMIN_AUDIT_SQL, init_db.CREATE_FEEDBACK_SQL, init_db.CREATE_FEEDBACK_MEDIA_SQL, init_db.CREATE_WORKOUTS_SQL,
          init_db.CREATE_USER_ROUTINES_SQL, init_db.CREATE_VIDEO_READS_SQL]


def build(path: Path) -> None:
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys = OFF")
    for ddl in TABLES:
        con.execute(ddl.replace("model_version TEXT NOT NULL DEFAULT 'claude-haiku-5-5',", "model_version TEXT NOT NULL DEFAULT 'x',"))
    for table, column, definition in init_db.MIGRATIONS:
        try:
            con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        except sqlite3.OperationalError:
            pass
    for uid, email, name, role in (("admin-1", "amrita@example.com", "Amrita", "admin"), ("user-a", "alice@gmail.com", "Alice", "user"), ("user-b", "bob@example.org", "Bob", "user")):
        con.execute("INSERT INTO user_profiles (profile_id, user_id, email, display_name, role, auth_provider) VALUES (?,?,?,?,?, 'email')", (f"p-{uid}", uid, email, name, role))
    rows = [("s1", "an-shared", "user-a", 1, "2026-11-12 09:00:00"), ("s2", "an-private", "user-a", 0, "2026-11-12 10:00:00"), ("s3", "an-bob", "user-b", 1, "2026-11-12 11:00:00")]
    for sid, aid, uid, flag, at in rows:
        con.execute("INSERT INTO form_analyses (session_id, analysis_id, user_id, exercise_name, video_url, status, created_at, team_review_consent) VALUES (?,?,?,?,?, 'completed', ?, ?)",
                    (sid, aid, uid, "goblet-squat", f"gs://b/videos/{uid}/{aid}.mp4", at, flag))
        con.execute("INSERT INTO form_analysis_results (analysis_id, session_id, user_id, exercise_id, rep_count, overall_form_score, coaching_output, issues_json) VALUES (?,?,?,?,?,?,?,?)",
                    (aid, sid, uid, "goblet_squat", 8, 82, '{"summary": "Nice depth"}', '[{"tag": "heels"}]'))
    con.commit()
    con.close()


class VideoReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "t.db"
        build(cls.path)
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real = (admin.db, analysis.db)
        admin.db = analysis.db = cls.database

        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(admin.router)
        app.include_router(analysis.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        admin.db, analysis.db = cls.real
        cls.tmp.cleanup()

    def setUp(self):
        con = sqlite3.connect(self.path)
        con.execute("UPDATE form_analyses SET team_review_consent = CASE analysis_id WHEN 'an-private' THEN 0 ELSE 1 END")
        con.execute("DELETE FROM analysis_reviews"); con.execute("DELETE FROM admin_audit"); con.commit(); con.close()

    def call(self, method, url, user="admin-1", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def flag(self, analysis_id):
        con = sqlite3.connect(self.path)
        row = con.execute("SELECT team_review_consent, team_review_consent_at FROM form_analyses WHERE analysis_id = ?", (analysis_id,)).fetchone()
        con.close()
        return row

    # ---- the person's switch ----
    def test_the_owner_can_turn_sharing_on_and_off(self):
        self.assertEqual(self.call("POST", "/analysis/an-private/team-review", "user-a", json={"allowed": True}).status_code, 200)
        on = self.flag("an-private")
        self.assertEqual(on[0], 1)
        self.assertTrue(on[1])  # when they agreed is kept
        self.assertEqual(self.call("POST", "/analysis/an-private/team-review", "user-a", json={"allowed": False}).json()["team_review"], False)
        self.assertEqual(self.flag("an-private"), (0, None))

    def test_nobody_else_can_change_someones_switch(self):
        self.assertEqual(self.call("POST", "/analysis/an-private/team-review", "user-b", json={"allowed": True}).status_code, 404)
        self.assertEqual(self.call("POST", "/analysis/an-private/team-review", "admin-1", json={"allowed": True}).status_code, 404)  # not even an admin
        self.assertEqual(self.call("POST", "/analysis/an-private/team-review", None, json={"allowed": True}).status_code, 401)
        self.assertEqual(self.flag("an-private")[0], 0)

    def test_recording_consent_at_upload_only_happens_when_ticked(self):
        asyncio.run(self._record_with_a_fresh_connection())

    async def _record_with_a_fresh_connection(self):
        db = Database(f"sqlite:///{self.path.as_posix()}")
        await db.connect()
        try:
            await consent.set_team_review("an-private", False, db)
            self.assertEqual(self.flag("an-private")[0], 0)
            await consent.set_team_review("an-private", True, db)
            self.assertEqual(self.flag("an-private")[0], 1)
        finally:
            await db.disconnect()

    # ---- the admin side ----
    def test_only_admins_see_videos(self):
        for url in ("/admin/videos", "/admin/videos/an-shared"):
            self.assertEqual(self.call("GET", url, "user-a").status_code, 403, url)  # even the owner, through the admin route
            self.assertEqual(self.call("GET", url, None).status_code, 401, url)
        self.assertEqual(self.call("POST", "/admin/videos/an-shared/review", "user-a", json={"verdict": "good"}).status_code, 403)

    def test_the_list_has_only_shared_videos(self):
        listed = self.call("GET", "/admin/videos").json()["videos"]
        self.assertEqual([v["analysis_id"] for v in listed], ["an-bob", "an-shared"])  # newest first; the private one is absent
        first = listed[1]
        self.assertEqual((first["from"], first["exercise"], first["score"], first["rep_count"], first["verdict"]), ("Alice", "goblet-squat", 82, 8, None))

    def test_a_video_that_is_not_shared_cannot_be_opened_or_reviewed(self):
        self.assertEqual(self.call("GET", "/admin/videos/an-private").status_code, 404)
        self.assertEqual(self.call("POST", "/admin/videos/an-private/review", json={"verdict": "good"}).status_code, 404)
        self.assertEqual(self.call("GET", "/admin/videos/nope").status_code, 404)

    def test_turning_the_switch_off_closes_the_video_at_once(self):
        self.assertEqual(self.call("GET", "/admin/videos/an-shared").status_code, 200)
        self.call("POST", "/analysis/an-shared/team-review", "user-a", json={"allowed": False})
        self.assertEqual(self.call("GET", "/admin/videos/an-shared").status_code, 404)
        self.assertNotIn("an-shared", [v["analysis_id"] for v in self.call("GET", "/admin/videos").json()["videos"]])

    def test_opening_a_video_shows_the_ai_feedback_and_is_logged(self):
        d = self.call("GET", "/admin/videos/an-shared").json()
        self.assertEqual((d["from"], d["email"], d["video_url"]), ("Alice", "a***@gmail.com", "gs://b/videos/user-a/an-shared.mp4"))
        self.assertEqual((d["results"]["rep_count"], d["results"]["overall_form_score"], d["results"]["coaching_output"]), (8, 82, {"summary": "Nice depth"}))
        con = sqlite3.connect(self.path)
        self.assertEqual(con.execute("SELECT admin_user_id, action, target_user_id FROM admin_audit").fetchall(), [("admin-1", "view_video", "user-a")])
        con.close()

    def test_verdicts_are_validated_saved_and_replaceable(self):
        self.assertEqual(self.call("POST", "/admin/videos/an-shared/review", json={"verdict": "meh"}).status_code, 422)
        self.assertEqual(self.call("POST", "/admin/videos/an-shared/review", json={"verdict": "wrong", "note": "  counted 8, I see 7  "}).status_code, 200)
        review = self.call("GET", "/admin/videos/an-shared").json()["review"]
        self.assertEqual((review["verdict"], review["note"]), ("wrong", "counted 8, I see 7"))
        self.call("POST", "/admin/videos/an-shared/review", json={"verdict": "good"})  # saving again replaces it
        self.assertEqual(self.call("GET", "/admin/videos/an-shared").json()["review"]["verdict"], "good")
        self.assertEqual([v["analysis_id"] for v in self.call("GET", "/admin/videos?status=reviewed").json()["videos"]], ["an-shared"])
        self.assertEqual([v["analysis_id"] for v in self.call("GET", "/admin/videos?status=new").json()["videos"]], ["an-bob"])


if __name__ == "__main__":
    unittest.main()
