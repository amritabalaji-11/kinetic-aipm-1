import uuid
from google.cloud import storage
from fastapi import UploadFile

BUCKET_NAME = "kinetic_bucket"

async def upload_file_to_gcs(
    file: UploadFile,
    gcs_path: str
):

    client = storage.Client()

    bucket = client.bucket(BUCKET_NAME)

    blob = bucket.blob(gcs_path)

    blob.upload_from_file(
        file.file,
        content_type=file.content_type
    )

    print(f"[GCS] Uploaded to gs://{BUCKET_NAME}/{gcs_path}")

    return f"gs://{BUCKET_NAME}/{gcs_path}"