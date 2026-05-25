# shift_runtime_service.py
import queue
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from PIL import Image as PILImage
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.ws_manager import shift_ws_manager
from app.models.defect import Defect
from app.models.image import Image as InspectionImage
from app.models.inspection import Inspection
from app.models.shift import Shift
from app.services.ai_service import ai_service
from app.services.camera_runtime_service import camera_runtime_service
from app.services.shift_service import (
    DEFAULT_STREAM_DIR,
    list_images,
    group_images_by_ingot,
    save_best_frame,
    extract_ingot_id,
)
from app.services.storage_service import storage_service


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

        self._analysis_thread = None
        self._analysis_queue = queue.Queue()

        self._stop_requested = False
        self._accepting_frames = False
        self._analysis_debug = False

        self._current_source_ingot_id = None
        self._current_frame_buffer = []

        self._sequence_number = 0
        self._user_id = None
        self._shift_id = None

        self._analysis_started_monotonic = None
        self._processed_frames = 0
        self._dropped_frames = 0
        self._last_analysis_time_ms = 0.0
        self._total_analysis_time_ms = 0.0

        self._processed_tasks = 0
        self._total_task_time_ms = 0.0

        self._status = self._initial_status()

        camera_runtime_service.register_frame_consumer(self.enqueue_camera_frame)

    def _initial_status(self):
        return {
            "running": False,
            "shift_phase": "idle",
            "accepting_frames": False,
            "analysis_running": False,
            "stop_requested": False,
            "analysis_debug": False,
            "analysis_frame_events_enabled": False,

            "started_at": None,
            "finished_at": None,
            "mode": None,
            "threshold": None,
            "stream_dir": DEFAULT_STREAM_DIR,

            "total_ingots": 0,
            "ingots_per_cycle": 0,
            "processed_ingots": 0,
            "total_crack": 0,
            "total_ok": 0,

            "analysis_queue_size": 0,
            "analysis_queue_frames": 0,
            "queue_size": 0,
            "buffered_frames_count": 0,

            "processed_frames_total": 0,
            "processed_frames": 0,
            "dropped_frames": 0,

            "analysis_fps": 0.0,
            "last_analysis_time_ms": 0.0,
            "avg_analysis_time_ms": 0.0,

            "last_task_total_time_ms": 0.0,
            "avg_task_total_time_ms": 0.0,
            "last_model_analysis_time_ms": 0.0,
            "last_image_load_time_ms": 0.0,
            "last_batch_inference_time_ms": 0.0,
            "last_prediction_postprocess_time_ms": 0.0,
            "last_best_frame_save_time_ms": 0.0,
            "last_db_save_time_ms": 0.0,
            "last_shift_stats_update_time_ms": 0.0,
            "last_storage_upload_time_ms": 0.0,
            "last_ws_publish_time_ms": 0.0,

            "current_ingot": None,
            "current_source_ingot": None,
            "current_cycle": None,
            "current_sequence_number": None,
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

    def _get_queued_frames_count(self) -> int:
        try:
            with self._analysis_queue.mutex:
                return sum(
                    len(task.get("frame_paths", []) or [])
                    for task in list(self._analysis_queue.queue)
                    if isinstance(task, dict)
                )
        except Exception:
            return 0

    def _is_analysis_debug_enabled(self) -> bool:
        with self._lock:
            return bool(self._analysis_debug)

    def _build_analysis_metrics_locked(self) -> dict:
        queued_frames = self._get_queued_frames_count()
        buffered_frames = int(self._status.get("buffered_frames_count") or 0)

        elapsed = (
            time.perf_counter() - self._analysis_started_monotonic
            if self._analysis_started_monotonic
            else 0.0
        )

        analysis_fps = (
            self._processed_frames / elapsed
            if elapsed > 0 and self._processed_frames > 0
            else 0.0
        )

        avg_analysis_time_ms = (
            self._total_analysis_time_ms / self._processed_frames
            if self._processed_frames > 0
            else 0.0
        )

        return {
            "analysis_queue_size": self._analysis_queue.qsize(),
            "analysis_queue_frames": queued_frames,
            "queue_size": queued_frames + buffered_frames,

            "processed_frames_total": self._processed_frames,
            "processed_frames": self._processed_frames,
            "dropped_frames": self._dropped_frames,

            "analysis_fps": round(analysis_fps, 2),
            "last_analysis_time_ms": round(self._last_analysis_time_ms, 2),
            "avg_analysis_time_ms": round(avg_analysis_time_ms, 2),
        }

    def _get_analysis_metrics_snapshot(self) -> dict:
        with self._lock:
            return self._build_analysis_metrics_locked()

    def _reset_analysis_metrics_locked(self):
        self._analysis_started_monotonic = time.perf_counter()
        self._processed_frames = 0
        self._dropped_frames = 0
        self._last_analysis_time_ms = 0.0
        self._total_analysis_time_ms = 0.0

        self._processed_tasks = 0
        self._total_task_time_ms = 0.0

        self._status.update(self._build_analysis_metrics_locked())

    def _record_frame_analysis_metric(self, analysis_time_ms: float):
        with self._lock:
            self._processed_frames += 1
            self._last_analysis_time_ms = float(analysis_time_ms or 0.0)
            self._total_analysis_time_ms += float(analysis_time_ms or 0.0)
            self._status.update(self._build_analysis_metrics_locked())

    def _record_task_profiling(
        self,
        task_total_time_ms: float,
        model_analysis_time_ms: float,
        db_save_time_ms: float,
        shift_stats_update_time_ms: float,
        storage_upload_time_ms: float,
        image_load_time_ms: float = 0.0,
        batch_inference_time_ms: float = 0.0,
        prediction_postprocess_time_ms: float = 0.0,
        best_frame_save_time_ms: float = 0.0,
    ):
        with self._lock:
            self._processed_tasks += 1
            self._total_task_time_ms += float(task_total_time_ms or 0.0)

            avg_task_total_time_ms = (
                self._total_task_time_ms / self._processed_tasks
                if self._processed_tasks > 0
                else 0.0
            )

            self._status.update({
                "last_task_total_time_ms": round(float(task_total_time_ms or 0.0), 2),
                "avg_task_total_time_ms": round(avg_task_total_time_ms, 2),
                "last_model_analysis_time_ms": round(float(model_analysis_time_ms or 0.0), 2),

                "last_image_load_time_ms": round(float(image_load_time_ms or 0.0), 2),
                "last_batch_inference_time_ms": round(float(batch_inference_time_ms or 0.0), 2),
                "last_prediction_postprocess_time_ms": round(float(prediction_postprocess_time_ms or 0.0), 2),
                "last_best_frame_save_time_ms": round(float(best_frame_save_time_ms or 0.0), 2),

                "last_db_save_time_ms": round(float(db_save_time_ms or 0.0), 2),
                "last_shift_stats_update_time_ms": round(float(shift_stats_update_time_ms or 0.0), 2),
                "last_storage_upload_time_ms": round(float(storage_upload_time_ms or 0.0), 2),
            })

    def get_status(self):
        with self._lock:
            total = self._status["processed_ingots"]
            total_crack = self._status["total_crack"]
            total_ok = self._status["total_ok"]
            defect_rate = (total_crack / total * 100.0) if total > 0 else 0.0

            analysis_running = (
                self._analysis_thread is not None
                and self._analysis_thread.is_alive()
            )

            metrics = self._build_analysis_metrics_locked()

            return {
                **self._status,
                **metrics,
                "analysis_running": analysis_running,
                "defect_rate": defect_rate,
                "total_ok": total_ok,
            }

    def start_shift(
        self,
        user_id: int,
        mode: Optional[str] = None,
        threshold: Optional[float] = None,
        delay_sec: float = 0.7,
        analysis_debug: bool = False,
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

        files = list_images(DEFAULT_STREAM_DIR)
        grouped, skipped = group_images_by_ingot(files)
        ingots_per_cycle = len(grouped)

        if not grouped:
            raise RuntimeError("В stream_images не найдено слитков для обработки")

        with self._lock:
            if self._status["running"]:
                raise RuntimeError("Смена уже запущена")

            shift_id = create_shift_record(
                user_id=user_id,
                mode=mode,
                threshold=float(threshold),
            )

            self._analysis_queue = queue.Queue()
            self._stop_requested = False
            self._accepting_frames = True
            self._analysis_debug = bool(analysis_debug)

            self._current_source_ingot_id = None
            self._current_frame_buffer = []

            self._sequence_number = 0
            self._user_id = user_id
            self._shift_id = shift_id

            self._status = self._initial_status()
            self._reset_analysis_metrics_locked()

            self._status.update({
                "running": True,
                "shift_phase": "running",
                "accepting_frames": True,
                "analysis_running": True,
                "stop_requested": False,
                "analysis_debug": bool(analysis_debug),
                "analysis_frame_events_enabled": bool(analysis_debug),

                "started_at": datetime.utcnow().isoformat(timespec="seconds"),
                "mode": mode,
                "threshold": float(threshold),
                "message": "Смена запущена. Анализ ожидает кадры камеры.",
                "shift_id": shift_id,

                "total_ingots": ingots_per_cycle,
                "ingots_per_cycle": ingots_per_cycle,
                "skipped_files_count": len(skipped),
                "skipped_files": skipped,

                "active_model_id": active_model.get("id"),
                "active_model_key": active_model.get("model_key"),
                "active_model_name": active_model.get("name"),
                "active_model_type": active_model.get("model_type"),
                "active_model_architecture": active_model.get("architecture"),
                "active_confidence_threshold": active_model.get("confidence_threshold"),
                "active_iou_threshold": active_model.get("iou_threshold"),
            })

        self._analysis_thread = threading.Thread(
            target=self._analysis_worker,
            kwargs={
                "shift_id": shift_id,
                "user_id": user_id,
                "mode": mode,
                "threshold": float(threshold),
            },
            daemon=True,
        )
        self._analysis_thread.start()

        shift_ws_manager.broadcast_json({
            "type": "shift_started",
            "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
            "shift_id": shift_id,
            "mode": mode,
            "threshold": float(threshold),
            "active_model_id": active_model.get("id"),
            "active_model_key": active_model.get("model_key"),
            "active_model_name": active_model.get("name"),
            "active_model_type": active_model.get("model_type"),
            "active_model_architecture": active_model.get("architecture"),
            "confidence_threshold": active_model.get("confidence_threshold"),
            "iou_threshold": active_model.get("iou_threshold"),
            "analysis_debug": bool(analysis_debug),
            "analysis_frame_events_enabled": bool(analysis_debug),
            "message": "Смена запущена. Камера работает отдельно, анализ получает кадры из очереди.",
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
            self._accepting_frames = False

            self._status["stop_requested"] = True
            self._status["accepting_frames"] = False
            self._status["shift_phase"] = "finishing"
            self._status["message"] = (
                "Остановка смены: новые кадры не принимаются, очередь анализа дорабатывается"
            )

            self._enqueue_current_buffer_locked(reason="stop_shift")

        shift_ws_manager.broadcast_json({
            "type": "shift_stop_requested",
            "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
            "shift_id": self._shift_id,
            "message": "Остановка смены: очередь анализа будет обработана до конца",
        })

        return self.get_status()

    def enqueue_camera_frame(self, frame_info: dict):
        event_type = frame_info.get("type")

        if event_type == "camera_stopped":
            with self._lock:
                if self._status.get("running"):
                    self._enqueue_current_buffer_locked(reason="camera_stopped")
                    self._status["message"] = (
                        "Камера остановлена. Накопленные кадры переданы в очередь анализа."
                    )
            return

        if event_type != "camera_frame":
            return

        frame_path = frame_info.get("frame_path")

        if not frame_path:
            return

        source_ingot_id = frame_info.get("ingot_id")

        if not source_ingot_id:
            try:
                source_ingot_id = extract_ingot_id(frame_path)
            except Exception:
                source_ingot_id = None

        if not source_ingot_id:
            return

        with self._lock:
            if not self._accepting_frames:
                return

            if not self._status.get("running"):
                return

            if self._status.get("shift_phase") != "running":
                return

            if self._current_source_ingot_id is None:
                self._current_source_ingot_id = source_ingot_id
                self._current_frame_buffer = []

            elif source_ingot_id != self._current_source_ingot_id:
                self._enqueue_current_buffer_locked(reason="ingot_changed")
                self._current_source_ingot_id = source_ingot_id
                self._current_frame_buffer = []

            self._current_frame_buffer.append(frame_path)

            self._status.update({
                "current_source_ingot": source_ingot_id,
                "current_frame_name": frame_info.get("frame_name"),
                "current_frame_url": frame_info.get("frame_url"),
                "current_frame_index": frame_info.get("frame_index"),
                "buffered_frames_count": len(self._current_frame_buffer),
                "message": (
                    f"Кадр {frame_info.get('frame_name')} добавлен в буфер анализа "
                    f"для источника {source_ingot_id}"
                ),
            })

            self._status.update(self._build_analysis_metrics_locked())

    def _enqueue_current_buffer_locked(self, reason: str):
        if not self._current_frame_buffer:
            return None

        if not self._shift_id:
            self._current_frame_buffer = []
            self._current_source_ingot_id = None
            return None

        self._sequence_number += 1

        ingots_per_cycle = int(self._status.get("ingots_per_cycle") or 0)

        if ingots_per_cycle > 0:
            cycle_number = ((self._sequence_number - 1) // ingots_per_cycle) + 1
        else:
            cycle_number = 1

        system_ingot_id = f"SHIFT-{self._shift_id:05d}-INGOT-{self._sequence_number:06d}"

        task = {
            "shift_id": self._shift_id,
            "ingot_id": system_ingot_id,
            "source_ingot_id": self._current_source_ingot_id,
            "cycle_number": cycle_number,
            "sequence_number": self._sequence_number,
            "frame_paths": list(self._current_frame_buffer),
            "reason": reason,
        }

        self._analysis_queue.put(task)

        self._status.update({
            "buffered_frames_count": 0,
            "current_ingot": system_ingot_id,
            "current_source_ingot": self._current_source_ingot_id,
            "current_cycle": cycle_number,
            "current_sequence_number": self._sequence_number,
            "message": (
                f"{system_ingot_id} добавлен в очередь анализа "
                f"({len(task['frame_paths'])} кадров)"
            ),
        })

        self._current_frame_buffer = []
        self._current_source_ingot_id = None

        self._status.update(self._build_analysis_metrics_locked())

        return task

    def _set_status(self, **kwargs):
        with self._lock:
            self._status.update(kwargs)
            self._status.update(self._build_analysis_metrics_locked())

    def _analysis_worker(
        self,
        shift_id: int,
        user_id: int,
        mode: str,
        threshold: float,
    ):
        try:
            while True:
                try:
                    task = self._analysis_queue.get(timeout=0.25)
                except queue.Empty:
                    with self._lock:
                        should_finish = self._stop_requested and self._analysis_queue.empty()

                    if should_finish:
                        break

                    continue

                try:
                    result, saved = self._process_analysis_task(
                        task=task,
                        user_id=user_id,
                        mode=mode,
                        threshold=threshold,
                    )

                    self._handle_analysis_result(
                        task=task,
                        result=result,
                        saved=saved,
                    )

                finally:
                    self._analysis_queue.task_done()

            self._finish_shift(
                shift_id=shift_id,
                status="stopped",
                message="Смена остановлена пользователем. Очередь анализа обработана.",
            )

        except Exception as e:
            self._fail_shift(
                shift_id=shift_id,
                error_message=str(e),
            )

    def _process_analysis_task(
        self,
        task: dict,
        user_id: int,
        mode: str,
        threshold: float,
    ):
        source_ingot_id = task["source_ingot_id"]
        cycle_number = task["cycle_number"]
        sequence_number = task["sequence_number"]
        system_ingot_id = task["ingot_id"]
        ingot_files = task["frame_paths"]

        self._set_status(
            current_ingot=system_ingot_id,
            current_source_ingot=source_ingot_id,
            current_cycle=cycle_number,
            current_sequence_number=sequence_number,
            current_frame_name=None,
            current_frame_url=None,
            current_frame_index=None,
            current_frame_total=len(ingot_files),
            current_p_crack=None,
            current_frame_verdict=None,
            current_model_type=None,
            current_detections=[],
            current_best_bbox=None,
            current_bbox_count=0,
            message=(
                f"Анализ {system_ingot_id} "
                f"(источник кадров: {source_ingot_id}, кадров: {len(ingot_files)})"
            ),
        )

        def on_frame(frame_info: dict):
            if not self._is_analysis_debug_enabled():
                return

            self._set_status(
                current_ingot=frame_info["ingot_id"],
                current_source_ingot=source_ingot_id,
                current_cycle=cycle_number,
                current_sequence_number=sequence_number,
                current_frame_name=frame_info["frame_name"],
                current_frame_url=frame_info["frame_url"],
                current_frame_index=frame_info["frame_index"],
                current_frame_total=frame_info["frame_total"],
                current_p_crack=frame_info["p_crack"],
                current_frame_verdict=frame_info["frame_verdict"],
                current_model_type=frame_info.get("model_type"),
                current_detections=frame_info.get("detections", []),
                current_best_bbox=frame_info.get("best_bbox"),
                current_bbox_count=len(frame_info.get("detections", []) or []),
                message=(
                    f"{frame_info['ingot_id']} | источник {source_ingot_id} | "
                    f"кадр {frame_info['frame_index']}/{frame_info['frame_total']} | "
                    f"p_crack={frame_info['p_crack']:.3f} | "
                    f"{frame_info['frame_verdict']}"
                ),
            )

            metrics = self._get_analysis_metrics_snapshot()

            shift_ws_manager.broadcast_json({
                "type": "analysis_frame",
                "source": "analysis",
                "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                "shift_id": task["shift_id"],
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
                "analysis_time_ms": frame_info.get("analysis_time_ms"),
                "batch_analysis_time_ms": frame_info.get("batch_analysis_time_ms"),

                "analysis_fps": metrics["analysis_fps"],
                "last_analysis_time_ms": metrics["last_analysis_time_ms"],
                "avg_analysis_time_ms": metrics["avg_analysis_time_ms"],
                "queue_size": metrics["queue_size"],
                "processed_frames": metrics["processed_frames"],
                "dropped_frames": metrics["dropped_frames"],
            })

        task_total_start = time.perf_counter()

        model_analysis_start = time.perf_counter()

        result = process_one_ingot(
            ingot_id=system_ingot_id,
            ingot_files=ingot_files,
            mode=mode,
            threshold=threshold,
            on_frame=on_frame,
            on_frame_metric=self._record_frame_analysis_metric,
        )

        model_analysis_time_ms = (time.perf_counter() - model_analysis_start) * 1000.0

        result["source_ingot_id"] = source_ingot_id
        result["cycle_number"] = cycle_number
        result["sequence_number"] = sequence_number

        db_save_start = time.perf_counter()
        db = SessionLocal()

        try:
            saved = save_one_ingot_result_to_db(
                db=db,
                result=result,
                user_id=user_id,
                shift_id=task["shift_id"],
                commit=False,
            )

            db_save_time_ms = (time.perf_counter() - db_save_start) * 1000.0

            shift_stats_update_start = time.perf_counter()

            update_shift_stats_incremental(
                db=db,
                shift_id=task["shift_id"],
                result=result,
                commit=False,
            )

            db.commit()

            shift_stats_update_time_ms = (
                time.perf_counter() - shift_stats_update_start
            ) * 1000.0

        except Exception:
            db.rollback()
            raise

        finally:
            db.close()

        task_total_time_ms = (time.perf_counter() - task_total_start) * 1000.0

        storage_upload_time_ms = 0.0
        if saved:
            storage_upload_time_ms = float(saved.get("storage_upload_time_ms") or 0.0)

        profiling = result.get("profiling") or {}

        self._record_task_profiling(
            task_total_time_ms=task_total_time_ms,
            model_analysis_time_ms=model_analysis_time_ms,
            db_save_time_ms=db_save_time_ms,
            shift_stats_update_time_ms=shift_stats_update_time_ms,
            storage_upload_time_ms=storage_upload_time_ms,
            image_load_time_ms=float(profiling.get("image_load_time_ms") or 0.0),
            batch_inference_time_ms=float(profiling.get("batch_inference_time_ms") or 0.0),
            prediction_postprocess_time_ms=float(profiling.get("prediction_postprocess_time_ms") or 0.0),
            best_frame_save_time_ms=float(profiling.get("best_frame_save_time_ms") or 0.0),
        )

        return result, saved

    def _handle_analysis_result(self, task: dict, result: dict, saved: dict | None):
        with self._lock:
            self._status["processed_ingots"] += 1

            if result["verdict"] == "CRACK":
                self._status["total_crack"] += 1
            else:
                self._status["total_ok"] += 1

            self._status["last_result"] = result
            self._status["last_saved"] = saved
            self._status["message"] = (
                f"{result['ingot_id']} обработан: {result['verdict']} "
                f"(max_p_crack={result['max_p_crack']:.3f})"
            )
            self._status.update(self._build_analysis_metrics_locked())

        ws_publish_start = time.perf_counter()
        metrics = self._get_analysis_metrics_snapshot()

        shift_ws_manager.broadcast_json({
            "type": "ingot_result",
            "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
            "shift_id": task["shift_id"],
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

            "analysis_fps": metrics["analysis_fps"],
            "last_analysis_time_ms": metrics["last_analysis_time_ms"],
            "avg_analysis_time_ms": metrics["avg_analysis_time_ms"],
            "queue_size": metrics["queue_size"],
            "processed_frames": metrics["processed_frames"],
            "dropped_frames": metrics["dropped_frames"],
        })

        if result["verdict"] == "CRACK":
            shift_ws_manager.broadcast_json({
                "type": "defect_event",
                "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                "shift_id": task["shift_id"],
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

                "analysis_fps": metrics["analysis_fps"],
                "last_analysis_time_ms": metrics["last_analysis_time_ms"],
                "avg_analysis_time_ms": metrics["avg_analysis_time_ms"],
                "queue_size": metrics["queue_size"],
                "processed_frames": metrics["processed_frames"],
                "dropped_frames": metrics["dropped_frames"],
            })

        ws_publish_time_ms = (time.perf_counter() - ws_publish_start) * 1000.0

        with self._lock:
            self._status["last_ws_publish_time_ms"] = round(ws_publish_time_ms, 2)

    def _finish_shift(self, shift_id: int, status: str, message: str):
        finished_at = datetime.utcnow().isoformat(timespec="seconds")

        self._set_status(
            running=False,
            shift_phase=status,
            accepting_frames=False,
            analysis_running=False,
            stop_requested=False,
            current_ingot=None,
            current_source_ingot=None,
            current_frame_name=None,
            current_frame_url=None,
            finished_at=finished_at,
            message=message,
        )

        db = SessionLocal()
        try:
            update_shift_stats(
                db=db,
                shift_id=shift_id,
                status=status,
            )
        finally:
            db.close()

        metrics = self._get_analysis_metrics_snapshot()

        shift_ws_manager.broadcast_json({
            "type": "shift_finished",
            "timestamp": finished_at,
            "shift_id": shift_id,
            "stopped_by_user": True,
            "message": message,

            "analysis_fps": metrics["analysis_fps"],
            "last_analysis_time_ms": metrics["last_analysis_time_ms"],
            "avg_analysis_time_ms": metrics["avg_analysis_time_ms"],
            "queue_size": metrics["queue_size"],
            "processed_frames": metrics["processed_frames"],
            "dropped_frames": metrics["dropped_frames"],
        })

        with self._lock:
            self._stop_requested = False
            self._accepting_frames = False
            self._current_source_ingot_id = None
            self._current_frame_buffer = []

    def _fail_shift(self, shift_id: int, error_message: str):
        finished_at = datetime.utcnow().isoformat(timespec="seconds")

        self._set_status(
            running=False,
            shift_phase="error",
            accepting_frames=False,
            analysis_running=False,
            stop_requested=False,
            current_ingot=None,
            current_source_ingot=None,
            finished_at=finished_at,
            error=error_message,
            message=f"Ошибка обработки смены: {error_message}",
        )

        try:
            db = SessionLocal()
            try:
                update_shift_stats(
                    db=db,
                    shift_id=shift_id,
                    status="error",
                    error_message=error_message,
                )
            finally:
                db.close()
        except Exception:
            pass

        shift_ws_manager.broadcast_json({
            "type": "shift_error",
            "timestamp": finished_at,
            "shift_id": shift_id,
            "message": error_message,
        })


def process_one_ingot(
    ingot_id: str,
    ingot_files: list[str],
    mode: str,
    threshold: float,
    on_frame=None,
    on_frame_metric=None,
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

    image_load_time_ms = 0.0
    batch_inference_time_ms = 0.0
    prediction_postprocess_time_ms = 0.0
    best_frame_save_time_ms = 0.0

    active_model_info = ai_service.get_active_model_runtime_info()
    active_model_type = active_model_info.get("model_type")

    def handle_prediction(
        img_path: str,
        frame_index: int,
        pred: dict,
        analysis_time_ms: float,
        batch_analysis_time_ms: float | None = None,
    ):
        nonlocal frames_count
        nonlocal max_p_crack
        nonlocal best_frame_src
        nonlocal best_bbox
        nonlocal best_detections
        nonlocal best_model_type
        nonlocal effective_threshold
        nonlocal last_pred

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

        if best_frame_src is None or p_crack > max_p_crack:
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
                "analysis_time_ms": analysis_time_ms,
                "batch_analysis_time_ms": batch_analysis_time_ms,
            })

    if active_model_type == "classification":
        frame_items = []
        pil_images = []

        image_load_start = time.perf_counter()

        for frame_index, img_path in enumerate(ingot_files, start=1):
            with PILImage.open(img_path) as img:
                pil_img = img.convert("RGB")

            frame_items.append((frame_index, img_path))
            pil_images.append(pil_img)

        image_load_time_ms = (time.perf_counter() - image_load_start) * 1000.0

        if pil_images:
            batch_inference_start = time.perf_counter()

            predictions = ai_service.predict_pil_batch(
                pil_images=pil_images,
                threshold=threshold,
                mode=mode,
            )

            batch_analysis_time_ms = (time.perf_counter() - batch_inference_start) * 1000.0
            batch_inference_time_ms = batch_analysis_time_ms

            if len(predictions) != len(frame_items):
                raise RuntimeError(
                    f"predict_pil_batch вернул {len(predictions)} результатов "
                    f"для {len(frame_items)} кадров"
                )

            per_frame_analysis_time_ms = (
                batch_analysis_time_ms / len(predictions)
                if predictions
                else 0.0
            )

            postprocess_start = time.perf_counter()

            for (frame_index, img_path), pred in zip(frame_items, predictions):
                if on_frame_metric:
                    on_frame_metric(per_frame_analysis_time_ms)

                handle_prediction(
                    img_path=img_path,
                    frame_index=frame_index,
                    pred=pred,
                    analysis_time_ms=per_frame_analysis_time_ms,
                    batch_analysis_time_ms=batch_analysis_time_ms,
                )

            prediction_postprocess_time_ms = (
                time.perf_counter() - postprocess_start
            ) * 1000.0

    else:
        image_load_time_acc = 0.0
        inference_time_acc = 0.0
        postprocess_time_acc = 0.0

        for frame_index, img_path in enumerate(ingot_files, start=1):
            image_load_start = time.perf_counter()

            with PILImage.open(img_path) as img:
                pil_img = img.convert("RGB")

            image_load_time_acc += (
                time.perf_counter() - image_load_start
            ) * 1000.0

            inference_start = time.perf_counter()

            pred = ai_service.predict_pil(
                pil_img=pil_img,
                threshold=threshold,
                mode=mode,
            )

            analysis_time_ms = (time.perf_counter() - inference_start) * 1000.0
            inference_time_acc += analysis_time_ms

            if on_frame_metric:
                on_frame_metric(analysis_time_ms)

            postprocess_start = time.perf_counter()

            handle_prediction(
                img_path=img_path,
                frame_index=frame_index,
                pred=pred,
                analysis_time_ms=analysis_time_ms,
                batch_analysis_time_ms=None,
            )

            postprocess_time_acc += (
                time.perf_counter() - postprocess_start
            ) * 1000.0

        image_load_time_ms = image_load_time_acc
        batch_inference_time_ms = inference_time_acc
        prediction_postprocess_time_ms = postprocess_time_acc

    verdict = "CRACK" if max_p_crack >= float(effective_threshold) else "OK"

    best_frame_saved = None

    if verdict == "CRACK" and best_frame_src:
        best_frame_save_start = time.perf_counter()

        best_frame_saved = save_best_frame(
            src_path=best_frame_src,
            ingot_id=ingot_id,
            max_p_crack=max_p_crack,
        )

        best_frame_save_time_ms = (
            time.perf_counter() - best_frame_save_start
        ) * 1000.0

    return {
        "ingot_id": ingot_id,
        "frames_count": frames_count,
        "max_p_crack": max_p_crack,
        "threshold": float(effective_threshold),
        "mode": mode,
        "verdict": verdict,
        "best_frame_src": best_frame_src,
        "best_frame_saved": best_frame_saved,
        "best_frame_name": Path(best_frame_src).name if best_frame_src else None,

        "model_id": last_pred.get("model_id") if last_pred else None,
        "model_key": last_pred.get("model_key") if last_pred else None,
        "model_name": last_pred.get("model_name") if last_pred else None,
        "model_type": best_model_type or (last_pred.get("model_type") if last_pred else None),
        "architecture": last_pred.get("architecture") if last_pred else None,

        "best_bbox": best_bbox,
        "best_detections": best_detections,
        "bbox_count": len(best_detections),

        "profiling": {
            "image_load_time_ms": round(image_load_time_ms, 2),
            "batch_inference_time_ms": round(batch_inference_time_ms, 2),
            "prediction_postprocess_time_ms": round(prediction_postprocess_time_ms, 2),
            "best_frame_save_time_ms": round(best_frame_save_time_ms, 2),
        },
    }


def save_one_ingot_result_to_db(
    db: Session,
    result: dict,
    user_id: int | None = None,
    shift_id: int | None = None,
    commit: bool = True,
):
    verdict = result["verdict"]
    has_defect = verdict == "CRACK"
    active_model_info = ai_service.get_active_model_runtime_info()
    storage_upload_time_ms = 0.0

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

            storage_upload_start = time.perf_counter()

            object_key = storage_service.upload_file(
                local_file_path=best_frame_path,
                object_prefix=f"best_frames/{result['ingot_id']}",
                content_type="image/jpeg",
            )

            storage_upload_time_ms = (
                time.perf_counter() - storage_upload_start
            ) * 1000.0

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

    if commit:
        db.commit()
    else:
        db.flush()

    return {
        "inspection_id": inspection.id,
        "defect_id": defect.id if defect else None,
        "image_id": image.id if image else None,
        "verdict": verdict,
        "bbox": defect.bbox if defect else None,
        "detections": defect.detections if defect else [],
        "bbox_count": defect.bbox_count if defect else 0,
        "storage_upload_time_ms": round(storage_upload_time_ms, 2),
    }


def update_shift_stats_incremental(
    db: Session,
    shift_id: int,
    result: dict,
    commit: bool = True,
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        return

    old_processed = int(shift.processed_ingots or 0)
    old_total_crack = int(shift.total_crack or 0)
    old_total_ok = int(shift.total_ok or 0)

    old_avg_max_p_crack = float(shift.avg_max_p_crack or 0.0)
    old_avg_frames = float(shift.avg_frames or 0.0)

    new_processed = old_processed + 1

    verdict = result.get("verdict")
    frames_count = int(result.get("frames_count") or 0)
    max_p_crack = float(result.get("max_p_crack") or 0.0)

    new_total_crack = old_total_crack + (1 if verdict == "CRACK" else 0)
    new_total_ok = old_total_ok + (1 if verdict != "CRACK" else 0)

    new_avg_max_p_crack = (
        (old_avg_max_p_crack * old_processed + max_p_crack) / new_processed
        if new_processed > 0
        else 0.0
    )

    new_avg_frames = (
        (old_avg_frames * old_processed + frames_count) / new_processed
        if new_processed > 0
        else 0.0
    )

    shift.processed_ingots = new_processed
    shift.total_ingots = new_processed
    shift.total_crack = new_total_crack
    shift.total_ok = new_total_ok
    shift.defect_rate = (
        new_total_crack / new_processed * 100.0
        if new_processed > 0
        else 0.0
    )
    shift.avg_max_p_crack = new_avg_max_p_crack
    shift.avg_frames = new_avg_frames

    if commit:
        db.commit()
    else:
        db.flush()


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


shift_runtime_service = ShiftRuntimeService()