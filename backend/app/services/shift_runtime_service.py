import threading
import time
from datetime import datetime
from typing import Optional
from app.core.ws_manager import shift_ws_manager
from PIL import Image as PILImage
from sqlalchemy.orm import Session
from app.services.camera_runtime_service import camera_runtime_service
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
    extract_ingot_id,
)
from pathlib import Path
from urllib.parse import quote
from app.models.shift import Shift

from app.services.storage_service import storage_service
from app.core.config import settings
def stream_image_path_to_url(file_path: str | None) -> str | None:
        if not file_path:
            return None

        try:
            rel = Path(file_path).resolve().relative_to(Path(DEFAULT_STREAM_DIR).resolve())
            return "/stream-images/" + quote(rel.as_posix())
        except Exception:
            return None
        
class ShiftRuntimeService:
  
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
            "current_model_type": None,
            "current_detections": [],
            "current_best_bbox": None,
            "current_bbox_count": 0,

            "last_result": None,
            "last_saved": None,

            "error": None,
            "message": "Смена не запущена",
            "shift_id": None,
            "active_model_id": None,
            "active_model_key": None,
            "active_model_name": None,
            "active_model_type": None,
            "active_model_architecture": None,
            "active_confidence_threshold": None,
            "active_iou_threshold": None,
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
        mode: Optional[str] = None,
        threshold: Optional[float] = None,
        delay_sec: float = 0.7,
    ):
    
        ai_service.ensure_model_loaded()
        active_model = ai_service.get_active_model_runtime_info()

        active_modes = active_model.get("modes") or {}
        default_mode = active_model.get("default_mode") or "balanced"

        if mode is None:
            mode = default_mode

        if active_modes and mode not in active_modes:
            raise ValueError(f"Unknown mode for active model: {mode}")

        if threshold is None:
            threshold = ai_service.get_threshold_for_mode(mode=mode)

        if not 0 <= float(threshold) <= 1:
            raise ValueError("threshold должен быть в диапазоне 0..1")

        if delay_sec < 0:
            raise ValueError("delay_sec не может быть отрицательным")

        with self._lock:
            if self._status["running"]:
                raise RuntimeError("Смена уже запущена")
            shift_id = create_shift_record(
                user_id=user_id,
                mode=mode,
                threshold=float(threshold),
            )
            self._stop_requested = False
            self._status = self._initial_status()
            self._status.update({
                "running": True,
                "stop_requested": False,
                "started_at": datetime.utcnow().isoformat(timespec="seconds"),
                "mode": mode,
                "threshold": float(threshold),
                "message": "Смена запущена",
                "shift_id": shift_id,
                "active_model_id": active_model.get("id"),
                "active_model_key": active_model.get("model_key"),
                "active_model_name": active_model.get("name"),
                "active_model_type": active_model.get("model_type"),
                "active_model_architecture": active_model.get("architecture"),
                "active_confidence_threshold": active_model.get("confidence_threshold"),
                "active_iou_threshold": active_model.get("iou_threshold"),
            })

        self._thread = threading.Thread(
            target=self._run_shift_worker,
            kwargs={
                "shift_id": shift_id,
                "user_id": user_id,
                "mode": mode,
                "threshold": float(threshold),
                "delay_sec": delay_sec,
            },
            daemon=True,
        )
        self._thread.start()
        
        shift_ws_manager.broadcast_json({
            "type": "shift_started",
            "mode": mode,
            "threshold": float(threshold),
            "active_model_id": active_model.get("id"),
            "active_model_key": active_model.get("model_key"),
            "active_model_name": active_model.get("name"),
            "active_model_type": active_model.get("model_type"),
            "active_model_architecture": active_model.get("architecture"),
            "confidence_threshold": active_model.get("confidence_threshold"),
            "iou_threshold": active_model.get("iou_threshold"),
            "message": "AI-анализ смены запущен",
        })

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
            
        shift_ws_manager.broadcast_json({
            "type": "shift_stop_requested",
            "message": "Запрошена остановка смены",
        })

        return self.get_status()

    def _set_status(self, **kwargs):
        with self._lock:
            self._status.update(kwargs)

    def _run_shift_worker(
        self,
        shift_id: int,
        user_id: int,
        mode: str,
        threshold: float,
        delay_sec: float,
    ):
        try:
            files = list_images(DEFAULT_STREAM_DIR)
            grouped, skipped = group_images_by_ingot(files)

            if not grouped:
                raise RuntimeError("В stream_images не найдено слитков для обработки")

            if not camera_runtime_service.get_status().get("running"):
                camera_runtime_service.start_camera(delay_sec=0.25)

            camera_current_path = camera_runtime_service.get_current_frame_path()
            camera_current_ingot = None

            if camera_current_path:
                try:
                    camera_current_ingot = extract_ingot_id(camera_current_path)
                except Exception:
                    camera_current_ingot = None

            ordered_ingot_ids = sorted(grouped.keys())

            current_pos = -1
            if camera_current_ingot in ordered_ingot_ids:
                current_pos = ordered_ingot_ids.index(camera_current_ingot)

            start_pos = (current_pos + 1) % len(ordered_ingot_ids)
            ordered_ingot_ids = ordered_ingot_ids[start_pos:] + ordered_ingot_ids[:start_pos]

            ingots_per_cycle = len(grouped)

            self._set_status(
                total_ingots=ingots_per_cycle,
                ingots_per_cycle=ingots_per_cycle,
                processed_ingots=0,
                total_crack=0,
                total_ok=0,
                skipped_files_count=len(skipped),
                skipped_files=skipped,
                camera_ingot_at_start=camera_current_ingot,
                analysis_first_ingot=ordered_ingot_ids[0] if ordered_ingot_ids else None,
                current_cycle=1,
                current_sequence_number=0,
                message=f"Найдено слитков в одном цикле: {ingots_per_cycle}",
            )

            shift_ws_manager.broadcast_json({
                "type": "shift_analysis_started",
                "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                "shift_id": shift_id,
                "ingots_per_cycle": ingots_per_cycle,
                "camera_ingot_at_start": camera_current_ingot,
                "analysis_first_ingot": ordered_ingot_ids[0] if ordered_ingot_ids else None,
                "message": "Анализ смены запущен",
            })

            cycle_number = 1
            sequence_number = 0

            while True:
                with self._lock:
                    if self._stop_requested:
                        break

                for source_ingot_id in ordered_ingot_ids:
                    with self._lock:
                        if self._stop_requested:
                            break

                    sequence_number += 1
                    system_ingot_id = f"SHIFT-{shift_id:05d}-INGOT-{sequence_number:06d}"
                    ingot_files = grouped[source_ingot_id]

                    self._set_status(
                        current_ingot=system_ingot_id,
                        current_source_ingot=source_ingot_id,
                        current_cycle=cycle_number,
                        current_sequence_number=sequence_number,
                        message=(
                            f"Обработка {system_ingot_id} "
                            f"(источник кадров: {source_ingot_id}, цикл {cycle_number})"
                        ),
                    )

                    def on_frame(frame_info: dict):
                        self._set_status(
                            current_ingot=frame_info["ingot_id"],
                            current_source_ingot=source_ingot_id,
                            current_frame_name=frame_info["frame_name"],
                            current_frame_url=frame_info["frame_url"],
                            current_frame_index=frame_info["frame_index"],
                            current_frame_total=frame_info["frame_total"],
                            current_p_crack=frame_info["p_crack"],
                            current_frame_verdict=frame_info["frame_verdict"],
                            message=(
                                f"{frame_info['ingot_id']} | источник {source_ingot_id} | "
                                f"кадр {frame_info['frame_index']}/{frame_info['frame_total']} | "
                                f"p_crack={frame_info['p_crack']:.3f} | "
                                f"{frame_info['frame_verdict']}"
                            ),
                            current_model_type=frame_info.get("model_type"),
                            current_detections=frame_info.get("detections", []),
                            current_best_bbox=frame_info.get("best_bbox"),
                            current_bbox_count=len(frame_info.get("detections", []) or []),
                        )

                        shift_ws_manager.broadcast_json({
                            "type": "analysis_frame",
                            "source": "analysis",
                            "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                            "shift_id": shift_id,
                            "ingot_id": frame_info["ingot_id"],
                            "source_ingot_id": source_ingot_id,
                            "cycle_number": cycle_number,
                            "sequence_number": sequence_number,
                            "frame_name": frame_info["frame_name"],
                            "frame_url": frame_info["frame_url"],
                            "frame_index": frame_info["frame_index"],
                            "frame_total": frame_info["frame_total"],
                            "p_crack": frame_info["p_crack"],
                            "frame_verdict": frame_info["frame_verdict"],
                            "model_type": frame_info.get("model_type"),
                            "detections": frame_info.get("detections", []),
                            "best_bbox": frame_info.get("best_bbox"),
                            "bbox_count": len(frame_info.get("detections", []) or []),
                        })

                    result = process_one_ingot(
                        ingot_id=system_ingot_id,
                        ingot_files=ingot_files,
                        mode=mode,
                        threshold=threshold,
                        on_frame=on_frame,
                    )

                    result["source_ingot_id"] = source_ingot_id
                    result["cycle_number"] = cycle_number
                    result["sequence_number"] = sequence_number

                    db = SessionLocal()
                    try:
                        saved = save_one_ingot_result_to_db(
                            db=db,
                            result=result,
                            user_id=user_id,
                            shift_id=shift_id,
                        )
                    finally:
                        db.close()

                    db = SessionLocal()
                    try:
                        update_shift_stats(db=db, shift_id=shift_id)
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
                            f"{system_ingot_id} обработан: {result['verdict']} "
                            f"(max_p_crack={result['max_p_crack']:.3f})"
                        )

                    shift_ws_manager.broadcast_json({
                        "type": "ingot_result",
                        "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                        "shift_id": shift_id,
                        "ingot_id": result["ingot_id"],
                        "source_ingot_id": result["source_ingot_id"],
                        "cycle_number": result["cycle_number"],
                        "sequence_number": result["sequence_number"],
                        "verdict": result["verdict"],
                        "max_p_crack": result["max_p_crack"],
                        "threshold": result["threshold"],
                        "mode": result["mode"],
                        "frames_count": result["frames_count"],
                        "inspection_id": saved.get("inspection_id") if saved else None,
                        "defect_id": saved.get("defect_id") if saved else None,
                        "model_id": result.get("model_id"),
                        "model_key": result.get("model_key"),
                        "model_name": result.get("model_name"),
                        "model_type": result.get("model_type"),
                        "architecture": result.get("architecture"),

                        "best_bbox": result.get("best_bbox"),
                        "detections": result.get("best_detections", []),
                        "bbox_count": result.get("bbox_count", 0),
                    })

                    if result["verdict"] == "CRACK":
                        shift_ws_manager.broadcast_json({
                            "type": "defect_event",
                            "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                            "shift_id": shift_id,
                            "ingot_id": result["ingot_id"],
                            "source_ingot_id": result["source_ingot_id"],
                            "cycle_number": result["cycle_number"],
                            "sequence_number": result["sequence_number"],
                            "max_p_crack": result["max_p_crack"],
                            "defect_id": saved.get("defect_id") if saved else None,
                            "message": f"Обнаружен дефект: {result['ingot_id']}",
                            "model_id": result.get("model_id"),
                            "model_key": result.get("model_key"),
                            "model_name": result.get("model_name"),
                            "model_type": result.get("model_type"),
                            "architecture": result.get("architecture"),

                            "best_bbox": result.get("best_bbox"),
                            "detections": result.get("best_detections", []),
                            "bbox_count": result.get("bbox_count", 0),
                        })

                    if delay_sec > 0:
                        time.sleep(delay_sec)

                cycle_number += 1

            self._set_status(
                running=False,
                stop_requested=False,
                current_ingot=None,
                current_source_ingot=None,
                finished_at=datetime.utcnow().isoformat(timespec="seconds"),
                message="Смена остановлена пользователем",
            )

            shift_ws_manager.broadcast_json({
                "type": "shift_finished",
                "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                "shift_id": shift_id,
                "stopped_by_user": True,
                "message": "Смена остановлена пользователем",
            })

            db = SessionLocal()
            try:
                update_shift_stats(
                    db=db,
                    shift_id=shift_id,
                    status="stopped",
                )
            finally:
                db.close()

        except Exception as e:
            self._set_status(
                running=False,
                stop_requested=False,
                current_ingot=None,
                current_source_ingot=None,
                finished_at=datetime.utcnow().isoformat(timespec="seconds"),
                error=str(e),
                message=f"Ошибка обработки смены: {e}",
            )

            try:
                db = SessionLocal()
                try:
                    current_shift_id = self._status.get("shift_id") or shift_id
                    if current_shift_id:
                        update_shift_stats(
                            db=db,
                            shift_id=current_shift_id,
                            status="error",
                            error_message=str(e),
                        )
                finally:
                    db.close()
            except Exception:
                pass

            shift_ws_manager.broadcast_json({
                "type": "shift_error",
                "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                "shift_id": shift_id,
                "message": str(e),
            })
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
    best_bbox = None
    best_detections = []
    best_model_type = None
    effective_threshold = float(threshold or 0)
    total_frames = len(ingot_files)
    last_pred = None
    for frame_index, img_path in enumerate(ingot_files, start=1):
        pil_img = PILImage.open(img_path).convert("RGB")

        pred = ai_service.predict_pil(
            pil_img=pil_img,
            threshold=threshold,
            mode=mode,
        )
        last_pred = pred

        p_crack = float(pred.get("p_crack", 0))
        effective_threshold = float(pred.get("threshold", threshold or 0))
        frame_verdict = pred.get("verdict") or (
            "CRACK" if p_crack >= effective_threshold else "OK"
        )

        detections = pred.get("detections", []) or []
        bbox = pred.get("best_bbox")
        model_type = pred.get("model_type")

        frames_count += 1

        if p_crack > max_p_crack:
            max_p_crack = p_crack
            best_frame_src = img_path
            best_bbox = bbox
            best_detections = detections
            best_model_type = model_type

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
                "model_type": model_type,
                "detections": detections,
                "best_bbox": bbox,
            })

     

    verdict = "CRACK" if max_p_crack >= float(effective_threshold) else "OK"

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
        "threshold": float(effective_threshold),
        "mode": mode,
        "verdict": verdict,
        "best_frame_src": best_frame_src,
        "best_frame_saved": best_frame_saved,
        "model_id": last_pred.get("model_id") if last_pred else None,
        "model_key": last_pred.get("model_key") if last_pred else None,
        "model_name": last_pred.get("model_name") if last_pred else None,
        "model_type": best_model_type or (last_pred.get("model_type") if last_pred else None),
        "architecture": last_pred.get("architecture") if last_pred else None,
        "best_bbox": best_bbox,
        "best_detections": best_detections,
        "bbox_count": len(best_detections),
    }


