import threading
import time
from datetime import datetime
from typing import Optional

from PIL import Image as PILImage
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.inspection import Inspection
from app.models.defect import Defect
from app.models.image import Image as InspectionImage
from app.services.ai_service import ai_service, MODE_PRESETS
from app.services.shift_service import (
    DEFAULT_STREAM_DIR,
    list_images,
    group_images_by_ingot,
    save_best_frame,
)
from pathlib import Path
from urllib.parse import quote
def stream_image_path_to_url(file_path: str | None) -> str | None:
        if not file_path:
            return None

        try:
            rel = Path(file_path).resolve().relative_to(Path(DEFAULT_STREAM_DIR).resolve())
            return "/stream-images/" + quote(rel.as_posix())
        except Exception:
            return None
        
class ShiftRuntimeService:
    """
    Runtime-сервис для имитации смены в near-real-time режиме.

    Логика:
    - стартуем смену;
    - обрабатываем слитки по одному;
    - после каждого слитка сразу пишем результат в БД;
    - frontend может периодически запрашивать статус и журнал.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._thread = None
        self._stop_requested = False

        self._status = self._initial_status()

    def _initial_status(self):
        return {
            "running": False,
            "stop_requested": False,
            "started_at": None,
            "finished_at": None,
            "mode": None,
            "threshold": None,
            "stream_dir": DEFAULT_STREAM_DIR,

            "total_ingots": 0,
            "processed_ingots": 0,
            "total_crack": 0,
            "total_ok": 0,

            "current_ingot": None,
            "current_frame_name": None,
            "current_frame_url": None,
            "current_frame_index": None,
            "current_frame_total": None,
            "current_p_crack": None,
            "current_frame_verdict": None,

            "last_result": None,
            "last_saved": None,

            "error": None,
            "message": "Смена не запущена",
        }

    def get_status(self):
        with self._lock:
            total = self._status["processed_ingots"]
            total_crack = self._status["total_crack"]
            total_ok = self._status["total_ok"]

            defect_rate = (total_crack / total * 100.0) if total > 0 else 0.0

            return {
                **self._status,
                "defect_rate": defect_rate,
                "total_ok": total_ok,
            }
    
        
    def start_shift(
        self,
        user_id: int,
        mode: str = "balanced",
        threshold: Optional[float] = None,
        delay_sec: float = 0.7,
    ):
        if mode not in MODE_PRESETS:
            raise ValueError(f"Unknown mode: {mode}")

        if threshold is None:
            threshold = MODE_PRESETS[mode]["threshold"]

        if not 0 <= float(threshold) <= 1:
            raise ValueError("threshold должен быть в диапазоне 0..1")

        if delay_sec < 0:
            raise ValueError("delay_sec не может быть отрицательным")

        with self._lock:
            if self._status["running"]:
                raise RuntimeError("Смена уже запущена")

            self._stop_requested = False
            self._status = self._initial_status()
            self._status.update({
                "running": True,
                "stop_requested": False,
                "started_at": datetime.utcnow().isoformat(timespec="seconds"),
                "mode": mode,
                "threshold": float(threshold),
                "message": "Смена запущена",
            })

        self._thread = threading.Thread(
            target=self._run_shift_worker,
            kwargs={
                "user_id": user_id,
                "mode": mode,
                "threshold": float(threshold),
                "delay_sec": delay_sec,
            },
            daemon=True,
        )
        self._thread.start()

        return self.get_status()

    def stop_shift(self):
        with self._lock:
            if not self._status["running"]:
                return {
                    **self._status,
                    "message": "Смена не была запущена",
                }

            self._stop_requested = True
            self._status["stop_requested"] = True
            self._status["message"] = "Запрошена остановка смены"

        return self.get_status()

    def _set_status(self, **kwargs):
        with self._lock:
            self._status.update(kwargs)

    def _run_shift_worker(
        self,
        user_id: int,
        mode: str,
        threshold: float,
        delay_sec: float,
    ):
        try:
            files = list_images(DEFAULT_STREAM_DIR)
            grouped, skipped = group_images_by_ingot(files)

            self._set_status(
                total_ingots=len(grouped),
                skipped_files_count=len(skipped),
                skipped_files=skipped,
                message=f"Найдено слитков: {len(grouped)}",
            )

            for ingot_id, ingot_files in sorted(grouped.items()):
                with self._lock:
                    if self._stop_requested:
                        break

                self._set_status(
                    current_ingot=ingot_id,
                    message=f"Обработка {ingot_id}",
                )

                def on_frame(frame_info: dict):
                    self._set_status(
                        current_ingot=frame_info["ingot_id"],
                        current_frame_name=frame_info["frame_name"],
                        current_frame_url=frame_info["frame_url"],
                        current_frame_index=frame_info["frame_index"],
                        current_frame_total=frame_info["frame_total"],
                        current_p_crack=frame_info["p_crack"],
                        current_frame_verdict=frame_info["frame_verdict"],
                        message=(
                            f"{frame_info['ingot_id']} | кадр "
                            f"{frame_info['frame_index']}/{frame_info['frame_total']} | "
                            f"p_crack={frame_info['p_crack']:.3f} | "
                            f"{frame_info['frame_verdict']}"
                        ),
                    )

                result = process_one_ingot(
                    ingot_id=ingot_id,
                    ingot_files=ingot_files,
                    mode=mode,
                    threshold=threshold,
                    on_frame=on_frame,
                )

                db = SessionLocal()
                try:
                    saved = save_one_ingot_result_to_db(
                        db=db,
                        result=result,
                        user_id=user_id,
                    )
                finally:
                    db.close()

                with self._lock:
                    self._status["processed_ingots"] += 1

                    if result["verdict"] == "CRACK":
                        self._status["total_crack"] += 1
                    else:
                        self._status["total_ok"] += 1

                    self._status["last_result"] = result
                    self._status["last_saved"] = saved
                    self._status["message"] = (
                        f"{ingot_id} обработан: {result['verdict']} "
                        f"(max_p_crack={result['max_p_crack']:.3f})"
                    )

                time.sleep(delay_sec)

            with self._lock:
                was_stopped = self._stop_requested

            self._set_status(
                running=False,
                stop_requested=False,
                current_ingot=None,
                finished_at=datetime.utcnow().isoformat(timespec="seconds"),
                message="Смена остановлена пользователем" if was_stopped else "Смена завершена",
            )

        except Exception as e:
            self._set_status(
                running=False,
                stop_requested=False,
                current_ingot=None,
                finished_at=datetime.utcnow().isoformat(timespec="seconds"),
                error=str(e),
                message=f"Ошибка обработки смены: {e}",
            )


def process_one_ingot(
    ingot_id: str,
    ingot_files: list[str],
    mode: str,
    threshold: float,
    on_frame=None,
):
    frames_count = 0
    max_p_crack = 0.0
    best_frame_src = None

    total_frames = len(ingot_files)

    for frame_index, img_path in enumerate(ingot_files, start=1):
        pil_img = PILImage.open(img_path).convert("RGB")

        pred = ai_service.predict_pil(
            pil_img=pil_img,
            threshold=threshold,
            mode=mode,
        )

        p_crack = float(pred["p_crack"])
        frame_verdict = "CRACK" if p_crack >= float(threshold) else "OK"

        frames_count += 1

        if p_crack > max_p_crack:
            max_p_crack = p_crack
            best_frame_src = img_path

        if on_frame:
            on_frame({
                "ingot_id": ingot_id,
                "frame_path": img_path,
                "frame_name": Path(img_path).name,
                "frame_index": frame_index,
                "frame_total": total_frames,
                "p_crack": p_crack,
                "frame_verdict": frame_verdict,
                "frame_url": stream_image_path_to_url(img_path),
            })

        # небольшая пауза внутри слитка, чтобы на экране было видно смену кадров
        time.sleep(0.15)

    verdict = "CRACK" if max_p_crack >= float(threshold) else "OK"

    best_frame_saved = None
    if verdict == "CRACK" and best_frame_src:
        best_frame_saved = save_best_frame(
            src_path=best_frame_src,
            ingot_id=ingot_id,
            max_p_crack=max_p_crack,
        )

    return {
        "ingot_id": ingot_id,
        "frames_count": frames_count,
        "max_p_crack": max_p_crack,
        "threshold": float(threshold),
        "mode": mode,
        "verdict": verdict,
        "best_frame_src": best_frame_src,
        "best_frame_saved": best_frame_saved,
    }


def save_one_ingot_result_to_db(
    db: Session,
    result: dict,
    user_id: int | None = None,
):
    verdict = result["verdict"]
    has_defect = verdict == "CRACK"

    inspection = Inspection(
        ingot_id=result["ingot_id"],
        has_defect=has_defect,
        verdict=verdict,
        confidence=float(result["max_p_crack"]),
        max_p_crack=float(result["max_p_crack"]),
        threshold=float(result["threshold"]),
        mode=result["mode"],
        frames_count=int(result["frames_count"]),
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
        created_by=user_id,
    )

    db.add(inspection)
    db.flush()

    defect = None
    image = None

    if has_defect:
        defect = Defect(
            inspection_id=inspection.id,
            defect_type="crack",
            confidence=float(result["max_p_crack"]),
            status="pending",
            is_confirmed=False,
        )

        db.add(defect)
        db.flush()

        if result.get("best_frame_saved"):
            image = InspectionImage(
                file_path=result["best_frame_saved"],
                image_type="best_frame",
                inspection_id=inspection.id,
                defect_id=defect.id,
            )
            db.add(image)

    db.commit()

    return {
        "inspection_id": inspection.id,
        "defect_id": defect.id if defect else None,
        "image_id": image.id if image else None,
        "verdict": verdict,
    }


shift_runtime_service = ShiftRuntimeService()