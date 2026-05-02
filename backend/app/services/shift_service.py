import os
import glob
import shutil
from collections import defaultdict
from datetime import datetime
from typing import Optional

from PIL import Image

from app.services.ai_service import ai_service, MODE_PRESETS
from sqlalchemy.orm import Session
from app.models.inspection import Inspection
from app.models.defect import Defect
from app.models.image import Image as InspectionImage

BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

DEFAULT_STREAM_DIR = os.path.join(BACKEND_DIR, "stream_images")
BEST_FRAMES_DIR = os.path.join(BACKEND_DIR, "media", "best_frames")

IMG_EXTS = (".jpg", ".jpeg", ".png", ".bmp")


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def list_images(root: str):
    files = []

    for ext in IMG_EXTS:
        files.extend(glob.glob(os.path.join(root, f"*{ext}")))
        files.extend(glob.glob(os.path.join(root, f"*{ext.upper()}")))

        # На случай, если внутри stream_images есть подпапки
        files.extend(glob.glob(os.path.join(root, "**", f"*{ext}"), recursive=True))
        files.extend(glob.glob(os.path.join(root, "**", f"*{ext.upper()}"), recursive=True))

    return sorted(set(files))


def extract_ingot_id(filepath: str) -> str:
    """
    Пример:
    ingot_001_01_crazing_92.jpg -> ingot_001
    ingot_002_03_ok_15.jpg      -> ingot_002
    """
    name = os.path.splitext(os.path.basename(filepath))[0]
    parts = name.split("_")

    if len(parts) < 3 or parts[0] != "ingot":
        raise ValueError(f"Bad filename format: {os.path.basename(filepath)}")

    return f"{parts[0]}_{parts[1]}"


def extract_frame_index(filepath: str) -> int:
    """
    Пример:
    ingot_001_01_crazing_92.jpg -> 1
    ingot_001_04_crazing_95.jpg -> 4
    """
    name = os.path.splitext(os.path.basename(filepath))[0]
    parts = name.split("_")

    if len(parts) < 3:
        raise ValueError(f"Bad filename format: {os.path.basename(filepath)}")

    return int(parts[2])


def save_best_frame(src_path: str, ingot_id: str, max_p_crack: float) -> str:
    ensure_dir(BEST_FRAMES_DIR)

    ext = os.path.splitext(src_path)[1].lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    dst_name = f"{ingot_id}_best_{max_p_crack:.3f}_{timestamp}{ext}"
    dst_path = os.path.join(BEST_FRAMES_DIR, dst_name)

    shutil.copy2(src_path, dst_path)

    return dst_path


def group_images_by_ingot(files: list[str]):
    grouped = defaultdict(list)
    skipped = []

    for path in files:
        try:
            ingot_id = extract_ingot_id(path)
            grouped[ingot_id].append(path)
        except Exception as e:
            skipped.append({
                "file": os.path.basename(path),
                "reason": str(e),
            })

    for ingot_id in grouped:
        grouped[ingot_id].sort(key=extract_frame_index)

    return grouped, skipped


def process_stream_folder(
    stream_dir: str = DEFAULT_STREAM_DIR,
    mode: str = "balanced",
    threshold: Optional[float] = None,
    save_best_frames: bool = True,
):
    if mode not in MODE_PRESETS:
        raise ValueError(f"Unknown mode: {mode}")

    if threshold is None:
        threshold = MODE_PRESETS[mode]["threshold"]

    if not os.path.isdir(stream_dir):
        raise FileNotFoundError(f"Папка с кадрами не найдена: {stream_dir}")

    files = list_images(stream_dir)

    if not files:
        raise FileNotFoundError(f"В папке нет изображений: {stream_dir}")

    grouped, skipped = group_images_by_ingot(files)

    results = []

    total_ingots = 0
    total_crack = 0
    total_ok = 0
    sum_max_p_crack = 0.0
    sum_frames = 0

    for ingot_id, ingot_files in sorted(grouped.items()):
        frames_count = 0
        max_p_crack = 0.0
        best_frame_src = None

        frame_results = []

        for img_path in ingot_files:
            pil_img = Image.open(img_path).convert("RGB")

            pred = ai_service.predict_pil(
                pil_img=pil_img,
                threshold=threshold,
                mode=mode,
            )

            p_crack = float(pred["p_crack"])
            frames_count += 1

            frame_results.append({
                "frame_name": os.path.basename(img_path),
                "frame_path": img_path,
                "p_crack": p_crack,
                "verdict": pred["verdict"],
            })

            if p_crack > max_p_crack:
                max_p_crack = p_crack
                best_frame_src = img_path

        verdict = "CRACK" if max_p_crack >= float(threshold) else "OK"

        best_frame_saved = None
        if verdict == "CRACK" and best_frame_src and save_best_frames:
            best_frame_saved = save_best_frame(
                src_path=best_frame_src,
                ingot_id=ingot_id,
                max_p_crack=max_p_crack,
            )

        total_ingots += 1
        sum_max_p_crack += max_p_crack
        sum_frames += frames_count

        if verdict == "CRACK":
            total_crack += 1
        else:
            total_ok += 1

        results.append({
            "ingot_id": ingot_id,
            "frames_count": frames_count,
            "max_p_crack": max_p_crack,
            "threshold": float(threshold),
            "mode": mode,
            "verdict": verdict,
            "best_frame_src": best_frame_src,
            "best_frame_saved": best_frame_saved,
            "frames": frame_results,
        })

    avg_max_p_crack = sum_max_p_crack / total_ingots if total_ingots else 0.0
    avg_frames = sum_frames / total_ingots if total_ingots else 0.0
    defect_rate = total_crack / total_ingots * 100 if total_ingots else 0.0

    return {
        "stream_dir": stream_dir,
        "mode": mode,
        "threshold": float(threshold),
        "files_found": len(files),
        "ingots_found": len(grouped),
        "skipped_files_count": len(skipped),
        "skipped_files": skipped,
        "summary": {
            "total_ingots": total_ingots,
            "total_crack": total_crack,
            "total_ok": total_ok,
            "defect_rate": defect_rate,
            "avg_max_p_crack": avg_max_p_crack,
            "avg_frames": avg_frames,
        },
        "results": results,
    }

def save_stream_results_to_db(
    db: Session,
    results_payload: dict,
    user_id: int | None = None,
):
    saved_inspections = []
    saved_defects = []

    for item in results_payload["results"]:
        verdict = item["verdict"]
        has_defect = verdict == "CRACK"

        inspection = Inspection(
            ingot_id=item["ingot_id"],
            has_defect=has_defect,
            verdict=verdict,
            confidence=float(item["max_p_crack"]),
            max_p_crack=float(item["max_p_crack"]),
            threshold=float(item["threshold"]),
            mode=item["mode"],
            frames_count=int(item["frames_count"]),
            created_by=user_id,
        )

        db.add(inspection)
        db.flush()

        saved_inspections.append(inspection)

        if has_defect:
            defect = Defect(
                inspection_id=inspection.id,
                defect_type="crack",
                confidence=float(item["max_p_crack"]),
                status="pending",
                is_confirmed=False,
            )

            db.add(defect)
            db.flush()

            saved_defects.append(defect)

            if item.get("best_frame_saved"):
                image = InspectionImage(
                    file_path=item["best_frame_saved"],
                    image_type="best_frame",
                    inspection_id=inspection.id,
                    defect_id=defect.id,
                )
                db.add(image)

    db.commit()

    return {
        "saved_inspections": len(saved_inspections),
        "saved_defects": len(saved_defects),
    }