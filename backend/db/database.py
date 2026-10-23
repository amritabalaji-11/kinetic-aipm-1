import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from databases import Database
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "kinetic.db"


def _postgres_url() -> str | None:
    """DATABASE_URL when it points at Postgres (Neon, Cloud SQL, ...), otherwise None."""
    url = os.getenv("DATABASE_URL", "").strip()
    if not url.startswith(("postgres://", "postgresql://")):
        return None
    parts = urlsplit(url)
    # The driver we use wants "ssl=require"; Neon's copied string has libpq-style options (sslmode, channel_binding)
    # that it does not understand. Drop them and always ask for an encrypted connection.
    # statement_cache_size=0 keeps it working through Neon's connection pooler.
    return urlunsplit(("postgresql", parts.netloc, parts.path, "ssl=require&statement_cache_size=0", ""))


POSTGRES_URL = _postgres_url()
# The untouched string, for the plain-Python driver that sets the tables up (it understands the libpq options).
POSTGRES_DSN = os.getenv("DATABASE_URL", "").strip() if POSTGRES_URL else None
IS_POSTGRES = POSTGRES_URL is not None

DATABASE_URL = POSTGRES_URL or f"sqlite:///{DATABASE_PATH.as_posix()}"

# "Now" as text in the same shape SQLite's CURRENT_TIMESTAMP gives ("2026-10-23 09:48:00").
# The tables keep their dates as text, so this lets both databases hold the same thing.
NOW_TEXT = (
    "to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS')" if IS_POSTGRES else "CURRENT_TIMESTAMP"
)

# Errors the two databases raise, so callers can catch "already exists" / "database problem" for either one.
import sqlite3 as _sqlite3

INTEGRITY_ERRORS: tuple = (_sqlite3.IntegrityError,)
DATABASE_ERRORS: tuple = (_sqlite3.DatabaseError,)
try:
    import asyncpg as _asyncpg

    INTEGRITY_ERRORS += (_asyncpg.IntegrityConstraintViolationError,)
    DATABASE_ERRORS += (_asyncpg.PostgresError,)
except ImportError:  # SQLite-only setup
    pass

db = Database(DATABASE_URL)
