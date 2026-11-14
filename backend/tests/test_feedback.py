"""Feedback: sending it (limits, who may, what counts as a valid attachment) and reading it (admins only). Temporary database, pretend storage."""
import sqlite3
import sys
import tempfile
import types
import unittest
from contextlib import asynccontextmanager
from pathlib import Path

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import admin, feedback
from utils.security import create_access_token

TABLES = [init_db.CREATE_USER_PROFILE_SQL, init_db.CREATE_FORM_ANALYSES_SQL, init_db.CREATE_ADMIN_AUDIT_SQL, init_db.CREATE_FEEDBACK_SQL,
          init_db.CREATE_FEEDBACK_MEDIA_SQL, init_db.CREATE_WORKOUTS_SQL, init_db.CREATE_USER_ROUTINES_SQL, init_db.CREATE_VIDEO_READS_SQL]
UPLOADED = {}  # path -> bytes the pretend bucket holds


def pretend_storage():
    stub = types.ModuleType("utils.gcs")
    stub.GS_PREFIX = "gs://test/"
    stub.create_resumable_upload_url = lambda path, content_type, size, origin: f"https://upload.test/{path}"
    stub.uploaded_size = lambda gs_url: UPLOADED.get(gs_url[len("gs://test/"):])
    return stub


class FeedbackApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "test.db"
        con = sqlite3.connect(cls.path)
        for ddl in TABLES:
            con.execute(ddl)
        for table, column, definition in init_db.MIGRATIONS:
            try:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            except sqlite3.OperationalError:
                pass
        for uid, email, name, role in (("admin-1", "amrita@example.com", "Amrita", "admin"), ("user-a", "alice@gmail.com", "Alice", "user"), ("user-b", "bob@example.org", None, "user")):
            con.execute("INSERT INTO user_profiles (profile_id, user_id, email, display_name, role, auth_provider) VALUES (?,?,?,?,?, 'email')", (f"p-{uid}", uid, email, name, role))
        con.execute("INSERT INTO form_analyses (session_id, analysis_id, user_id, exercise_name, video_url, status, video_score, created_at) VALUES ('s1','an-1','user-a','goblet-squat','x','completed',82,'2026-11-11 09:30:00')")
        con.commit()
        con.close()
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real = (admin.db, feedback.db, sys.modules.get("utils.gcs"))
        admin.db = feedback.db = cls.database
        sys.modules["utils.gcs"] = pretend_storage()

        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(admin.router)
        app.include_router(feedback.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        admin.db, feedback.db, gcs = cls.real
        if gcs is None:
            sys.modules.pop("utils.gcs", None)
        else:
            sys.modules["utils.gcs"] = gcs
        cls.tmp.cleanup()

    def setUp(self):  # every test starts with no feedback (and the same 3 people)
        con = sqlite3.connect(self.path)
        con.execute("DELETE FROM feedback"); con.execute("DELETE FROM feedback_media"); con.execute("DELETE FROM admin_audit"); con.commit(); con.close()
        UPLOADED.clear()

    def call(self, method, url, user="user-a", guest=False, **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user, guest=True) if guest else create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def send(self, user="user-a", topic="form", message="The rep count was off", **extra):
        from uuid import uuid4
        return self.call("POST", "/feedback", user, json={"feedback_id": str(uuid4()), "topic": topic, "message": message, **extra})

    # ---- who may send, and the limits ----
    def test_demo_accounts_and_signed_out_visitors_cannot_send(self):
        self.assertEqual(self.call("POST", "/feedback/start", guest=True, json={"files": []}).status_code, 429)
        self.assertEqual(self.send(user=None).status_code, 401)
        self.assertEqual(self.call("GET", "/feedback/mine", None).status_code, 401)

    def test_attachment_rules_at_start(self):
        ok = self.call("POST", "/feedback/start", json={"files": [{"filename": "a.mov", "content_type": "video/quicktime", "size_bytes": 5_000_000}]})
        self.assertEqual(ok.status_code, 200)
        upload = ok.json()["uploads"][0]
        self.assertTrue(upload["path"].startswith(f"feedback/user-a/{ok.json()['feedback_id']}/"))
        self.assertNotIn("a.mov", upload["path"])  # the person's own file name is never used
        bad = lambda f: self.call("POST", "/feedback/start", json={"files": [f]}).status_code
        self.assertEqual(bad({"filename": "x.pdf", "content_type": "application/pdf", "size_bytes": 10}), 415)
        self.assertEqual(bad({"filename": "x.jpg", "content_type": "image/jpeg", "size_bytes": 11 * 1024 * 1024}), 413)
        self.assertEqual(bad({"filename": "x.mp4", "content_type": "video/mp4", "size_bytes": 101 * 1024 * 1024}), 413)
        self.assertEqual(bad({"filename": "x.mp4", "content_type": "video/mp4", "size_bytes": 0}), 413)
        four = [{"filename": "p.jpg", "content_type": "image/jpeg", "size_bytes": 10}] * 4
        self.assertEqual(self.call("POST", "/feedback/start", json={"files": four}).status_code, 422)

    def test_a_text_message_is_saved_and_counted(self):
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.call("GET", "/feedback/mine").json(), {"count": 1})
        self.assertEqual(self.call("GET", "/feedback/mine", "user-b").json(), {"count": 0})  # only your own

    def test_message_validation(self):
        self.assertEqual(self.send(topic="gossip").status_code, 422)
        self.assertEqual(self.send(message="   ").status_code, 422)  # nothing to send
        self.assertEqual(self.send(message="x" * 2001).status_code, 422)
        self.assertEqual(self.call("POST", "/feedback", json={"feedback_id": "not-a-uuid", "topic": "bug", "message": "hi"}).status_code, 422)

    def test_the_same_message_cannot_be_sent_twice(self):
        body = {"feedback_id": "11111111-1111-4111-8111-111111111111", "topic": "bug", "message": "hi"}
        self.assertEqual(self.call("POST", "/feedback", json=body).status_code, 200)
        self.assertEqual(self.call("POST", "/feedback", json=body).status_code, 409)

    def test_five_a_day(self):
        for _ in range(5):
            self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.send().status_code, 429)
        self.assertEqual(self.call("POST", "/feedback/start", json={"files": []}).status_code, 429)
        self.assertEqual(self.send(user="user-b").status_code, 200)  # someone else is unaffected

    # ---- attachments ----
    def attach(self, user="user-a", content_type="image/jpeg", size=1000, upload=True, **extra):
        start = self.call("POST", "/feedback/start", user, json={"files": [{"filename": "p", "content_type": content_type, "size_bytes": size}]}).json()
        path = start["uploads"][0]["path"]
        if upload:
            UPLOADED[path] = size
        return start["feedback_id"], {"path": path, "content_type": content_type}

    def test_an_uploaded_attachment_is_saved(self):
        fid, f = self.attach()
        res = self.call("POST", "/feedback", json={"feedback_id": fid, "topic": "bug", "message": "see photo", "files": [f]})
        self.assertEqual(res.status_code, 200)
        con = sqlite3.connect(self.path)
        self.assertEqual(con.execute("SELECT gcs_url, content_type FROM feedback_media").fetchall(), [(f"gs://test/{f['path']}", "image/jpeg")])
        con.close()

    def test_an_attachment_that_never_arrived_is_refused(self):
        fid, f = self.attach(upload=False)
        self.assertEqual(self.call("POST", "/feedback", json={"feedback_id": fid, "topic": "bug", "message": "x", "files": [f]}).status_code, 422)

    def test_someone_elses_or_made_up_file_paths_are_refused(self):
        fid, f = self.attach(user="user-b")                       # user-b's file, for user-b's message
        mine = self.call("POST", "/feedback", json={"feedback_id": fid, "topic": "bug", "message": "x", "files": [f]})  # sent by user-a
        self.assertEqual(mine.status_code, 422)
        fid2, f2 = self.attach()
        UPLOADED["videos/other-user/secret.mp4"] = 100
        for path in ("videos/other-user/secret.mp4", f2["path"].replace("feedback/user-a", "feedback/user-a/../user-b")):
            res = self.call("POST", "/feedback", json={"feedback_id": fid2, "topic": "bug", "message": "x", "files": [{"path": path, "content_type": "video/mp4"}]})
            self.assertEqual(res.status_code, 422, path)

    def test_including_the_latest_analysis_links_it(self):
        self.assertEqual(self.send(include_latest_analysis=True).status_code, 200)
        con = sqlite3.connect(self.path)
        self.assertEqual(con.execute("SELECT analysis_id FROM feedback").fetchall(), [("an-1",)])
        con.close()
        self.assertEqual(self.send(user="user-b", include_latest_analysis=True).status_code, 200)  # nothing to link: fine

    # ---- the admin inbox ----
    def test_only_admins_read_feedback(self):
        self.send()
        fid = self.call("GET", "/admin/feedback", "admin-1").json()["feedback"][0]["feedback_id"]
        for url in ("/admin/feedback", f"/admin/feedback/{fid}"):
            self.assertEqual(self.call("GET", url, "user-a").status_code, 403, url)  # even the person who sent it
            self.assertEqual(self.call("GET", url, None).status_code, 401, url)
        self.assertEqual(self.call("POST", f"/admin/feedback/{fid}/review", "user-a", json={}).status_code, 403)

    def test_the_inbox_lists_newest_first_with_filters(self):
        self.send(topic="bug", message="timer broke " + "x" * 200)
        fid, f = self.attach(content_type="video/mp4", size=500)
        self.call("POST", "/feedback", json={"feedback_id": fid, "topic": "form", "message": "rep count", "files": [f], "include_latest_analysis": True})
        self.send(user="user-b", topic="idea", message="folders please")
        rows = self.call("GET", "/admin/feedback", "admin-1").json()["feedback"]
        self.assertEqual(len(rows), 3)
        self.assertEqual([r["topic"] for r in self.call("GET", "/admin/feedback?topic=bug", "admin-1").json()["feedback"]], ["bug"])
        form = next(r for r in rows if r["topic"] == "form")
        self.assertEqual((form["videos"], form["photos"], form["has_analysis"], form["from"]), (1, 0, True, "Alice"))
        bug = next(r for r in rows if r["topic"] == "bug")
        self.assertTrue(bug["preview"].endswith("…") and len(bug["preview"]) <= 141)
        idea = next(r for r in rows if r["topic"] == "idea")
        self.assertEqual(idea["from"], "b***@example.org")  # no name: the masked email
        self.assertEqual(self.call("GET", "/admin/feedback?topic=nope", "admin-1").status_code, 422)
        self.assertEqual(self.call("GET", "/admin/summary", "admin-1").json()["feedback_new"], 3)

    def test_detail_review_and_audit(self):
        fid, f = self.attach()
        self.call("POST", "/feedback", json={"feedback_id": fid, "topic": "bug", "message": "photo attached", "files": [f], "include_latest_analysis": True, "app_info": {"page": "/upload/results", "device": "iPhone"}})
        detail = self.call("GET", f"/admin/feedback/{fid}", "admin-1").json()
        self.assertEqual((detail["from"], detail["email"], detail["status"]), ("Alice", "a***@gmail.com", "new"))
        self.assertEqual([(m["kind"], m["url"]) for m in detail["media"]], [("photo", f"gs://test/{f['path']}")])
        self.assertEqual((detail["analysis"]["exercise_name"], detail["analysis"]["video_score"]), ("goblet-squat", 82))
        self.assertEqual(detail["app_info"]["page"], "/upload/results")
        con = sqlite3.connect(self.path)
        self.assertEqual(con.execute("SELECT admin_user_id, action, target_user_id FROM admin_audit").fetchall(), [("admin-1", "view_feedback", "user-a")])
        con.close()
        done = self.call("POST", f"/admin/feedback/{fid}/review", "admin-1", json={"note": "  check the rep counter  "})
        self.assertEqual(done.json()["status"], "reviewed")
        reviewed = self.call("GET", f"/admin/feedback/{fid}", "admin-1").json()
        self.assertEqual((reviewed["status"], reviewed["admin_note"]), ("reviewed", "check the rep counter"))
        self.assertEqual(len(self.call("GET", "/admin/feedback?status=reviewed", "admin-1").json()["feedback"]), 1)
        self.assertEqual(self.call("GET", "/admin/feedback?status=new", "admin-1").json()["feedback"], [])
        self.assertEqual(self.call("POST", f"/admin/feedback/{fid}/review", "admin-1", json={"reviewed": False}).json()["status"], "new")
        self.assertEqual(self.call("GET", "/admin/feedback/nope", "admin-1").status_code, 404)
        self.assertEqual(self.call("POST", "/admin/feedback/nope/review", "admin-1", json={}).status_code, 404)


if __name__ == "__main__":
    unittest.main()
