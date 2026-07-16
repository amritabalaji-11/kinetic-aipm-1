import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "kinetic_bucket")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
# JWT_SECRET = os.environ["JWT_SECRET"]          # required, no default in prod
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7                # 7 days

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
APPLE_CLIENT_ID = os.environ.get("APPLE_CLIENT_ID")     # your Services ID / bundle id
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET")