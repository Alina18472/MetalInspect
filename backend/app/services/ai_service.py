from pathlib import Path
from threading import Lock
from typing import Optional

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from app.core.database import SessionLocal
from app.models.ai_model import AiModel
from ultralytics import YOLO

# Fallback, чтобы старый код не сломался
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
        """
        Загружает активную модель из таблицы ai_models.

        Сейчас поддерживается:
        - classification + ResNet18

        YOLO/detection добавим отдельным этапом.
        """
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

            if model_row.model_type == "classification":
                if model_row.architecture != "ResNet18":
                    raise RuntimeError(
                        f"Для classification сейчас поддерживается только ResNet18. "
                        f"Получено: {model_row.architecture}"
                    )

                loaded_model, tf, classes, device = self._load_resnet18_checkpoint(weights_path)

                if "crack" not in classes or "ok" not in classes:
                    raise RuntimeError(f"Ожидались классы crack/ok, получено: {classes}")

            elif model_row.model_type == "detection":
                if not str(model_row.architecture).lower().startswith("yolo"):
                    raise RuntimeError(
                        f"Для detection сейчас поддерживается YOLO. "
                        f"Получено: {model_row.architecture}"
                    )

                loaded_model, tf, classes, device, yolo_device = self._load_yolo_checkpoint(weights_path)

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

            return self.get_active_model_runtime_info()

        finally:
            db.close()

    def ensure_model_loaded(self):
        with self._lock:
            already_loaded = self.model is not None

        if not already_loaded:
            self.reload_active_model()

    def get_threshold_for_mode(
        self,
        mode: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> float:
        """
        Приоритет:
        1. threshold, если явно передали;
        2. threshold из режима active model;
        3. threshold активной модели;
        4. fallback balanced = 0.465.
        """
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

            # Старый вариант: "balanced": 0.465
            if isinstance(mode_value, (int, float)):
                return float(mode_value)

            # Новый вариант: "balanced": {"threshold": 0.465}
            # или "detection": {"confidence_threshold": 0.25}
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
            }
    def _predict_yolo_pil(
        self,
        pil_img: Image.Image,
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

            iou_threshold = self.active_iou_threshold or 0.45
            classes = self.classes or []

        results = model.predict(
            source=pil_img,
            conf=float(actual_threshold),
            iou=float(iou_threshold),
            device=yolo_device,
            verbose=False,
        )

        result = results[0]

        detections = []
        max_conf = 0.0
        best_bbox = None

        names = model.names or {}

        if result.boxes is not None:
            for box in result.boxes:
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
                    "confidence": box_conf,
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
            "mode": mode or "detection",
            "classes": classes,

            # Для сохранения bbox в БД
            "detections": detections,
            "best_bbox": best_bbox,
            "bbox_count": len(detections),
        }
    @torch.no_grad()
    def predict_pil(
        self,
        pil_img: Image.Image,
        threshold: Optional[float] = None,
        mode: Optional[str] = None,
    ):
        self.ensure_model_loaded()

        actual_threshold = self.get_threshold_for_mode(mode=mode, threshold=threshold)

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
            
            
        if model_type == "detection":
            return self._predict_yolo_pil(
                pil_img=pil_img,
                actual_threshold=actual_threshold,
                mode=mode,
            )
        x = tf(pil_img).unsqueeze(0).to(device)

        logits = model(x)
        probs_tensor = torch.softmax(logits, dim=1).squeeze(0).cpu()
        probs = probs_tensor.tolist()

        crack_idx = classes.index("crack")
        ok_idx = classes.index("ok")

        p_crack = float(probs[crack_idx])
        p_ok = float(probs[ok_idx])

        verdict = "CRACK" if p_crack >= actual_threshold else "OK"
        confidence = p_crack if verdict == "CRACK" else p_ok

        return {
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
            "mode": mode or self.active_default_mode or "balanced",
            "classes": classes,

          
            # Для совместимости с YOLO
            "detections": [],
            "best_bbox": None,
            "bbox_count": 0,
        }


ai_service = AiService()