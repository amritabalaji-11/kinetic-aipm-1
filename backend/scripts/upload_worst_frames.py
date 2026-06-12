"""
upload_worst_frames.py
----------------------
Uploads pre-saved worst-frame images to GCS and keeps a local copy in
frontend/public/formhistory/ as a fallback.

Expected folder structure (--src):
    <src>/
        user_001/
            user_001_side_17.5kg.jpg
            user_001_front_17.5kg.jpg
            ...
        user_002/
            ...

Usage (from the repo root):
    cd backend
    uv run python scripts/upload_worst_frames.py --src /path/to/frames

Flags:
    --src   Path to folder containing per-user subdirectories of images
    --dry   Dry-run: print what would be uploaded without doing it
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Resolve project paths relative to this script
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).resolve().parent          # backend/scripts/
BACKEND_DIR  = SCRIPT_DIR.parent                         # backend/
REPO_ROOT    = BACKEND_DIR.parent                        # repo root
FRONTEND_PUB = REPO_ROOT / "frontend" / "public" / "formhistory"

# Append backend/ so imports (utils.gcs, utils.config) work without install
sys.path.insert(0, str(BACKEND_DIR))

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def collect_frames(src: Path) -> list[tuple[str, str, Path]]:
    """
    Walk src and return list of (user_id, filename, full_path) tuples.
    Expects src/{user_id}/{filename} structure.
    """
    results = []
    for user_dir in sorted(src.iterdir()):
        if not user_dir.is_dir():
            continue
        user_id = user_dir.name
        for f in sorted(user_dir.iterdir()):
            if f.suffix.lower() not in SUPPORTED_EXTS:
                continue
            results.append((user_id, f.name, f))
    return results


def upload_to_gcs(user_id: str, filename: str, local_path: Path, bucket) -> str:
    """Upload a single image to GCS, make public, return the public URL."""
    blob_name = f"formhistory/{user_id}/{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(str(local_path), content_type=_mime(local_path))
    blob.make_public()
    return blob.public_url


def copy_local_backup(user_id: str, filename: str, src_path: Path) -> Path:
    """Copy image into frontend/public/formhistory/{user_id}/ as local fallback."""
    dest_dir = FRONTEND_PUB / user_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if dest.resolve() != src_path.resolve():
        shutil.copy2(src_path, dest)
    return dest


def _mime(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
        ".webp": "image/webp",
    }.get(ext, "application/octet-stream")


def main():
    parser = argparse.ArgumentParser(description="Upload worst frames to GCS + local backup")
    parser.add_argument("--src",  required=True, help="Source folder with per-user subdirs")
    parser.add_argument("--dry",  action="store_true", help="Dry-run, no uploads")
    args = parser.parse_args()

    src = Path(args.src).expanduser().resolve()
    if not src.is_dir():
        sys.exit(f"ERROR: --src '{src}' is not a directory")

    frames = collect_frames(src)
    if not frames:
        sys.exit(f"No supported image files found under {src}")

    print(f"Found {len(frames)} frame(s) across {len({u for u,_,_ in frames})} user(s)\n")

    if args.dry:
        for user_id, filename, path in frames:
            print(f"  [DRY] {user_id}/{filename}  ←  {path}")
        return

    # ------------------------------------------------------------------
    # GCS setup
    # ------------------------------------------------------------------
    from google.cloud import storage
    from google.oauth2 import service_account
    from utils.config import GCS_BUCKET_NAME

    creds_path = BACKEND_DIR / "credentials" / "kinetic-backend-495415-8cc8d53e4cd0.json"
    if not creds_path.exists():
        sys.exit(f"ERROR: credentials not found at {creds_path}")

    credentials    = service_account.Credentials.from_service_account_file(str(creds_path))
    storage_client = storage.Client(credentials=credentials, project=credentials.project_id)
    bucket         = storage_client.bucket(GCS_BUCKET_NAME)

    # ------------------------------------------------------------------
    # Upload loop
    # ------------------------------------------------------------------
    success, failed = [], []

    for user_id, filename, local_path in frames:
        try:
            # 1. Local backup first (fast, no network)
            dest = copy_local_backup(user_id, filename, local_path)

            # 2. GCS upload
            gcs_url = upload_to_gcs(user_id, filename, local_path, bucket)

            print(f"  ✓  {user_id}/{filename}")
            print(f"       GCS   → {gcs_url}")
            print(f"       Local → {dest}")
            success.append((user_id, filename, gcs_url))

        except Exception as e:
            print(f"  ✗  {user_id}/{filename}  ERROR: {e}")
            failed.append((user_id, filename, str(e)))

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print(f"\n{'─'*60}")
    print(f"  Uploaded: {len(success)}  |  Failed: {len(failed)}")
    if failed:
        print("\nFailed files:")
        for user_id, filename, err in failed:
            print(f"  {user_id}/{filename}: {err}")


if __name__ == "__main__":
    main()
