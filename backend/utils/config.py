import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# "Try demo" guest logins for the sample profiles. Set ALLOW_DEMO_LOGIN=false to switch them off (e.g. in production).
ALLOW_DEMO_LOGIN = os.getenv("ALLOW_DEMO_LOGIN", "true").lower() != "false"
DEMO_USER_IDS = {"user_001", "user_002", "user_003"}
DEMO_PASSCODE = os.getenv("DEMO_PASSCODE", "")  # blank = no passcode

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "kinetic_bucket")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
# JWT_SECRET = os.environ["JWT_SECRET"]          # required, no default in prod
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7                # 7 days

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
APPLE_CLIENT_ID = os.environ.get("APPLE_CLIENT_ID")     # your Services ID / bundle id
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET")