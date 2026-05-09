from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from minio import Minio
from minio.error import S3Error

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET

        self.client = Minio(
            endpoint=settings.S3_ENDPOINT,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_SECURE,
        )

        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)

    def upload_file(
        self,
        local_file_path: str | Path,
        object_prefix: str,
        content_type: str = "image/jpeg",
    ) -> str:
        local_file_path = Path(local_file_path)

        if not local_file_path.exists():
            raise FileNotFoundError(f"File not found: {local_file_path}")

        extension = local_file_path.suffix.lower() or ".jpg"
        object_key = f"{object_prefix}/{uuid4().hex}{extension}"

        try:
            self.client.fput_object(
                bucket_name=self.bucket_name,
                object_name=object_key,
                file_path=str(local_file_path),
                content_type=content_type,
            )
            return object_key

        except S3Error as e:
            raise RuntimeError(f"Failed to upload file to MinIO: {e}")

    def get_presigned_url(self, object_key: str, expires_hours: int = 2) -> str:
        return self.client.presigned_get_object(
            bucket_name=self.bucket_name,
            object_name=object_key,
            expires=timedelta(hours=expires_hours),
        )


storage_service = StorageService()