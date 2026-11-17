"""A video we could not read can still be followed: the error carries the video, the follow endpoint keeps it as one line in recent videos."""
import sqlite3
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock, patch

from databases import Database
from fastapi import FastAPI
from fastapi.testclient import TestClient

import init_db
from routes import routines
from services import video_routine as v
from utils.security import create_access_token

VIDEO = {"video_id": "CKDYo5CeX9E", "title": "30 Min Full Body Dumbbell Workout", "author": "Oliver Sjostrom", "author_url": "https://www.youtube.com/@oliver", "embeddable": True}


class FollowVideo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "t.db"
        con = sqlite3.connect(cls.path)
        con.execute(init_db.CREATE_VIDEO_READS_SQL)
        con.execute(init_db.CREATE_RECENT_VIDEOS_SQL)
        con.execute(init_db.CREATE_USER_ROUTINES_SQL)
        con.commit()
        con.close()
        cls.database = Database(f"sqlite:///{cls.path.as_posix()}")
        cls.real = routines.db
        routines.db = cls.database

        @asynccontextmanager
        async def lifespan(_app):
            await cls.database.connect()
            yield
            await cls.database.disconnect()

        app = FastAPI(lifespan=lifespan)
        app.include_router(routines.router)
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        routines.db = cls.real
        cls.tmp.cleanup()

    def setUp(self):
        con = sqlite3.connect(self.path)
        con.execute("DELETE FROM recent_videos")
        con.execute("DELETE FROM user_routines")
        con.commit()
        con.close()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    # ---- the error carries the video ----
    def read_failing(self, code, site_info=None):
        info = site_info or {"title": "A video", "author": "Someone", "author_url": "https://www.youtube.com/@x", "embeddable": True}
        err = v.RoutineError(code, "nope")
        with patch.object(v, "fetch_video_info", AsyncMock(return_value=info)), patch.object(v, "get_captions", AsyncMock(side_effect=err)):
            with patch.object(routines, "routine_from_link", v.routine_from_link):
                return self.call("POST", "/routines/from-video", json={"url": "https://youtu.be/CKDYo5CeX9E"})

    def test_a_video_with_no_exercises_found_carries_its_details_in_the_error(self):
        for code in ("no_routine", "no_captions", "too_long"):
            r = self.read_failing(code)
            self.assertEqual(r.status_code, 422, code)
            self.assertEqual(r.json()["detail"]["code"], code)
            self.assertEqual(r.json()["detail"]["video"]["video_id"], "CKDYo5CeX9E", code)
            self.assertTrue(r.json()["detail"]["video"]["embeddable"], code)

    def test_other_problems_do_not_offer_to_follow(self):
        r = self.read_failing("video_unavailable")
        self.assertNotIn("video", r.json()["detail"])

    def test_a_video_that_cannot_play_here_says_so(self):
        r = self.read_failing("no_captions", {"title": "T", "author": "A", "author_url": "", "embeddable": False})
        self.assertFalse(r.json()["detail"]["video"]["embeddable"])

    # ---- following it anyway ----
    def test_following_gives_a_one_line_routine_and_keeps_it_in_recent_videos(self):
        r = self.call("POST", "/routines/follow", json=VIDEO)
        self.assertEqual(r.status_code, 200)
        routine = r.json()
        self.assertTrue(routine["follow_only"])
        self.assertEqual([s["name"] for s in routine["steps"]], ["Follow the video"])
        self.assertEqual(routine["source"]["video_id"], "CKDYo5CeX9E")
        self.assertEqual(routine["source"]["url"], "https://www.youtube.com/watch?v=CKDYo5CeX9E")
        recent = self.call("GET", "/routines/recent").json()
        self.assertEqual([x["video_id"] for x in recent], ["CKDYo5CeX9E"])
        self.assertTrue(recent[0]["routine"]["follow_only"])

    def test_a_followed_video_can_be_saved_and_stays_follow_only(self):
        routine = self.call("POST", "/routines/follow", json=VIDEO).json()
        saved = self.call("POST", "/routines", json={"routine": routine})
        self.assertEqual(saved.status_code, 200)
        self.assertTrue(saved.json()["routine"]["follow_only"])
        self.assertEqual(saved.json()["routine"]["source"]["video_id"], "CKDYo5CeX9E")

    def test_it_refuses_a_bad_id_or_a_video_that_cannot_play_here(self):
        self.assertEqual(self.call("POST", "/routines/follow", json={**VIDEO, "video_id": "nope"}).status_code, 422)
        r = self.call("POST", "/routines/follow", json={**VIDEO, "embeddable": False})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["detail"]["code"], "not_embeddable")
        self.assertEqual(self.call("GET", "/routines/recent").json(), [])

    def test_it_needs_a_signed_in_person_and_keeps_each_persons_own(self):
        self.assertEqual(self.call("POST", "/routines/follow", None, json=VIDEO).status_code, 401)
        self.call("POST", "/routines/follow", "user-a", json=VIDEO)
        self.assertEqual(self.call("GET", "/routines/recent", "user-b").json(), [])


if __name__ == "__main__":
    unittest.main()
