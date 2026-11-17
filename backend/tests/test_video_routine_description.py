"""The creator's description (often the list of exercises) is given to the routine maker as well as the captions."""
import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch

from services import video_routine as v

LIST = "HIGH SQUATS\nSUMO DEADLIFT SQUAT\nSTATIC LUNGE\n" + "x" * 200
SPEECH = [{"start": i, "text": "word " * 8} for i in range(0, 40, 2)]
SPEECH_ONLY_MUSIC = [{"start": 0, "text": "[Music]"}]


def run(coro):
    return asyncio.run(coro)


class Description(unittest.TestCase):
    def test_no_service_means_no_description_and_no_request(self):
        with patch.dict(os.environ, {"SUPADATA_API_KEY": ""}), patch("httpx.AsyncClient") as client:
            self.assertEqual(run(v.fetch_description("abc")), "")
            client.assert_not_called()

    def test_a_failing_service_gives_an_empty_description_not_an_error(self):
        import httpx
        with patch.dict(os.environ, {"SUPADATA_API_KEY": "k"}), patch("httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.ConnectError("down"))
            self.assertEqual(run(v.fetch_description("abc")), "")

    def test_the_model_is_given_the_description_and_the_captions(self):
        seen = {}

        def fake_model(transcript, title, description=""):
            seen.update(transcript=transcript, title=title, description=description)
            return {"title": "T", "steps": [{"order": 1, "name": "Sumo deadlift squat"}]}

        with patch.object(v, "fetch_video_info", AsyncMock(return_value={"title": "T", "author": "A", "author_url": "", "embeddable": True})), \
             patch.object(v, "get_captions", AsyncMock(return_value=SPEECH)), \
             patch.object(v, "fetch_description", AsyncMock(return_value=LIST)), \
             patch.object(v, "_ask_model_blocking", fake_model):
            out = run(v.routine_from_link("https://youtu.be/GViX8riaHX4"))
        self.assertIn("SUMO DEADLIFT SQUAT", seen["description"])
        self.assertIn("word", seen["transcript"])
        self.assertEqual(out["steps"][0]["name"], "Sumo deadlift squat")

    def test_a_video_with_only_music_but_a_written_list_still_works(self):
        with patch.object(v, "fetch_video_info", AsyncMock(return_value={"title": "T", "author": "A", "author_url": "", "embeddable": True})), \
             patch.object(v, "get_captions", AsyncMock(return_value=SPEECH_ONLY_MUSIC)), \
             patch.object(v, "fetch_description", AsyncMock(return_value=LIST)), \
             patch.object(v, "_ask_model_blocking", lambda t, ti, d="": {"title": "T", "steps": [{"order": 1, "name": "High squats"}]}):
            out = run(v.routine_from_link("https://youtu.be/GViX8riaHX4"))
        self.assertEqual(len(out["steps"]), 1)

    def test_music_only_and_no_list_is_still_refused(self):
        with patch.object(v, "fetch_video_info", AsyncMock(return_value={"title": "T", "author": "A", "author_url": "", "embeddable": True})), \
             patch.object(v, "get_captions", AsyncMock(return_value=SPEECH_ONLY_MUSIC)), \
             patch.object(v, "fetch_description", AsyncMock(return_value="")):
            with self.assertRaises(v.RoutineError) as ctx:
                run(v.routine_from_link("https://youtu.be/GViX8riaHX4"))
        self.assertEqual(ctx.exception.code, "no_captions")

    def test_the_rules_tell_the_model_to_use_the_description_and_ignore_lyrics(self):
        self.assertIn("creator's description", v.SYSTEM)
        self.assertIn("Song lyrics", v.SYSTEM)


if __name__ == "__main__":
    unittest.main()
