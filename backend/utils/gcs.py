from google.cloud import storage
import uuid

client = storage.Client()

def upload_file_to_gcs(file_bytes: bytes, filename: str, bucket_name: str) -> str:
    bucket = client.bucket(bucket_name)

    unique_filename = f"{uuid.uuid4()}_{filename}"
    blob = bucket.blob(unique_filename)

    blob.upload_from_string(file_bytes)

    return f"gs://{bucket_name}/{unique_filename}"