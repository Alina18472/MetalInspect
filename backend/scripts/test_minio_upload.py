from pathlib import Path


from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
from app.services.storage_service import storage_service


test_image = Path("stream_images")

images = list(test_image.rglob("*.jpg")) + list(test_image.rglob("*.png")) + list(test_image.rglob("*.jpeg"))

if not images:
    raise RuntimeError("В stream_images не найдено изображений для теста")

image_path = images[0]

object_key = storage_service.upload_file(
    local_file_path=image_path,
    object_prefix="test_uploads",
    content_type="image/jpeg",
)

print("Uploaded object key:", object_key)

url = storage_service.get_presigned_url(object_key)
print("Presigned URL:", url)