import os
import unittest
from unittest import mock

from databases import Database

from db import database


NEON_URL = "postgresql://user:pw@ep-example-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


class PostgresPoolTests(unittest.TestCase):
    def _url(self):
        with mock.patch.dict(os.environ, {"DATABASE_URL": NEON_URL}):
            return database._postgres_url()

    def test_idle_app_holds_no_connections_and_pool_is_small(self):
        # The driver's own default keeps 10 connections open all the time, which keeps Neon's compute awake.
        url = self._url()
        self.assertIn("min_size=0", url)
        self.assertIn("max_size=5", url)

    def test_existing_options_are_kept(self):
        url = self._url()
        self.assertIn("ssl=require", url)
        self.assertIn("statement_cache_size=0", url)
        self.assertNotIn("sslmode", url)
        self.assertNotIn("channel_binding", url)

    def test_driver_reads_the_pool_sizes_from_the_url(self):
        # A misspelt option would be silently ignored, so check the driver really picks the numbers up.
        options = Database(self._url())._backend._database_url.options
        self.assertEqual(options.get("min_size"), "0")
        self.assertEqual(options.get("max_size"), "5")

    def test_sqlite_is_untouched(self):
        with mock.patch.dict(os.environ, {"DATABASE_URL": ""}):
            self.assertIsNone(database._postgres_url())


if __name__ == "__main__":
    unittest.main()
