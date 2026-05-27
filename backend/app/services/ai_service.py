
# ai_service.py
from pathlib import Path
from threading import Lock
from typing import Optional
import json

import numpy as np
import onnxruntime as ort
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO

from app.core.database import SessionLocal
from app.models.ai_model import AiModel


torch.set_num_threads(4)
torch.set_num_interop_threads(1)
torch.set_grad_enabled(False)

if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True


MODE_PRESETS = {
    "strict": {
        "title": "Меньше ложных срабатываний / больше пропусков",
        "threshold": 0.65,
    },
    "balanced": {
        "title": "Сбалансированный режим",
        "threshold": 0.465,
    },
    "sensitive": {
        "title": "Больше ложных срабатываний / меньше пропусков",
        "threshold": 0.35,
    },
}


BACKEND_DIR = Path(__file__).resolve().parents[2]


class AiService:
    def __init__(self):
        self._lock = Lock()

        self.model = None
        self.tf = None
        self.classes = None
        self.device = None

        self.active_model_id = None
        self.active_model_key = None
        self.active_model_name = None
        self.active_model_type = None
        self.active_architecture = None

        self.active_threshold = None
        self.active_confidence_threshold = None
        self.active_iou_threshold = None
        self.active_default_mode = None
        self.active_modes = None
        self.active_metrics = None
        self.active_weights_path = None

        self.yolo_device = None
        self.active_runtime_backend = None

        self.onnx_input_name = None
        self.onnx_output_name = None
        self.onnx_providers = None
        self.onnx_img_size = None

    def _resolve_weights_path(self, weights_path: str) -> Path:
        path = Path(weights_path)

        if path.is_absolute():
            return path

        return BACKEND_DIR / path

    def _load_resnet18_checkpoint(self, weights_path: Path):
        device = "cuda" if torch.cuda.is_available() else "cpu"

        ckpt = torch.load(weights_path, map_location=device)

        classes = ckpt["classes"]
        img_size = ckpt["img_size"]

        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, len(classes))
        model.load_state_dict(ckpt["model_state"])
        model.to(device)
        model.eval()

        tf = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        return model, tf, classes, device

    def _load_resnet18_onnx(self, weights_path: Path):
        meta_path = weights_path.with_suffix(weights_path.suffix + ".meta.json")

        if not meta_path.exists():
            raise RuntimeError(
                f"Для ONNX-модели не найден meta-файл: {meta_path}. "
                f"Ожидался файл рядом с .onnx: {weights_path.name}.meta.json"
            )

        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        classes = meta["classes"]
        img_size = int(meta["img_size"])

        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )

        # Важно: не забиваем все ядра только ONNX Runtime,
        # потому что параллельно работают камера, preprocess, БД и FastAPI.
        session_options.intra_op_num_threads = 2
        session_options.inter_op_num_threads = 1

        session = ort.InferenceSession(
            str(weights_path),
            sess_options=session_options,
            providers=["CPUExecutionProvider"],
        )

        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        providers = session.get_providers()

        return session, img_size, classes, "cpu", input_name, output_name, providers

    def _load_yolo_checkpoint(self, weights_path: Path):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        yolo_device = 0 if torch.cuda.is_available() else "cpu"

        model = YOLO(str(weights_path))

        names = model.names or {}
        if isinstance(names, dict):
            classes = list(names.values())
        else:
            classes = list(names)

        return model, None, classes, device, yolo_device

    def reload_active_model(self):
        db = SessionLocal()

        try:
            model_row = (
                db.query(AiModel)
                .filter(AiModel.is_active == True)
                .first()
            )

            if not model_row:
                raise RuntimeError("В таблице ai_models нет активной модели")

            if model_row.status not in ("available", "experimental"):
                raise RuntimeError(
                    f"Активная модель имеет статус '{model_row.status}', "
                    f"а нужен 'available' или 'experimental'"
                )

            if not model_row.weights_path:
                raise RuntimeError("У активной модели не указан weights_path")

            weights_path = self._resolve_weights_path(model_row.weights_path)

            if not weights_path.exists():
                raise RuntimeError(f"Файл весов не найден: {weights_path}")

            loaded_model = None
            tf = None
            classes = None
            device = None
            yolo_device = None
            runtime_backend = None

            onnx_input_name = None
            onnx_output_name = None
            onnx_providers = None
            onnx_img_size = None

            if model_row.model_type == "classification":
                if model_row.architecture != "ResNet18":
                    raise RuntimeError(
                        f"Для classification сейчас поддерживается только ResNet18. "
                        f"Получено: {model_row.architecture}"
                    )

                if weights_path.suffix.lower() == ".onnx":
                    (
                        loaded_model,
                        onnx_img_size,
                        classes,
                        device,
                        onnx_input_name,
                        onnx_output_name,
                        onnx_providers,
                    ) = self._load_resnet18_onnx(weights_path)

                    tf = None
                    runtime_backend = "onnxruntime"

                else:
                    loaded_model, tf, classes, device = (
                        self._load_resnet18_checkpoint(weights_path)
                    )
                    runtime_backend = "pytorch"

                if "crack" not in classes or "ok" not in classes:
                    raise RuntimeError(
                        f"Ожидались классы crack/ok, получено: {classes}"
                    )

            elif model_row.model_type == "detection":
                if not str(model_row.architecture).lower().startswith("yolo"):
                    raise RuntimeError(
                        f"Для detection сейчас поддерживается YOLO. "
                        f"Получено: {model_row.architecture}"
                    )

                loaded_model, tf, classes, device, yolo_device = (
                    self._load_yolo_checkpoint(weights_path)
                )
                runtime_backend = "ultralytics"

            else:
                raise RuntimeError(
                    f"Неподдерживаемый тип модели: {model_row.model_type}. "
                    f"Ожидалось classification или detection"
                )

            with self._lock:
                self.model = loaded_model
                self.tf = tf
                self.classes = classes
                self.device = device
                self.yolo_device = yolo_device

                self.active_model_id = model_row.id
                self.active_model_key = model_row.model_key
                self.active_model_name = model_row.name
                self.active_model_type = model_row.model_type
                self.active_architecture = model_row.architecture

                self.active_threshold = model_row.threshold
                self.active_confidence_threshold = model_row.confidence_threshold
                self.active_iou_threshold = model_row.iou_threshold
                self.active_default_mode = model_row.default_mode
                self.active_modes = model_row.modes
                self.active_metrics = model_row.metrics
                self.active_weights_path = model_row.weights_path
                self.active_runtime_backend = runtime_backend

                self.onnx_input_name = onnx_input_name
                self.onnx_output_name = onnx_output_name
                self.onnx_providers = onnx_providers
                self.onnx_img_size = onnx_img_size

            return self.get_active_model_runtime_info()

        finally:
            db.close()

    def ensure_model_loaded(self):
        with self._lock:
            already_loaded = self.model is not None

        if not already_loaded:
            self.reload_active_model()

    @torch.no_grad()
    def predict_pil_batch(
        self,
        pil_images: list[Image.Image],
        threshold: Optional[float] = None,
        mode: Optional[str] = None,
    ):
        """
        Batch-инференс для classification и detection.

        - classification / ResNet18 PyTorch: один torch batch;
        - classification / ResNet18 ONNX: один ONNX Runtime batch;
        - detection / YOLO: один вызов Ultralytics model.predict(...) на список PIL-кадров.
        """
        self.ensure_model_loaded()

        if not pil_images:
            return []

        actual_threshold = self.get_threshold_for_mode(
            mode=mode,
            threshold=threshold,
        )

        with self._lock:
            model = self.model
            tf = self.tf
            classes = self.classes
            device = self.device

            model_id = self.active_model_id
            model_key = self.active_model_key
            model_name = self.active_model_name
            model_type = self.active_model_type
            architecture = self.active_architecture
            default_mode = self.active_default_mode
            runtime_backend = self.active_runtime_backend

        if model_type == "detection":
            return self._predict_yolo_pil_batch(
                pil_images=pil_images,
                actual_threshold=actual_threshold,
                mode=mode,
            )

        if runtime_backend == "onnxruntime":
            return self._predict_resnet18_onnx_batch(
                pil_images=pil_images,
                actual_threshold=actual_threshold,
                mode=mode,
            )

        if model_type != "classification":
            raise RuntimeError(
                f"predict_pil_batch поддерживает classification и detection. "
                f"Получено: {model_type}"
            )

        if model is None or tf is None or classes is None or device is None:
            raise RuntimeError("Classification-модель не загружена корректно")

        if "crack" not in classes or "ok" not in classes:
            raise RuntimeError(f"Ожидались классы crack/ok, получено: {classes}")

        tensors = [tf(pil_img.convert("RGB")) for pil_img in pil_images]

        batch = torch.stack(tensors, dim=0).to(
            device,
            non_blocking=torch.cuda.is_available(),
        )

        with torch.inference_mode():
            logits = model(batch)
            probs_batch = torch.softmax(logits, dim=1).detach().cpu()

        crack_idx = classes.index("crack")
        ok_idx = classes.index("ok")

        results = []

        for probs_tensor in probs_batch:
            probs = probs_tensor.tolist()

            p_crack = float(probs[crack_idx])
            p_ok = float(probs[ok_idx])

            verdict = "CRACK" if p_crack >= actual_threshold else "OK"
            confidence = p_crack if verdict == "CRACK" else p_ok

            results.append({
                "model_id": model_id,
                "model_key": model_key,
                "model_name": model_name,
                "model_type": model_type,
                "architecture": architecture,
                "verdict": verdict,
                "p_crack": p_crack,
                "p_ok": p_ok,
                "confidence": float(confidence),
                "threshold": float(actual_threshold),
                "mode": mode or default_mode or "balanced",
                "classes": classes,
                "detections": [],
                "best_bbox": None,
                "bbox_count": 0,
            })

        return results

    def _softmax_numpy(self, logits: np.ndarray, axis: int = 1) -> np.ndarray:
        logits = logits - np.max(logits, axis=axis, keepdims=True)
        exp = np.exp(logits)
        return exp / np.sum(exp, axis=axis, keepdims=True)

    def _preprocess_resnet18_onnx_image(
        self,
        pil_img: Image.Image,
        img_size: int,
    ) -> np.ndarray:
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        resampling = (
            Image.Resampling.BILINEAR
            if hasattr(Image, "Resampling")
            else Image.BILINEAR
        )

        resized = pil_img.resize((img_size, img_size), resampling)

        arr = np.asarray(resized, dtype=np.float32) / 255.0

        # HWC -> CHW
        arr = np.transpose(arr, (2, 0, 1))

        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

        arr = (arr - mean) / std

        return arr

    def _predict_resnet18_onnx_batch(
        self,
        pil_images: list[Image.Image],
        actual_threshold: float,
        mode: Optional[str] = None,
    ):
        with self._lock:
            session = self.model
            classes = self.classes
            input_name = self.onnx_input_name
            output_name = self.onnx_output_name
            img_size = self.onnx_img_size

            model_id = self.active_model_id
            model_key = self.active_model_key
            model_name = self.active_model_name
            model_type = self.active_model_type
            architecture = self.active_architecture
            default_mode = self.active_default_mode

        if session is None or not input_name or not output_name or not img_size:
            raise RuntimeError("ONNX Runtime модель не загружена корректно")

        if not classes or "crack" not in classes or "ok" not in classes:
            raise RuntimeError(f"Ожидались классы crack/ok, получено: {classes}")

        batch_np = np.stack(
            [
                self._preprocess_resnet18_onnx_image(pil_img, img_size)
                for pil_img in pil_images
            ],
            axis=0,
        ).astype(np.float32, copy=False)

        logits = session.run([output_name], {input_name: batch_np})[0]
        probs_batch = self._softmax_numpy(logits, axis=1)

        crack_idx = classes.index("crack")
        ok_idx = classes.index("ok")

        results = []

        for probs in probs_batch:
            p_crack = float(probs[crack_idx])
            p_ok = float(probs[ok_idx])

            verdict = "CRACK" if p_crack >= actual_threshold else "OK"
            confidence = p_crack if verdict == "CRACK" else p_ok

            results.append({
                "model_id": model_id,
                "model_key": model_key,
                "model_name": model_name,
                "model_type": model_type,
                "architecture": architecture,
                "verdict": verdict,
                "p_crack": p_crack,
                "p_ok": p_ok,
                "confidence": float(confidence),
                "threshold": float(actual_threshold),
                "mode": mode or default_mode or "balanced",
                "classes": classes,
                "detections": [],
                "best_bbox": None,
                "bbox_count": 0,
            })

        return results

    def get_threshold_for_mode(
        self,
        mode: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> float:
        if threshold is not None:
            return float(threshold)

        self.ensure_model_loaded()

        with self._lock:
            selected_mode = mode or self.active_default_mode or "balanced"
            modes = self.active_modes or {}
            active_threshold = self.active_threshold
            active_confidence_threshold = self.active_confidence_threshold
            active_model_type = self.active_model_type

        if selected_mode in modes:
            mode_value = modes[selected_mode]

            if isinstance(mode_value, (int, float)):
                return float(mode_value)

            if isinstance(mode_value, dict):
                if active_model_type == "detection":
                    value = (
                        mode_value.get("confidence_threshold")
                        or mode_value.get("threshold")
                        or active_confidence_threshold
                        or 0.25
                    )
                    return float(value)

                value = mode_value.get("threshold") or active_threshold
                if value is not None:
                    return float(value)

        if active_model_type == "detection":
            if active_confidence_threshold is not None:
                return float(active_confidence_threshold)

            if active_threshold is not None:
                return float(active_threshold)

            return 0.25

        if active_threshold is not None:
            return float(active_threshold)

        return float(MODE_PRESETS["balanced"]["threshold"])

    def get_iou_for_mode(
        self,
        mode: Optional[str] = None,
    ) -> float:
        self.ensure_model_loaded()

        with self._lock:
            selected_mode = mode or self.active_default_mode or "balanced"
            modes = self.active_modes or {}
            active_iou_threshold = self.active_iou_threshold

        if selected_mode in modes:
            mode_value = modes[selected_mode]

            if isinstance(mode_value, dict):
                value = mode_value.get("iou_threshold")
                if value is not None:
                    return float(value)

        if active_iou_threshold is not None:
            return float(active_iou_threshold)

        return 0.45

    def get_active_model_runtime_info(self):
        self.ensure_model_loaded()

        with self._lock:
            return {
                "id": self.active_model_id,
                "model_key": self.active_model_key,
                "name": self.active_model_name,
                "model_type": self.active_model_type,
                "architecture": self.active_architecture,
                "weights_path": self.active_weights_path,
                "classes": self.classes,
                "device": self.device,
                "default_mode": self.active_default_mode,
                "threshold": self.active_threshold,
                "confidence_threshold": self.active_confidence_threshold,
                "iou_threshold": self.active_iou_threshold,
                "modes": self.active_modes,
                "metrics": self.active_metrics,
                "loaded": self.model is not None,
                "runtime_backend": self.active_runtime_backend,
                "onnx_input_name": self.onnx_input_name,
                "onnx_output_name": self.onnx_output_name,
                "onnx_providers": self.onnx_providers,
                "onnx_img_size": self.onnx_img_size,
            }

    def _format_yolo_result(
        self,
        yolo_result,
        model,
        actual_threshold: float,
        mode: Optional[str],
        model_id,
        model_key,
        model_name,
        model_type,
        architecture,
        default_mode,
        classes,
    ) -> dict:
        detections = []
        max_conf = 0.0
        best_bbox = None

        names = model.names or {}

        if yolo_result.boxes is not None:
            for box in yolo_result.boxes:
                xyxy = box.xyxy[0].detach().cpu().tolist()
                cls_id = int(box.cls[0].detach().cpu().item())
                box_conf = float(box.conf[0].detach().cpu().item())

                if isinstance(names, dict):
                    class_name = names.get(cls_id, str(cls_id))
                else:
                    class_name = str(cls_id)

                detection = {
                    "x1": float(xyxy[0]),
                    "y1": float(xyxy[1]),
                    "x2": float(xyxy[2]),
                    "y2": float(xyxy[3]),
                    "confidence": float(box_conf),
                    "class_id": cls_id,
                    "class_name": class_name,
                }

                detections.append(detection)

                if box_conf > max_conf:
                    max_conf = box_conf
                    best_bbox = detection

        verdict = "CRACK" if max_conf >= float(actual_threshold) else "OK"
        p_ok = 1.0 - max_conf if max_conf <= 1.0 else 0.0

        return {
            "model_id": model_id,
            "model_key": model_key,
            "model_name": model_name,
            "model_type": model_type,
            "architecture": architecture,
            "verdict": verdict,
            "p_crack": float(max_conf),
            "p_ok": float(p_ok),
            "confidence": float(max_conf),
            "threshold": float(actual_threshold),
            "mode": mode or default_mode or "detection",
            "classes": classes,
            "detections": detections,
            "best_bbox": best_bbox,
            "bbox_count": len(detections),
        }

    def _predict_yolo_pil_batch(
        self,
        pil_images: list[Image.Image],
        actual_threshold: float,
        mode: Optional[str] = None,
    ):
        with self._lock:
            model = self.model
            yolo_device = self.yolo_device or "cpu"

            model_id = self.active_model_id
            model_key = self.active_model_key
            model_name = self.active_model_name
            model_type = self.active_model_type
            architecture = self.active_architecture
            default_mode = self.active_default_mode

            classes = self.classes or []

        if model is None:
            raise RuntimeError("YOLO-модель не загружена корректно")

        actual_iou_threshold = self.get_iou_for_mode(mode=mode)

        rgb_images = [pil_img.convert("RGB") for pil_img in pil_images]

        predict_options = self.get_detection_predict_options_for_mode(mode=mode)

        yolo_results = model.predict(
            source=rgb_images,
            conf=float(actual_threshold),
            iou=float(actual_iou_threshold),
            imgsz=int(predict_options["imgsz"]),
            max_det=int(predict_options["max_det"]),
            device=yolo_device,
            verbose=False,
        )

        yolo_results = list(yolo_results)

        if len(yolo_results) != len(pil_images):
            raise RuntimeError(
                f"YOLO batch вернул {len(yolo_results)} результатов "
                f"для {len(pil_images)} кадров"
            )

        return [
            self._format_yolo_result(
                yolo_result=yolo_result,
                model=model,
                actual_threshold=actual_threshold,
                mode=mode,
                model_id=model_id,
                model_key=model_key,
                model_name=model_name,
                model_type=model_type,
                architecture=architecture,
                default_mode=default_mode,
                classes=classes,
            )
            for yolo_result in yolo_results
        ]

    def get_detection_predict_options_for_mode(
        self,
        mode: Optional[str] = None,
    ) -> dict:
        self.ensure_model_loaded()

        with self._lock:
            selected_mode = mode or self.active_default_mode or "balanced"
            modes = self.active_modes or {}

            active_model_key = self.active_model_key or ""
            active_model_name = self.active_model_name or ""
            active_weights_path = self.active_weights_path or ""

        mode_value = modes.get(selected_mode)

        imgsz = None
        max_det = None

        if isinstance(mode_value, dict):
            imgsz = (
                mode_value.get("imgsz")
                or mode_value.get("image_size")
                or mode_value.get("input_size")
            )

            max_det = (
                mode_value.get("max_det")
                or mode_value.get("max_detections")
            )

        if imgsz is None:
            text = (
                f"{active_model_key} {active_model_name} "
                f"{active_weights_path}"
            ).lower()

            if "320" in text:
                imgsz = 320
            elif "416" in text:
                imgsz = 416
            elif "640" in text:
                imgsz = 640
            else:
                imgsz = 416

        if max_det is None:
            max_det = 5

        imgsz = int(imgsz)
        max_det = int(max_det)

        if imgsz <= 0:
            imgsz = 416

        if max_det <= 0:
            max_det = 5

        return {
            "imgsz": imgsz,
            "max_det": max_det,
        }

    def _predict_yolo_pil(
        self,
        pil_img: Image.Image,
        actual_threshold: float,
        mode: Optional[str] = None,
    ):
        return self._predict_yolo_pil_batch(
            pil_images=[pil_img],
            actual_threshold=actual_threshold,
            mode=mode,
        )[0]

    def predict_bytes(
        self,
        image_bytes: bytes,
        threshold: Optional[float] = None,
        mode: Optional[str] = None,
    ):
        import io

        with Image.open(io.BytesIO(image_bytes)) as img:
            pil_img = img.convert("RGB").copy()

        return self.predict_pil(
            pil_img=pil_img,
            threshold=threshold,
            mode=mode,
        )

    @torch.no_grad()
    def predict_pil(
        self,
        pil_img: Image.Image,
        threshold: Optional[float] = None,
        mode: Optional[str] = None,
    ):
        return self.predict_pil_batch(
            pil_images=[pil_img],
            threshold=threshold,
            mode=mode,
        )[0]


ai_service = AiService()