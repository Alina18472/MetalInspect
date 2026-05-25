
# camera_runtime_service 

import threading
import time
from pathlib import Path
from urllib.parse import quote
from datetime import datetime
from typing import Callable, Optional

from app.core.ws_manager import shift_ws_manager
from app.services.shift_service import (
    DEFAULT_STREAM_DIR,
    list_images,
    extract_ingot_id,
    extract_frame_index,
)


def stream_image_path_to_url(file_path: str | None) -> str | None:
    if not file_path:
        return None

    try:
        rel = Path(file_path).resolve().relative_to(Path(DEFAULT_STREAM_DIR).resolve())
        return "/stream-images/" + quote(rel.as_posix())
    except Exception:
        return None


def sort_stream_files(files: list[str]) -> list[str]:
    def key(path: str):
        try:
            ingot_id = extract_ingot_id(path)
            ingot_num = int(ingot_id.split("_")[1])
            frame_num = extract_frame_index(path)
            return ingot_num, frame_num, Path(path).name
        except Exception:
            return 999999, 999999, Path(path).name

    return sorted(files, key=key)


class CameraRuntimeService:
    def __init__(self):
        self._lock = threading.Lock()
        self._thread = None
        self._stop_requested = False

        self._files = []
        self._current_index = 0
        self._current_frame_path = None

        self._started_monotonic = None
        self._frames_sent = 0
        self._delay_sec = 0.25
        self._camera_fps = 0.0

        self._frame_consumer: Optional[Callable[[dict], None]] = None

        self._status = self._initial_status()

    def _initial_status(self):
        return {
            "running": False,
            "stream_dir": DEFAULT_STREAM_DIR,
            "total_frames": 0,
            "current_global_index": None,
            "current_ingot": None,
            "current_frame_name": None,
            "current_frame_url": None,
            "current_frame_index": None,

            "delay_sec": None,
            "target_camera_fps": 0.0,
            "camera_fps": 0.0,
            "camera_frames_sent": 0,

            "message": "Камера не запущена",
        }

    def register_frame_consumer(self, callback: Callable[[dict], None] | None):
        with self._lock:
            self._frame_consumer = callback

    def _get_frame_consumer(self):
        with self._lock:
            return self._frame_consumer

    def _load_files(self):
        files = list_images(DEFAULT_STREAM_DIR)
        files = sort_stream_files(files)

        if not files:
            raise FileNotFoundError(f"В папке нет изображений: {DEFAULT_STREAM_DIR}")

        return files

    def start_camera(self, delay_sec: float = 0.25):
        if delay_sec <= 0:
            raise ValueError("delay_sec должен быть больше 0")

        with self._lock:
            if self._status["running"]:
                return dict(self._status)

            self._files = self._load_files()
            self._stop_requested = False
            self._current_index = self._current_index % len(self._files)

            self._started_monotonic = time.perf_counter()
            self._frames_sent = 0
            self._camera_fps = 0.0
            self._delay_sec = float(delay_sec)

            self._status.update({
                "running": True,
                "total_frames": len(self._files),
                "delay_sec": float(delay_sec),
                "target_camera_fps": round(1.0 / float(delay_sec), 2),
                "camera_fps": 0.0,
                "camera_frames_sent": 0,
                "message": "Камера запущена",
            })

        self._thread = threading.Thread(
            target=self._camera_loop,
            kwargs={"delay_sec": delay_sec},
            daemon=True,
        )
        self._thread.start()

        return self.get_status()

    def stop_camera(self):
        should_notify = False

        with self._lock:
            should_notify = bool(self._status.get("running"))
            self._stop_requested = True
            self._status["running"] = False
            self._status["message"] = "Камера остановлена"

        if should_notify:
            consumer = self._get_frame_consumer()
            if consumer:
                try:
                    consumer({
                        "type": "camera_stopped",
                        "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
                    })
                except Exception:
                    pass

        return self.get_status()

    def get_status(self):
        with self._lock:
            return dict(self._status)

    def get_current_frame_path(self):
        with self._lock:
            return self._current_frame_path

    def _camera_loop(self, delay_sec: float):
        while True:
            with self._lock:
                if self._stop_requested:
                    self._status["running"] = False
                    self._status["message"] = "Камера остановлена"
                    break

                if not self._files:
                    self._status["running"] = False
                    self._status["message"] = "Нет кадров для показа"
                    break

                frame_path = self._files[self._current_index]
                self._current_frame_path = frame_path

                try:
                    ingot_id = extract_ingot_id(frame_path)
                    frame_index = extract_frame_index(frame_path)
                except Exception:
                    ingot_id = None
                    frame_index = None

                current_global_index = self._current_index + 1
                total_frames = len(self._files)
                frame_name = Path(frame_path).name
                frame_url = stream_image_path_to_url(frame_path)

                self._current_index = (self._current_index + 1) % len(self._files)

                self._frames_sent += 1

                elapsed = (
                    time.perf_counter() - self._started_monotonic
                    if self._started_monotonic
                    else 0.0
                )

                self._camera_fps = (
                    self._frames_sent / elapsed
                    if elapsed > 0
                    else 0.0
                )

                self._status.update({
                    "running": True,
                    "total_frames": total_frames,
                    "current_global_index": current_global_index,
                    "current_ingot": ingot_id,
                    "current_frame_name": frame_name,
                    "current_frame_url": frame_url,
                    "current_frame_index": frame_index,

                    "delay_sec": float(delay_sec),
                    "target_camera_fps": round(1.0 / float(delay_sec), 2),
                    "camera_fps": round(self._camera_fps, 2),
                    "camera_frames_sent": self._frames_sent,

                    "message": f"Камера показывает {frame_name}",
                })

                consumer = self._frame_consumer

            timestamp = datetime.utcnow().isoformat(timespec="seconds")

            public_payload = {
                "type": "camera_frame",
                "source": "camera",
                "timestamp": timestamp,
                "ingot_id": ingot_id,
                "frame_name": frame_name,
                "frame_url": frame_url,
                "frame_index": frame_index,
                "global_index": current_global_index,
                "total_frames": total_frames,

                "delay_sec": float(delay_sec),
                "target_camera_fps": round(1.0 / float(delay_sec), 2),
                "camera_fps": round(self._camera_fps, 2),
                "camera_frames_sent": self._frames_sent,
            }

            internal_payload = {
                **public_payload,
                "frame_path": frame_path,
            }

            shift_ws_manager.broadcast_json(public_payload)

            if consumer:
                try:
                    consumer(internal_payload)
                except Exception:
                    pass

            time.sleep(delay_sec)


camera_runtime_service = CameraRuntimeService()