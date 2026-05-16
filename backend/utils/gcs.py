import os

from fastapi import UploadFile
from google.cloud import storage
from google.oauth2 import service_account


# =========================================================
# CONFIGURATION
# =========================================================

BUCKET_NAME = "kinetic_bucket"

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
            timeout=60
        )

        return f"gs://{BUCKET_NAME}/{destination_blob_name}"

    except Exception as e:

        print("========== GCS ERROR ==========")
        print(str(e))
        print("================================")

        raise e