def save_one_ingot_result_to_db(
    db: Session,
    result: dict,
    user_id: int | None = None,
    shift_id: int | None = None,
):
    verdict = result["verdict"]
    has_defect = verdict == "CRACK"
    active_model_info = ai_service.get_active_model_runtime_info()
    inspection = Inspection(
        ingot_id=result["ingot_id"],
        source_ingot_id=result.get("source_ingot_id"),
        cycle_number=result.get("cycle_number"),
        sequence_number=result.get("sequence_number"),
        has_defect=has_defect,
        verdict=verdict,
        confidence=float(result["max_p_crack"]),
        max_p_crack=float(result["max_p_crack"]),
        threshold=float(result["threshold"]),
        mode=result["mode"],
        frames_count=int(result["frames_count"]),
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
        shift_id=shift_id,
        ai_model_id=result.get("model_id") or active_model_info.get("id"),
        ai_model_key=result.get("model_key") or active_model_info.get("model_key"),
        ai_model_name=result.get("model_name") or active_model_info.get("name"),
        ai_model_type=result.get("model_type") or active_model_info.get("model_type"),
        ai_model_architecture=result.get("architecture") or active_model_info.get("architecture"),
        created_by=user_id,
        
    )

    db.add(inspection)
    db.flush()

    defect = None
    image = None

    if has_defect:
        detections = result.get("best_detections") or []
        best_bbox = result.get("best_bbox")
        defect = Defect(
            inspection_id=inspection.id,
            defect_type="crack",
            confidence=float(result["max_p_crack"]),
            status="pending",
            is_confirmed=False,
            bbox=best_bbox,
            detections=detections,
            bbox_count=len(detections),
        )

        db.add(defect)
        db.flush()

        if result.get("best_frame_saved"):
            best_frame_path = Path(result["best_frame_saved"])

            object_key = storage_service.upload_file(
                local_file_path=best_frame_path,
                object_prefix=f"best_frames/{result['ingot_id']}",
                content_type="image/jpeg",
            )

            image = InspectionImage(
                file_path=object_key,

                storage_type="s3",
                bucket=settings.S3_BUCKET,
                object_key=object_key,
                content_type="image/jpeg",
                size_bytes=best_frame_path.stat().st_size if best_frame_path.exists() else None,

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
        "bbox": defect.bbox if defect else None,
        "detections": defect.detections if defect else [],
        "bbox_count": defect.bbox_count if defect else 0,
    }


