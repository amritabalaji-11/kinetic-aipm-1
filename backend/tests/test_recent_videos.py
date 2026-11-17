"""The last videos a person turned into a routine: kept per person, newest first, at most 10, one per video."""
import json
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
from utils.security import create_access_token


def routine_for(video_id, title="A video"):
    return {"title": title, "steps": [], "source": {"site": "youtube", "video_id": video_id, "url": f"https://www.youtube.com/watch?v={video_id}", "title": title, "author": "A", "author_url": "", "embeddable": True}}


class RecentVideos(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.tmp.name) / "t.db"
        con = sqlite3.connect(cls.path)
        con.execute(init_db.CREATE_VIDEO_READS_SQL)
        con.execute(init_db.CREATE_RECENT_VIDEOS_SQL)
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
        con.execute("DELETE FROM video_reads")
        con.commit()
        con.close()

    def call(self, method, url, user="user-a", **kw):
        headers = {"Authorization": f"Bearer {create_access_token(user)}"} if user else {}
        return self.client.request(method, url, headers=headers, **kw)

    def read(self, video_id, user="user-a", title="A video"):
        with patch.object(routines, "routine_from_link", AsyncMock(return_value=routine_for(video_id, title))):
            return self.call("POST", "/routines/from-video", user, json={"url": f"https://youtu.be/{video_id}"})

    def test_nothing_recent_to_start_with(self):
        self.assertEqual(self.call("GET", "/routines/recent").json(), [])

    def test_a_video_that_was_read_is_kept_with_its_routine(self):
        self.assertEqual(self.read("AAAAAAAAAAA", title="Full body").status_code, 200)
        got = self.call("GET", "/routines/recent").json()
        self.assertEqual([g["video_id"] for g in got], ["AAAAAAAAAAA"])
        self.assertEqual(got[0]["routine"]["title"], "Full body")

    def test_reading_the_same_video_again_keeps_one_copy_with_the_newer_routine(self):
        self.read("AAAAAAAAAAA", title="Old")
        self.read("AAAAAAAAAAA", title="New")
        got = self.call("GET", "/routines/recent").json()
        self.assertEqual(len(got), 1)
        self.assertEqual(got[0]["routine"]["title"], "New")

    def test_only_the_newest_ten_are_kept(self):
        con = sqlite3.connect(self.path)
        for i in range(12):  # stand-ins for reads made one second apart
            con.execute("INSERT INTO recent_videos (user_id, video_id, data, created_at) VALUES ('user-a', ?, ?, ?)", (f"V{i:010d}", json.dumps(routine_for(f"V{i:010d}")), f"2020-01-01 10:00:{i:02d}"))
        con.commit()
        con.close()
        self.read("ZZZZZZZZZZZ")  # the 13th read pushes the oldest out
        got = self.call("GET", "/routines/recent").json()
        self.assertEqual(len(got), 10)
        self.assertEqual(got[0]["video_id"], "ZZZZZZZZZZZ")
        self.assertNotIn("V0000000000", [g["video_id"] for g in got])
        self.assertNotIn("V0000000001", [g["video_id"] for g in got])

    def test_each_person_only_sees_their_own(self):
        self.read("AAAAAAAAAAA", "user-a")
        self.read("BBBBBBBBBBB", "user-b")
        self.assertEqual([g["video_id"] for g in self.call("GET", "/routines/recent", "user-a").json()], ["AAAAAAAAAAA"])
        self.assertEqual([g["video_id"] for g in self.call("GET", "/routines/recent", "user-b").json()], ["BBBBBBBBBBB"])

    def test_the_daily_count_is_not_affected_by_what_is_kept(self):
        self.read("AAAAAAAAAAA")
        self.read("BBBBBBBBBBB")
        con = sqlite3.connect(self.path)
        reads = con.execute("SELECT COUNT(*) FROM video_reads WHERE user_id = 'user-a'").fetchone()[0]
        con.execute("DELETE FROM recent_videos")  # even with the recent list cleared out
        con.commit()
        con.close()
        self.assertEqual(reads, 2)

    def test_it_needs_a_signed_in_person(self):
        self.assertEqual(self.call("GET", "/routines/recent", None).status_code, 401)

    def test_a_video_without_a_youtube_id_is_not_kept(self):
        r = routine_for("AAAAAAAAAAA")
        r["source"]["video_id"] = None
        with patch.object(routines, "routine_from_link", AsyncMock(return_value=r)):
            self.call("POST", "/routines/from-video", json={"url": "https://www.instagram.com/reel/abc/"})
        self.assertEqual(self.call("GET", "/routines/recent").json(), [])


if __name__ == "__main__":
    unittest.main()
