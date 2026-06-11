from pathlib import Path
from databases import Database

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "kinetic.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

db = Database(DATABASE_URL)