shift_runtime_service = ShiftRuntimeService()
def update_shift_stats(
    db: Session,
    shift_id: int,
    status: str | None = None,
    error_message: str | None = None,
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        return

    inspections = db.query(Inspection).filter(Inspection.shift_id == shift_id).all()

    processed = len(inspections)
    total_crack = sum(1 for i in inspections if i.has_defect)
    total_ok = processed - total_crack

    sum_max_p = sum(float(i.max_p_crack or 0) for i in inspections)
    sum_frames = sum(int(i.frames_count or 0) for i in inspections)

    shift.processed_ingots = processed
    shift.total_ingots = processed
    shift.total_crack = total_crack
    shift.total_ok = total_ok

    shift.defect_rate = (total_crack / processed * 100.0) if processed > 0 else 0.0
    shift.avg_max_p_crack = (sum_max_p / processed) if processed > 0 else 0.0
    shift.avg_frames = (sum_frames / processed) if processed > 0 else 0.0

    if status:
        shift.status = status

    if error_message:
        shift.error_message = error_message

    if status in ("finished", "stopped", "error"):
        shift.finished_at = datetime.utcnow()

    db.commit()
def create_shift_record(
    user_id: int,
    mode: str,
    threshold: float,
) -> int:
    db = SessionLocal()
    try:
        shift = Shift(
            status="running",
            mode=mode,
            threshold=float(threshold),
            started_by=user_id,
            total_ingots=0,
            processed_ingots=0,
            total_crack=0,
            total_ok=0,
            defect_rate=0.0,
            avg_max_p_crack=0.0,
            avg_frames=0.0,
        )

        db.add(shift)
        db.commit()
        db.refresh(shift)

        return shift.id
    finally:
        db.close()