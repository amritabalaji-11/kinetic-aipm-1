import os
import logging

from fastapi import UploadFile
from google.cloud import storage
from google.oauth2 import service_account
from utils.config import GCS_BUCKET_NAME

logger = logging.getLogger(__name__)

BUCKET_NAME = GCS_BUCKET_NAME
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CREDENTIALS_PATH = os.path.join(
    BASE_DIR,
    "credentials",
    "kinetic-backend-495415-8cc8d53e4cd0.json"
)

# Lazy singleton — built on first use, not at import time
_client = None

def _get_client():
    global _client
    if _client is None:
        creds = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        _client = storage.Client(credentials=creds, project=creds.project_id)
    return _client


async def upload_file_to_gcs(
    file: UploadFile,
    destination_blob_name: str
):
    try:
        client = _get_client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        file.file.seek(0)
        blob.upload_from_file(
            file.file,
            content_type=file.content_type,
            timeout=60
        )

        return f"gs://{BUCKET_NAME}/{destination_blob_name}"

    except Exception as e:
        logger.error(f"GCS upload failed: {e}")
        raise e