import os

from google.cloud import storage
from fastapi import UploadFile

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

client = storage.Client()


async def upload_file_to_gcs(
    file: UploadFile,
    destination_blob_name: str
) -> str:

    try:

        bucket = client.bucket(BUCKET_NAME)

        blob = bucket.blob(destination_blob_name)

        file.file.seek(0)

        blob.upload_from_file(
            file.file,
            content_type=file.content_type,
            timeout=120
        )

        gcs_url = (
            f"gs://{BUCKET_NAME}/"
            f"{destination_blob_name}"
        )

        print(f"UPLOADED TO GCS → {gcs_url}")

        return gcs_url

    except Exception as e:

        print("GCS UPLOAD FAILURE:")
        print(str(e))

        raise e