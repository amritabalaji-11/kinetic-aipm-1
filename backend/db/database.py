import os
from pathlib import Path
from databases import Database
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(BASE_DIR / 'kinetic.db').as_posix()}")

db = Database(DATABASE_URL)