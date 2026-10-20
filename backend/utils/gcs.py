import os
from datetime import timedelta

from fastapi import UploadFile
from google.cloud import storage
from google.oauth2 import service_account
from utils.config import GCS_BUCKET_NAME


# =========================================================
# CONFIGURATION
# =========================================================

BUCKET_NAME = GCS_BUCKET_NAME

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

CREDENTIALS_PATH = os.path.join(
    BASE_DIR,
    "credentials",
    "kinetic-backend-495415-8cc8d53e4cd0.json"
)


# =========================================================
# GCS CLIENT
# =========================================================

credentials = service_account.Credentials.from_service_account_file(
    CREDENTIALS_PATH
)

client = storage.Client(
    credentials=credentials,
    project=credentials.project_id
)


# =========================================================
# FILE UPLOAD
# =========================================================

async def upload_file_to_gcs(
    file: UploadFile,
    destination_blob_name: str
):

    try:
        bucket = client.bucket(BUCKET_NAME)

        blob = bucket.blob(destination_blob_name)

        file.file.seek(0)

        blob.upload_from_file(
            file.file,
            content_type=file.content_type,
            timeout=300
        )

        return f"gs://{BUCKET_NAME}/{destination_blob_name}"

    except Exception as e:

        print("========== GCS ERROR ==========")
        print(str(e))
        print("================================")

        raise e
    
# =========================================================
# IMAGE UPLOAD
# =========================================================

async def upload_image_to_gcs(
    local_path: str,
    destination_blob_name: str
):
    try:
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_filename(
            local_path,
            content_type="image/jpeg"
        )

        return {
            "gcs_path": destination_blob_name,
            "gcs_url": f"gs://{BUCKET_NAME}/{destination_blob_name}",
            "file_size_bytes": os.path.getsize(local_path),
            "format": "jpg"
        }

    except Exception as e:
        print("========== GCS ERROR ==========")
        print(str(e))
        print("================================")
        raise


# =========================================================
# TEMPORARY VIEWING LINKS (files stay private)
# =========================================================

GS_PREFIX = f"gs://{BUCKET_NAME}/"
SIGNED_LINK_MINUTES = 15


def sign_gs_url(gs_url: str, minutes: int = SIGNED_LINK_MINUTES) -> str:
    """gs://bucket/path  ->  a web link that works for `minutes` minutes, then stops.

    The browser can't open gs:// addresses, and the bucket is private on purpose (these are photos
    and videos of people). The server hands out one of these links only to someone who is
    signed in and allowed to see the analysis. Anything that isn't one of our bucket's files
    comes back unchanged."""
    if not gs_url or not gs_url.startswith(GS_PREFIX):
        return gs_url
    blob = client.bucket(BUCKET_NAME).blob(gs_url[len(GS_PREFIX):])
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
        credentials=credentials,
    )
