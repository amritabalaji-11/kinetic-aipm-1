import os
import sqlite3
import asyncio
import re
from contextlib import asynccontextmanager

# Resolve the absolute path to kinetic.db located in the backend/ directory
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "kinetic.db"))

class SQLiteConnectionWrapper:
    def __init__(self, conn, lock):
        self._conn = conn
        self._lock = lock

    def _convert_query(self, query: str) -> str:
        # Remove public. table prefix
        query = query.replace("public.", "")
        # Replace PostgreSQL $1, $2, etc. placeholders with SQLite ? placeholders
        query = re.sub(r'\$\d+', '?', query)
        return query

    async def execute(self, query: str, *args):
        query = self._convert_query(query)
        async with self._lock:
            def _run():
                cursor = self._conn.cursor()
                cursor.execute(query, args)
                self._conn.commit()
                return cursor
            return await asyncio.to_thread(_run)

    async def fetchrow(self, query: str, *args):
        query = self._convert_query(query)
        async with self._lock:
            def _run():
                cursor = self._conn.cursor()
                cursor.execute(query, args)
                row = cursor.fetchone()
                return row
            return await asyncio.to_thread(_run)

    async def fetch(self, query: str, *args):
        query = self._convert_query(query)
        async with self._lock:
            def _run():
                cursor = self._conn.cursor()
                cursor.execute(query, args)
                rows = cursor.fetchall()
                return rows
            return await asyncio.to_thread(_run)

class DatabaseManager:
    def __init__(self):
        self.conn = None
        self.lock = asyncio.Lock()

    async def connect(self):
        """Establish the SQLite connection and configure row factory."""
        if self.conn:
            return
        
        # Ensure the parent directory for the database exists
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        def _init():
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            # Enable WAL mode for high concurrency
            conn.execute("PRAGMA journal_mode=WAL;")
            return conn
            
        self.conn = await asyncio.to_thread(_init)
        print(f"SQLite database connected successfully at {DB_PATH}")

    async def disconnect(self):
        """Close the SQLite connection."""
        if self.conn:
            def _close():
                self.conn.close()
            await asyncio.to_thread(_close)
            self.conn = None
            print("SQLite database disconnected.")

    @asynccontextmanager
    async def connection(self):
        """Acquire a connection wrapper."""
        if not self.conn:
            await self.connect()
        # Return the wrapper which routes execution through the lock
        yield SQLiteConnectionWrapper(self.conn, self.lock)

# Create a singleton database instance
db = DatabaseManager()
