import os

from fastapi import UploadFile
from google.cloud import storage
from google.oauth2 import service_account
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "kinetic_bucket")
# =========================================================
# CONFIGURATION
# =========================================================

BUCKET_NAME = GCS_BUCKET_NAME

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

CREDENTIALS_PATH = os.path.join(
    BASE_DIR + "/backend",
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

async def upload_image_to_gcs(
    image_path: str,
    destination_blob_name: str
):
    try:
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_filename(
            image_path,
            content_type="image/jpeg"
        )

        return f"gs://{BUCKET_NAME}/{destination_blob_name}"

    except Exception as e:
        print("========== GCS ERROR ==========")
        print(str(e))
        print("================================")
        raise
    

import asyncio

async def main():

    gcs_path = (
        "images/user_003/"
        "92fcebed-fc8e-4ce2-943d-0cf7c8c7555f/"
        "user_003_3.jpg"
    )

    image_url = await upload_image_to_gcs(
        "./user_003_3.jpg",
        gcs_path
    )

    print(image_url)


if __name__ == "__main__":
    asyncio.run(main())

#gs://kinetic_bucket/images/user_001/8227e043-592d-44ff-b916-5e1382c38da7/user_001_front_17.5kg.jpg
#gs://kinetic_bucket/images/user_001/edac261e-99b4-4149-8383-a01de55b8ce8/user_001_side_17.5kg.jpg
#gs://kinetic_bucket/images/user_001/3c8f8d25-6f73-462e-8697-d4f25e15d8f9/user_001_side_15kg.jpg
#gs://kinetic_bucket/images/user_001/b59bcc7a-809b-4a0a-b8da-8076058c73da/user_001_side_12.5kg.jpg

#gs://kinetic_bucket/images/user_003/e465c0ea-eae7-44ee-9f48-7fe941cc5872/user_003_1.jpg
#gs://kinetic_bucket/images/user_003/9cfae51c-15fe-490d-a8b0-20e587cd1bba/user_003_2.jpg
#gs://kinetic_bucket/images/user_003/92fcebed-fc8e-4ce2-943d-0cf7c8c7555f/user_003_3.jpg