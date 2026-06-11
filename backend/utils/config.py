import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "kinetic_bucket")